import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

// Helper pour ID stable
const generateId = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const useAuthInfo = () => {
  const [authInfo, setAuthInfo] = useState({
    currentUserId: null,
    userRole: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          setAuthInfo({
            currentUserId: user.uid,
            userRole: snap.exists() ? snap.data().role : null,
          });
        } catch (error) {
          setAuthInfo({ currentUserId: user.uid, userRole: null });
        }
      } else {
        setAuthInfo({ currentUserId: null, userRole: null });
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);
  return { ...authInfo, isLoading };
};

const defaultCoursePlan = () => ({
  templateName: "",
  metaFields: [
    {
      id: generateId(),
      key: "title",
      label: "Titre du cours",
      type: "text",
      required: true,
      placeholder: "Ex: Programmation Web 2",
    },
    {
      id: generateId(),
      key: "description",
      label: "Description",
      type: "textarea",
      required: false,
      placeholder: "",
    },
  ],
  weeks: [],
  exams: [],
  questions: [],
  aiRules: [],
});

export default function ManageForms() {
  const [coursePlan, setCoursePlan] = useState(defaultCoursePlan());
  const [activeFormId, setActiveFormId] = useState(null);
  const [templatesList, setTemplatesList] = useState([]);
  const { currentUserId, userRole, isLoading } = useAuthInfo();

  const loadForms = async () => {
    if (isLoading || !currentUserId || !userRole) return;

    // Simplification pour éviter erreurs d'index : tri client
    const formsQuery = query(collection(db, "formTemplates"));

    try {
      const allSnap = await getDocs(formsQuery);
      let loadedTemplates = allSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Filtrer si nécessaire (si on veut seulement ceux créés par le user)
      // loadedTemplates = loadedTemplates.filter(...)

      // Tri Date
      loadedTemplates.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return tb - ta;
      });

      setTemplatesList(loadedTemplates);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadForms();
  }, [currentUserId, userRole, isLoading]);

  // --- Questions (FIXED IDs) ---
  const addQuestion = () =>
    setCoursePlan((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: generateId(), // ID Stable UUID
          label: "",
          field: "",
          rule: "",
        },
      ],
    }));

  const updateQuestion = (index, key, value) => {
    setCoursePlan((prev) => {
      const qs = [...prev.questions];
      qs[index] = { ...qs[index], [key]: value };
      return { ...prev, questions: qs };
    });
  };

  const removeQuestion = (index) => {
    setCoursePlan((prev) => {
      const qs = [...prev.questions];
      qs.splice(index, 1);
      return { ...prev, questions: qs };
    });
  };

  // --- Meta Fields ---
  const addMetaField = () =>
    setCoursePlan((prev) => {
      return {
        ...prev,
        metaFields: [
          ...prev.metaFields,
          {
            id: generateId(),
            key: `field_${generateId().slice(0, 4)}`,
            label: "",
            type: "text",
            required: false,
            placeholder: "",
          },
        ],
      };
    });

  const updateMetaField = (index, keyName, value) =>
    setCoursePlan((prev) => {
      const arr = [...(prev.metaFields || [])];
      arr[index] = { ...arr[index], [keyName]: value };
      return { ...prev, metaFields: arr };
    });

  const removeMetaField = (index) =>
    setCoursePlan((prev) => {
      const arr = [...(prev.metaFields || [])];
      arr.splice(index, 1);
      return { ...prev, metaFields: arr };
    });

  // --- CRUD Operations ---
  const deleteTemplate = async (id) => {
    if (!window.confirm("Supprimer ce modèle ?")) return;
    await deleteDoc(doc(db, "formTemplates", id));
    setTemplatesList((prev) => prev.filter((t) => t.id !== id));
    if (activeFormId === id) {
      setActiveFormId(null);
      setCoursePlan(defaultCoursePlan());
    }
  };

  const editTemplate = (t) => {
    setActiveFormId(t.id);
    setCoursePlan({
      templateName: t.templateName || t.meta?.title || "",
      metaFields: t.metaFields || [],
      weeks: t.weeks || [],
      exams: t.exams || [],
      questions: t.questions || [],
      aiRules: t.aiRules || [],
    });
  };

  const saveForm = async () => {
    if (!coursePlan.templateName?.trim()) return alert("Nom du modèle requis.");

    const payload = {
      templateName: coursePlan.templateName.trim(),
      metaFields: coursePlan.metaFields,
      weeks: coursePlan.weeks,
      exams: coursePlan.exams,
      questions: coursePlan.questions,
      aiRules: coursePlan.aiRules,
      updatedAt: serverTimestamp(),
    };

    try {
      if (activeFormId) {
        await updateDoc(doc(db, "formTemplates", activeFormId), payload);
      } else {
        await addDoc(collection(db, "formTemplates"), {
          ...payload,
          active: true,
          createdAt: serverTimestamp(),
          creatorId: currentUserId,
          type: "course-plan",
        });
      }
      await loadForms();
      alert("Sauvegardé !");
    } catch (e) {
      console.error(e);
      alert("Erreur sauvegarde");
    }
  };

  // Toggle Active
  const toggleActive = async (id, currentActive) => {
    try {
      await updateDoc(doc(db, "formTemplates", id), {
        active: !currentActive,
      });
      setTemplatesList((prev) =>
        prev.map((t) => (t.id === id ? { ...t, active: !currentActive } : t))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="p-8 text-white">Chargement...</div>;
  if (!userRole) return <div className="p-8 text-red-400">Accès refusé.</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* HEADER */}
      <div className="card-modern">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-2xl font-bold text-white">
            {activeFormId ? "Modifier le modèle" : "Créer un nouveau modèle"}
          </h2>
          <button
            onClick={() => {
              setActiveFormId(null);
              setCoursePlan(defaultCoursePlan());
            }}
            className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Nouveau
          </button>
        </div>

        {/* Form Meta */}
        <div className="space-y-4 mb-8">
          <label className="text-sm text-slate-400 block">Nom du modèle</label>
          <input
            className="input-modern"
            placeholder="Ex: Plan Standard 2025"
            value={coursePlan.templateName}
            onChange={(e) =>
              setCoursePlan((p) => ({ ...p, templateName: e.target.value }))
            }
          />
        </div>

        {/* SECTION 1: Meta Fields */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-blue-400">
              1. Informations générales
            </h3>
            <button onClick={addMetaField} className="button-outline text-sm">
              + Ajouter champ
            </button>
          </div>
          <div className="space-y-4">
            {coursePlan.metaFields.map((f, i) => (
              <div
                key={f.id}
                className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex flex-col gap-3 relative"
              >
                <button
                  onClick={() => removeMetaField(i)}
                  className="absolute top-2 right-2 text-red-400 text-xs"
                >
                  Supprimer
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="input-modern text-sm"
                    placeholder="Label (ex: Titre)"
                    value={f.label}
                    onChange={(e) =>
                      updateMetaField(i, "label", e.target.value)
                    }
                  />
                  <input
                    className="input-modern text-sm"
                    placeholder="Clé (ex: title)"
                    value={f.key}
                    onChange={(e) => updateMetaField(i, "key", e.target.value)}
                  />
                </div>
                <div className="flex gap-4 items-center">
                  <select
                    className="input-modern text-sm w-40"
                    value={f.type}
                    onChange={(e) => updateMetaField(i, "type", e.target.value)}
                  >
                    <option value="text">Texte</option>
                    <option value="textarea">Zone de texte</option>
                  </select>
                  <label className="text-sm text-slate-300 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) =>
                        updateMetaField(i, "required", e.target.checked)
                      }
                    />
                    Requis
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Questions */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-purple-400">
              2. Questions du plan
            </h3>
            <button onClick={addQuestion} className="button-outline text-sm">
              + Ajouter question
            </button>
          </div>
          <div className="space-y-4">
            {coursePlan.questions.map((q, i) => (
              <div
                key={q.id}
                className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 relative"
              >
                <button
                  onClick={() => removeQuestion(i)}
                  className="absolute top-2 right-2 text-red-400 text-xs"
                >
                  Supprimer
                </button>
                <div className="mb-2 text-xs text-slate-500">ID: {q.id}</div>
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  <input
                    className="input-modern text-sm"
                    placeholder="Intitulé"
                    value={q.label}
                    onChange={(e) => updateQuestion(i, "label", e.target.value)}
                  />
                  <input
                    className="input-modern text-sm"
                    placeholder="Champ lié (optionnel)"
                    value={q.field}
                    onChange={(e) => updateQuestion(i, "field", e.target.value)}
                  />
                </div>
                <textarea
                  className="input-modern text-sm h-20"
                  placeholder="Règle de validation IA..."
                  value={q.rule}
                  onChange={(e) => updateQuestion(i, "rule", e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <button onClick={saveForm} className="btn-primary w-full py-3 mt-4">
          {activeFormId ? "Mettre à jour" : "Sauvegarder"}
        </button>
      </div>

      {/* LISTE */}
      <div className="card-modern">
        <h3 className="text-xl font-bold text-white mb-4">Modèles existants</h3>
        <div className="space-y-3">
          {templatesList.map((t) => (
            <div
              key={t.id}
              className="flex justify-between bg-slate-900 p-4 rounded border border-slate-700"
            >
              <div>
                <div className="text-white font-bold">
                  {t.templateName || "Sans nom"}
                </div>
                <div className="text-xs text-slate-500">
                  {t.questions?.length || 0} questions
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editTemplate(t)}
                  className="text-blue-400 text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => toggleActive(t.id, t.active)}
                  className={`text-sm px-2 rounded ${
                    t.active
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {t.active ? "Actif" : "Inactif"}
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="text-red-400 text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
