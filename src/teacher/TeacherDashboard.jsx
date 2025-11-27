import SidebarTeacher from "./SidebarTeacher";
import TeacherSettings from "./TeacherSettings";
import Navbar from "../components/Navbar";
import React, { useEffect, useState } from "react";
import "./TeacherDashboard.css";
import { auth, db, storage } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  orderBy, // Ajouté
  limit, // Ajouté
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { jsPDF } from "jspdf";

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("new");

  const [plans, setPlans] = useState([]);

  // --- NOUVEAU : État pour le formulaire dynamique ---
  const [formTemplate, setFormTemplate] = useState(null);
  const [answers, setAnswers] = useState({}); // Format: { "id_question": "réponse" }

  const [analysis, setAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentUser = auth.currentUser;

  /* ===== 1. Charger les plans existants ===== */
  useEffect(() => {
    const loadPlans = async () => {
      if (!currentUser) return;

      const q = query(
        collection(db, "coursePlans"),
        where("teacherId", "==", currentUser.uid)
      );

      const snap = await getDocs(q);
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    loadPlans();
  }, [currentUser, activeTab]); // Recharge quand on change d'onglet

  /* ===== 2. Charger le modèle de formulaire ACTIF (Coordonnateur) ===== */
  useEffect(() => {
    const loadFormTemplate = async () => {
      // On cherche le dernier formulaire créé
      const q = query(
        collection(db, "formTemplates"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const data = snap.docs[0].data();
        setFormTemplate({ id: snap.docs[0].id, ...data });

        // Initialiser les réponses vides pour éviter les erreurs "uncontrolled input"
        const initAnswers = {};
        if (data.questions) {
          data.questions.forEach((q) => {
            initAnswers[q.id] = "";
          });
        }
        setAnswers(initAnswers);
      }
    };

    if (activeTab === "new") {
      loadFormTemplate();
    }
  }, [activeTab]);

  /* ===== Gestion des champs dynamiques ===== */
  const handleInputChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  /* ===== Analyse IA (Basée sur les règles du coordonnateur) ===== */
  const analyzePlan = () => {
    if (!formTemplate || !formTemplate.questions) return;

    const feedback = [];
    let isConform = true;

    // On vérifie chaque question selon sa règle (Simulation locale pour l'instant)
    formTemplate.questions.forEach((q) => {
      const answerText = answers[q.id] || "";
      const rule = q.rule || ""; // La règle définie par le coordonnateur

      // Vérification basique : longueur minimale
      if (answerText.length < 10) {
        isConform = false;
        feedback.push(`Question "${q.label}" : Réponse trop courte.`);
      }

      // Ici, on connectera plus tard l'API OpenAI pour vérifier "rule" vs "answerText"
    });

    if (isConform) {
      setAnalysis({
        status: "Conforme",
        suggestions: ["Le plan respecte les critères de base."],
      });
    } else {
      setAnalysis({
        status: "Non conforme",
        suggestions: feedback,
      });
    }
  };

  /* ===== Soumission du Plan ===== */
  const handleSubmitPlan = async () => {
    if (!analysis) return alert("Analyse IA requise");
    setSubmitting(true);

    // Génération PDF Dynamique
    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Plan de cours", 10, 10);
    docPDF.setFontSize(12);

    let y = 20;
    // Boucle sur les questions du modèle pour générer le PDF
    if (formTemplate && formTemplate.questions) {
      formTemplate.questions.forEach((q) => {
        // Titre de la question
        docPDF.setFont("helvetica", "bold");
        docPDF.text(`Q: ${q.label}`, 10, y);
        y += 7;

        // Réponse
        docPDF.setFont("helvetica", "normal");
        const reponse = answers[q.id] || "";
        const splitText = docPDF.splitTextToSize(reponse, 180);
        docPDF.text(splitText, 10, y);
        y += splitText.length * 7 + 10;

        // Saut de page si nécessaire
        if (y > 270) {
          docPDF.addPage();
          y = 10;
        }
      });
    }

    const blob = docPDF.output("blob");
    const filePath = `plans/${currentUser.uid}/plan_${Date.now()}.pdf`;

    await uploadBytes(ref(storage, filePath), blob);
    const pdfUrl = await getDownloadURL(ref(storage, filePath));

    // Sauvegarde dans Firestore
    await addDoc(collection(db, "coursePlans"), {
      teacherId: currentUser.uid,
      createdAt: serverTimestamp(),
      formId: formTemplate?.id, // On lie au modèle utilisé
      questionsSnapshot: formTemplate?.questions, // On garde une copie des questions au cas où le modèle change
      answers: answers, // On sauvegarde les réponses dynamiques
      status: analysis.status,
      pdfUrl,
    });

    alert("Plan enregistré !");

    // Reset
    setAnswers({});
    setAnalysis(null);
    setSubmitting(false);

    // Recharger la liste
    const q = query(
      collection(db, "coursePlans"),
      where("teacherId", "==", currentUser.uid)
    );
    const snap = await getDocs(q);
    setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

    // Rediriger vers l'onglet "Mes plans"
    setActiveTab("plans");
  };

  /* ===== Delete Plan ===== */
  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce plan ?")) return;

    try {
      await deleteDoc(doc(db, "coursePlans", planId));
      setPlans(plans.filter((p) => p.id !== planId));
    } catch (error) {
      console.error("Erreur suppression :", error);
      alert("Erreur lors de la suppression");
    }
  };

  /* ===== Edit Plan ===== */
  const handleEditPlan = (plan) => {
    setActiveTab("new");
    // On recharge les réponses existantes
    if (plan.answers) {
      setAnswers(plan.answers);
    }
    // Note : Idéalement, il faudrait aussi s'assurer qu'on utilise le bon formTemplate (plan.formId)
  };

  return (
    <>
      <Navbar />

      <div className="dashboard-container">
        <SidebarTeacher activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="dashboard-content">
          {/* ================= PLANS ================= */}
          {activeTab === "plans" && (
            <div className="card">
              <h2>Mes plans de cours</h2>
              {plans.length === 0 ? (
                <p>Aucun plan</p>
              ) : (
                plans.map((p) => (
                  <div key={p.id} className="submit-item">
                    <p>
                      <strong>Date :</strong>{" "}
                      {p.createdAt?.toDate().toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Statut :</strong> {p.status}
                    </p>
                    <div className="action-buttons">
                      <a
                        href={p.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-link"
                        style={{ marginRight: "10px" }}
                      >
                        Voir PDF
                      </a>
                      <button
                        className="btn-primary"
                        style={{ padding: "5px 10px", fontSize: "14px" }}
                        onClick={() => handleEditPlan(p)}
                      >
                        Modifier
                      </button>
                      <button
                        className="delete-btn"
                        style={{
                          padding: "5px 10px",
                          fontSize: "14px",
                          marginLeft: "10px",
                        }}
                        onClick={() => handleDeletePlan(p.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ================= REMISES (Si utilisé) ================= */}
          {activeTab === "submits" && (
            <div className="card">
              <h2>Remises</h2>
              <p>Fonctionnalité à venir</p>
            </div>
          )}

          {/* ================= SETTINGS ================= */}
          {activeTab === "settings" && <TeacherSettings />}

          {/* ================= NEW PLAN (DYNAMIQUE) ================= */}
          {activeTab === "new" && (
            <div className="card">
              <h2>Remplir le plan de cours</h2>

              {!formTemplate ? (
                <div
                  style={{
                    padding: "20px",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    borderRadius: "8px",
                  }}
                >
                  ⚠️ Aucun formulaire actif n'a été trouvé. Demandez au
                  coordonnateur d'en créer un.
                </div>
              ) : (
                <form onSubmit={(e) => e.preventDefault()}>
                  {/* Boucle sur les questions dynamiques */}
                  {formTemplate.questions &&
                    formTemplate.questions.map((q, index) => (
                      <div
                        key={q.id}
                        className="form-group"
                        style={{ marginBottom: "25px" }}
                      >
                        <div
                          className="word-label"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            {index + 1}. {q.label}
                          </span>
                        </div>

                        {/* Affichage discret de la règle pour aider l'enseignant */}
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#666",
                            marginBottom: "8px",
                            fontStyle: "italic",
                          }}
                        >
                          ℹ️ Attendu par l'IA : {q.rule}
                        </div>

                        <textarea
                          className="desc-fixed"
                          placeholder="Votre réponse ici..."
                          value={answers[q.id] || ""}
                          onChange={(e) =>
                            handleInputChange(q.id, e.target.value)
                          }
                          style={{ minHeight: "100px" }}
                        />
                      </div>
                    ))}

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={analyzePlan}
                  >
                    Analyser mes réponses (IA)
                  </button>

                  {analysis && (
                    <div className="analysis-box" style={{ marginTop: "20px" }}>
                      <h3>Résultat de l'analyse : {analysis.status}</h3>
                      <ul>
                        {analysis.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="submit-container">
                    <button
                      className="submit-btn"
                      onClick={handleSubmitPlan}
                      disabled={submitting || !analysis}
                      style={{ opacity: submitting || !analysis ? 0.5 : 1 }}
                    >
                      {submitting ? "Envoi en cours..." : "Soumettre le plan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
