import React, { useEffect, useState } from "react";
import SidebarTeacher from "./SidebarTeacher";
import TeacherSettings from "./TeacherSettings";
import TeacherSubmits from "./TeacherSubmits";
import Navbar from "../components/Navbar";
import "./TeacherDashboard.css";

import { auth, db, storage } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { jsPDF } from "jspdf";

// --- PDF GENERATOR FUNCTION ---
const generatePDF = (planData, teacherName) => {
  const doc = new jsPDF();

  // Colors
  const BLUE = [37, 99, 235]; // #2563eb
  const GRAY_BG = [243, 244, 246]; // #f3f4f6
  const DARK_TEXT = [31, 41, 55];

  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header "PLAN DE COURS"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BLUE);
  doc.text("PLAN DE COURS", margin, y);

  y += 10;

  // 2. Info Block (Teacher, Date, etc)
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "bold");
  doc.text(`Enseignant:`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(teacherName, margin + 25, y);

  doc.setFont("helvetica", "bold");
  const dateStr = new Date().toLocaleDateString("fr-FR");
  doc.text(`Date de génération:`, pageWidth - margin - 40, y, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, pageWidth - margin, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Formulaire:`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(planData.title || "Standard", margin + 25, y);

  doc.setFont("helvetica", "bold");
  doc.text(`Statut IA:`, pageWidth - margin - 40, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("Analysé", pageWidth - margin, y, { align: "right" });

  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Helper to add sections
  const addSection = (title, content) => {
    // Check page break
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Title (Blue)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(title, margin, y);
    y += 5;

    // Content Box
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK_TEXT);

    // Calculate height of text
    const splitText = doc.splitTextToSize(
      content || "Aucune réponse.",
      contentWidth - 10
    ); // -10 for padding
    const boxHeight = splitText.length * 5 + 10; // 5 per line + padding

    // Check page break for box
    if (y + boxHeight > 280) {
      doc.addPage();
      y = 20;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLUE);
      doc.text(title + " (suite)", margin, y);
      y += 5;
    }

    // Draw Gray Background Box
    doc.setFillColor(...GRAY_BG);
    doc.rect(margin, y, contentWidth, boxHeight, "F"); // Filled rect

    // Draw Left Blue Border
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(1);
    doc.line(margin, y, margin, y + boxHeight);

    // Add Text
    doc.text(splitText, margin + 5, y + 7);

    y += boxHeight + 10; // Space after section
  };

  // 3. Render Questions
  // Meta fields first
  const meta = planData.metaValuesSnapshot || {};
  if (meta.description) addSection("Description du cours", meta.description);

  // Questions Loop
  (planData.questionsSnapshot || []).forEach((q, idx) => {
    const answer = planData.answers[q.id] || "";
    addSection(`Question ${idx + 1}: ${q.label}`, answer);
  });

  // Weeks
  (planData.weeksSnapshot || []).forEach((w) => {
    const text = `Apprentissage: ${w.learning}\nDevoirs: ${w.homework}`;
    addSection(`${w.label}`, text);
  });

  return doc.output("blob");
};

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [formTemplate, setFormTemplate] = useState(null);

  // States
  const [metaValues, setMetaValues] = useState({});
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Lists
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [planWeeks, setPlanWeeks] = useState([]);
  const [planExams, setPlanExams] = useState([]);

  const currentUser = auth.currentUser;

  // Load My Plans
  useEffect(() => {
    if (activeTab === "plans" && currentUser) {
      const load = async () => {
        try {
          const q = query(
            collection(db, "coursePlans"),
            where("teacherId", "==", currentUser.uid)
          );
          const snap = await getDocs(q);
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Client sort
          rows.sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          );
          setPlans(rows);
        } catch (e) {
          console.error(e);
        }
      };
      load();
    }
  }, [activeTab, currentUser]);

  // Load Templates (Active only)
  useEffect(() => {
    if (activeTab === "new") {
      const load = async () => {
        const q = query(
          collection(db, "formTemplates"),
          where("active", "==", true)
        );
        const snap = await getDocs(q);
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      };
      load();
    }
  }, [activeTab]);

  // Handle Template Selection
  useEffect(() => {
    if (activeTab !== "new") return;

    if (editingPlan) {
      // Editing Mode
      const loadEdit = async () => {
        if (editingPlan.formId) {
          const snap = await getDoc(
            doc(db, "formTemplates", editingPlan.formId)
          );
          if (snap.exists()) setFormTemplate({ id: snap.id, ...snap.data() });
        }
        setMetaValues(editingPlan.metaValuesSnapshot || {});
        setAnswers(editingPlan.answers || {});
        setPlanWeeks(editingPlan.weeksSnapshot || []);
        setPlanExams(editingPlan.examsSnapshot || []);
      };
      loadEdit();
    } else if (selectedTemplateId) {
      // New Plan Mode
      const tmpl = templates.find((t) => t.id === selectedTemplateId);
      if (tmpl) {
        setFormTemplate(tmpl);
        // Reset fields
        const initMeta = {};
        (tmpl.metaFields || []).forEach((f) => (initMeta[f.key] = ""));
        setMetaValues(initMeta);
        const initAns = {};
        (tmpl.questions || []).forEach((q) => (initAns[q.id] = ""));
        setAnswers(initAns);
        setPlanWeeks(tmpl.weeks || []);
        setPlanExams(tmpl.exams || []);
      }
    } else {
      setFormTemplate(null);
    }
  }, [selectedTemplateId, editingPlan, templates, activeTab]);

  // Actions
  const handleAnswerChange = (qId, val) =>
    setAnswers((prev) => ({ ...prev, [qId]: val }));

  const analyzePlan = () => {
    // Fake AI logic for demo
    setAnalysis({
      status: "Conforme",
      suggestions: [
        "Le plan respecte la structure demandée.",
        "Bonne description.",
      ],
    });
  };

  const handleSubmit = async () => {
    if (!analysis) return alert("Veuillez analyser le plan d'abord.");
    setSubmitting(true);

    try {
      const teacherName = currentUser.displayName || currentUser.email;
      const title = metaValues.title || "Plan de cours";

      // Prepare Data object
      const planData = {
        title,
        metaValuesSnapshot: metaValues,
        questionsSnapshot: formTemplate.questions, // Save question structure snapshot
        weeksSnapshot: planWeeks,
        examsSnapshot: planExams,
        answers: answers,
      };

      // Generate PDF
      const pdfBlob = generatePDF(planData, teacherName);
      const pdfRef = ref(storage, `plans/${currentUser.uid}/${Date.now()}.pdf`);
      await uploadBytes(pdfRef, pdfBlob);
      const pdfUrl = await getDownloadURL(pdfRef);

      const firestoreData = {
        ...planData,
        teacherId: currentUser.uid,
        formId: formTemplate.id,
        status: "Soumis",
        pdfUrl,
        updatedAt: serverTimestamp(),
        createdAt: editingPlan ? editingPlan.createdAt : serverTimestamp(),
      };

      if (editingPlan) {
        await setDoc(doc(db, "coursePlans", editingPlan.id), firestoreData, {
          merge: true,
        });
      } else {
        await addDoc(collection(db, "coursePlans"), firestoreData);
      }

      alert("Plan soumis avec succès !");
      setEditingPlan(null);
      setSelectedTemplateId("");
      setActiveTab("plans");
    } catch (e) {
      console.error("Erreur soumission:", e);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <SidebarTeacher activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="flex-1 overflow-y-auto p-8">
            {activeTab === "plans" && (
              <div className="card-modern">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Mes Plans
                </h2>
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="border border-dark-border bg-slate-900/50 p-4 rounded-xl mb-4 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-lg text-white">
                        {p.title}
                      </div>
                      <div className="text-sm text-slate-400">
                        Statut: {p.status}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPlan(p);
                          setActiveTab("new");
                        }}
                        className="text-blue-400 text-sm px-3 py-1 bg-blue-900/20 rounded"
                      >
                        Modifier
                      </button>
                      <a
                        href={p.pdfUrl}
                        target="_blank"
                        className="text-white text-sm px-3 py-1 bg-slate-700 rounded"
                      >
                        PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "new" && (
              <div className="max-w-4xl mx-auto card-modern">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingPlan ? "Modifier le plan" : "Nouveau plan de cours"}
                </h2>

                {!editingPlan && (
                  <div className="mb-6">
                    <label className="text-sm text-slate-400">Modèle:</label>
                    <select
                      className="input-modern mt-1"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                    >
                      <option value="">-- Choisir --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.templateName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formTemplate && (
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="space-y-8"
                  >
                    {/* Meta Fields */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-blue-400">
                        1. Informations générales
                      </h3>
                      {formTemplate.metaFields?.map((f) => (
                        <div key={f.id}>
                          <label className="text-sm text-slate-300 block mb-1">
                            {f.label}
                          </label>
                          {f.type === "textarea" ? (
                            <textarea
                              className="input-modern h-24"
                              value={metaValues[f.key] || ""}
                              onChange={(e) =>
                                setMetaValues({
                                  ...metaValues,
                                  [f.key]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              className="input-modern"
                              value={metaValues[f.key] || ""}
                              onChange={(e) =>
                                setMetaValues({
                                  ...metaValues,
                                  [f.key]: e.target.value,
                                })
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-purple-400">
                        2. Questions du plan
                      </h3>
                      {formTemplate.questions?.map((q, idx) => (
                        <div
                          key={q.id}
                          className="bg-slate-900/50 p-5 rounded-xl border border-slate-700"
                        >
                          <div className="flex justify-between mb-2">
                            <label className="font-semibold text-white">
                              Question #{idx + 1}
                            </label>
                            <span className="text-xs text-slate-500">
                              {q.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2 italic">
                            Règle: {q.rule}
                          </div>
                          <textarea
                            className="input-modern h-32 text-sm"
                            placeholder="Votre réponse..."
                            value={answers[q.id] || ""}
                            onChange={(e) =>
                              handleAnswerChange(q.id, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>

                    {/* Weeks & Exams Sections omitted for brevity, assuming standard inputs similar to previous files */}

                    <div className="flex gap-4 pt-4 border-t border-slate-700">
                      <button
                        onClick={analyzePlan}
                        className="btn-primary bg-purple-600 hover:bg-purple-500"
                      >
                        ✨ Analyser
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || !analysis}
                        className={`btn-primary flex-1 ${
                          (!analysis || submitting) &&
                          "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {submitting ? "Envoi..." : "Soumettre"}
                      </button>
                    </div>

                    {analysis && (
                      <div className="bg-green-900/20 border border-green-500 p-4 rounded-xl mt-4">
                        <h4 className="font-bold text-green-400">
                          Analyse IA: {analysis.status}
                        </h4>
                        <ul className="list-disc pl-5 text-sm text-slate-300 mt-2">
                          {analysis.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}

            {activeTab === "submits" && <TeacherSubmits />}
            {activeTab === "settings" && <TeacherSettings />}
          </main>
        </div>
      </div>
    </div>
  );
}
