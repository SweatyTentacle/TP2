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

<<<<<<< HEAD
const defaultCoursePlan = () => ({
  meta: { title: "", objective: "", description: "" },
  weeks: [{ id: 1, label: "Semaine 1", learning: "", homework: "" }],
  exams: [],
=======
// =======================================================================
// 1. HOOK D'AUTHENTIFICATION RÉEL (Lit l'UID et le rôle dans Firestore)
// =======================================================================
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
          let storedRole = null;
          if (snap.exists()) {
            storedRole = snap.data().role;
          }
          setAuthInfo({
            currentUserId: user.uid,
            userRole: storedRole || null,
          });
        } catch (error) {
          console.error("Erreur lors de la récupération du rôle:", error);
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
// =======================================================================
// FIN DU HOOK
// =======================================================================

// --- Modèle de données par défaut pour un plan de cours ---
const defaultCoursePlan = () => ({
  meta: {
    title: "",
    objective: "",
    description: "",
  },
  weeks: [{ id: 1, label: "Semaine 1", learning: "", homework: "" }],
  exams: [
    // Exemple: { id: 1, title: "Examen final", date: "", coverage: "" }
  ],
  // Questions + règles IA de validation (liées aux champs ci-dessus)
>>>>>>> b7898d4b991d3e5400c460425afa7301a7ce3010
  questions: [
    {
      id: "q-title",
      label: "Titre du cours",
      rule: "Le titre doit être clair.",
    },
    { id: "q-obj", label: "Objectif", rule: "Objectif précis." },
  ],
});

export default function ManageForms() {
  const [coursePlan, setCoursePlan] = useState(defaultCoursePlan());
  const [activeFormId, setActiveFormId] = useState(null);
  const [templatesList, setTemplatesList] = useState([]);
<<<<<<< HEAD
  const user = auth.currentUser;
=======

  // 2. Auth
  const { currentUserId, userRole, isLoading } = useAuthInfo();

  // Charger les modèles avec filtre par rôle
  const loadForms = async () => {
    if (isLoading || !currentUserId || !userRole) return;

    let formsQuery;
    if (userRole === "coordonator") {
      // Remove orderBy to avoid composite index requirement
      formsQuery = query(
        collection(db, "formTemplates"),
        where("creatorId", "==", currentUserId)
      );
    } else {
      // Keep simple orderBy for unfiltered listing
      formsQuery = query(
        collection(db, "formTemplates"),
        orderBy("createdAt", "desc")
      );
    }

    const allSnap = await getDocs(formsQuery);
    let loadedTemplates = allSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    loadedTemplates.sort((a, b) => {
      const ta = a.createdAt?.toDate
        ? a.createdAt.toDate().getTime()
        : new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt?.toDate
        ? b.createdAt.toDate().getTime()
        : new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    setTemplatesList(loadedTemplates);

    const activeForm = loadedTemplates.length > 0 ? loadedTemplates[0] : null;
    if (activeForm) {
      setActiveFormId(activeForm.id);
      setCoursePlan({
        meta: activeForm.meta || { title: "", objective: "", description: "" },
        weeks: activeForm.weeks || [
          { id: 1, label: "Semaine 1", learning: "", homework: "" },
        ],
        exams: activeForm.exams || [],
        questions: activeForm.questions || defaultCoursePlan().questions,
      });
    } else {
      setActiveFormId(null);
      setCoursePlan(defaultCoursePlan());
    }
  };
>>>>>>> b7898d4b991d3e5400c460425afa7301a7ce3010

  useEffect(() => {
    if (user)
      getDocs(
        query(collection(db, "formTemplates"), orderBy("createdAt", "desc"))
      ).then((s) =>
        setTemplatesList(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
  }, [user]);

<<<<<<< HEAD
  const updateMeta = (f, v) =>
    setCoursePlan((p) => ({ ...p, meta: { ...p.meta, [f]: v } }));

  const saveForm = async () => {
    const payload = { ...coursePlan, updatedAt: serverTimestamp() };
    if (activeFormId)
      await updateDoc(doc(db, "formTemplates", activeFormId), payload);
    else {
      const ref = await addDoc(collection(db, "formTemplates"), {
        ...payload,
        createdAt: serverTimestamp(),
        active: true,
        creatorId: user.uid,
        type: "course-plan",
      });
      setActiveFormId(ref.id);
    }
    alert("Sauvegardé !");
  };

=======
  // Helpers de mise à jour
  const updateMeta = (field, value) => {
    setCoursePlan((prev) => ({
      ...prev,
      meta: { ...prev.meta, [field]: value },
    }));
  };

  const addWeek = () => {
    setCoursePlan((prev) => ({
      ...prev,
      weeks: [
        ...prev.weeks,
        {
          id: (prev.weeks[prev.weeks.length - 1]?.id || 0) + 1,
          label: `Semaine ${prev.weeks.length + 1}`,
          learning: "",
          homework: "",
        },
      ],
    }));
  };

  const updateWeek = (index, field, value) => {
    setCoursePlan((prev) => {
      const weeks = [...prev.weeks];
      weeks[index] = { ...weeks[index], [field]: value };
      return { ...prev, weeks };
    });
  };

  const removeWeek = (index) => {
    setCoursePlan((prev) => {
      const weeks = [...prev.weeks];
      weeks.splice(index, 1);
      // Re-labeller après suppression
      const relabeled = weeks.map((w, i) => ({
        ...w,
        label: `Semaine ${i + 1}`,
        id: i + 1,
      }));
      return { ...prev, weeks: relabeled };
    });
  };

  const addExam = () => {
    setCoursePlan((prev) => ({
      ...prev,
      exams: [
        ...prev.exams,
        {
          id: (prev.exams[prev.exams.length - 1]?.id || 0) + 1,
          title: "",
          date: "",
          coverage: "",
        },
      ],
    }));
  };

  const updateExam = (index, field, value) => {
    setCoursePlan((prev) => {
      const exams = [...prev.exams];
      exams[index] = { ...exams[index], [field]: value };
      return { ...prev, exams };
    });
  };

  const removeExam = (index) => {
    setCoursePlan((prev) => {
      const exams = [...prev.exams];
      exams.splice(index, 1);
      const relabeled = exams.map((e, i) => ({ ...e, id: i + 1 }));
      return { ...prev, exams: relabeled };
    });
  };

  // Supprimer un template
  const deleteTemplate = async (templateId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?"))
      return;
    if (userRole !== "coordonator" && userRole !== "teacher")
      return alert("Action non autorisée.");
    try {
      await deleteDoc(doc(db, "formTemplates", templateId));
      setTemplatesList(templatesList.filter((t) => t.id !== templateId));
      if (activeFormId === templateId) {
        setCoursePlan(defaultCoursePlan());
        setActiveFormId(null);
      }
      alert("Modèle supprimé avec succès !");
    } catch (e) {
      console.error("Erreur de suppression:", e);
      alert("Erreur lors de la suppression du modèle.");
    }
  };

  const editTemplate = (template) => {
    setActiveFormId(template.id);
    setCoursePlan({
      meta: template.meta || { title: "", objective: "", description: "" },
      weeks: template.weeks || [
        { id: 1, label: "Semaine 1", learning: "", homework: "" },
      ],
      exams: template.exams || [],
      questions: template.questions || defaultCoursePlan().questions,
    });
    window.scrollTo(0, 0);
    alert(`Modèle '${template.id}' chargé pour modification.`);
  };

  // Sauvegarder
  const saveForm = async () => {
    // Validations basiques côté client
    if (!coursePlan.meta.title.trim())
      return alert("Le titre du cours est obligatoire.");
    if (!coursePlan.meta.objective.trim())
      return alert("L’objectif du cours est obligatoire.");
    if (!coursePlan.meta.description.trim())
      return alert("La description du cours est obligatoire.");
    if (!currentUserId)
      return alert("Erreur d'authentification. Veuillez vous reconnecter.");

    try {
      const payload = {
        meta: coursePlan.meta,
        weeks: coursePlan.weeks,
        exams: coursePlan.exams,
        questions: coursePlan.questions, // règles IA incluses
        updatedAt: serverTimestamp(), // <-- use Firestore timestamp
      };

      if (activeFormId) {
        const formRef = doc(db, "formTemplates", activeFormId);
        await updateDoc(formRef, payload);
        await loadForms();
        alert("Modèle de plan de cours mis à jour !");
      } else {
        const newDoc = await addDoc(collection(db, "formTemplates"), {
          ...payload,
          createdAt: serverTimestamp(), // <-- use Firestore timestamp
          active: true,
          creatorId: currentUserId,
          type: "course-plan",
        });
        setActiveFormId(newDoc.id);
        await loadForms();
        alert("Nouveau modèle de plan de cours sauvegardé et activé !");
      }
    } catch (e) {
      console.error("Error saving form:", e);
      alert(`Erreur lors de la sauvegarde: ${e?.message || e}`);
    }
  };

  // ==================================================
  // 3. GESTION DE L'ÉTAT ET DES ACCÈS AU RENDU
  // ==================================================
  if (isLoading) {
    return <div className="card">Chargement des permissions...</div>;
  }
  if (!currentUserId) {
    return (
      <div className="card">
        Veuillez vous connecter pour gérer les formulaires.
      </div>
    );
  }
  if (!userRole) {
    return (
      <div className="card">
        Accès refusé. Votre compte est connecté (UID:{" "}
        {currentUserId.substring(0, 5)}...), mais le rôle n'a pas pu être chargé
        depuis la base de données.
        <br />
        <br />
        <strong>Vérification requise :</strong> Assurez-vous que le document de
        cet utilisateur dans la collection <strong>"users"</strong> contient le
        champ <strong>"role"</strong>.
      </div>
    );
  }
  if (userRole !== "coordonator" && userRole !== "teacher") {
    return (
      <div className="card">
        Accès refusé. Votre rôle ({userRole}) n'a pas les droits de gestion
        (seuls 'coordonator' et 'teacher' sont autorisés).
      </div>
    );
  }

  // --- RENDU ---
>>>>>>> b7898d4b991d3e5400c460425afa7301a7ce3010
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="card-modern">
        <div className="flex justify-between mb-6 border-b border-dark-border pb-4">
          <h2 className="text-2xl font-bold text-white">Éditeur de Modèle</h2>
          <button
            onClick={() => {
              setActiveFormId(null);
              setCoursePlan(defaultCoursePlan());
            }}
            className="text-sm bg-dark-bg px-3 py-1 rounded text-white"
          >
            Nouveau
          </button>
        </div>
        <div className="space-y-4">
          <input
            className="input-modern"
            value={coursePlan.meta.title}
            onChange={(e) => updateMeta("title", e.target.value)}
            placeholder="Titre par défaut"
          />
          {coursePlan.questions.map((q, i) => (
            <div
              key={i}
              className="bg-dark-bg/50 p-4 rounded-lg border border-dark-border"
            >
              <span className="font-bold text-white block mb-2">{q.label}</span>
              <input
                className="input-modern text-sm"
                value={q.rule}
                onChange={(e) => {
                  const n = [...coursePlan.questions];
                  n[i].rule = e.target.value;
                  setCoursePlan({ ...coursePlan, questions: n });
                }}
                placeholder="Règle IA..."
              />
            </div>
          ))}
        </div>
        <button onClick={saveForm} className="btn-primary w-full mt-8">
          Sauvegarder
        </button>
      </div>

      <div className="card-modern">
        <h3 className="text-xl font-bold text-white mb-4">Modèles</h3>
        <div className="space-y-2">
          {templatesList.map((t) => (
            <div
              key={t.id}
              className="flex justify-between items-center bg-dark-bg p-3 rounded-lg"
            >
              <span className="text-slate-300 text-sm">{t.id}</span>
              <button
                onClick={() => {
                  setActiveFormId(t.id);
                  setCoursePlan(t);
                }}
                className="text-blue-400 text-sm"
              >
                Modifier
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
