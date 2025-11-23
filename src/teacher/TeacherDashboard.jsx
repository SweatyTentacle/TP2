import React, { useEffect, useState } from "react";
import "../Login.css";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { jsPDF } from "jspdf";

// Questions du plan de cours
const QUESTIONS = [
  { id: "title", label: "Titre du cours" },
  { id: "description", label: "Description du cours" },
  { id: "objectives", label: "Objectifs d’apprentissage" },
  { id: "evaluation", label: "Méthodes d’évaluation" },
  { id: "schedule", label: "Planification des séances" },
];

export default function TeacherDashboard() {
  const [plans, setPlans] = useState([]);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentUser = auth.currentUser;

  // Charger les plans existants
  useEffect(() => {
    const fetchPlans = async () => {
      if (!currentUser) return;

      const q = query(
        collection(db, "coursePlans"),
        where("teacherId", "==", currentUser.uid)
      );

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setPlans(data);
    };

    fetchPlans();
  }, [currentUser]);

  const handleChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // Analyse IA simulée
  const analyzePlan = () => {
    const text = Object.values(answers).join(" ").toLowerCase();

    if (!text || text.length < 40) {
      setAnalysis({
        status: "Non conforme",
        suggestions: [
          "Le plan est trop court.",
          "Ajoutez plus de détails dans chaque section.",
        ],
      });
      return;
    }

    if (text.includes("aucune") || text.includes("tbd")) {
      setAnalysis({
        status: "À améliorer",
        suggestions: [
          "Évitez les réponses vagues.",
          "Précisez davantage le contenu du plan.",
        ],
      });
      return;
    }

    setAnalysis({
      status: "Conforme",
      suggestions: [
        "Le plan respecte les attentes.",
        "Assurez-vous que les évaluations correspondent aux objectifs.",
      ],
    });
  };

  const handleAnalyzeClick = (e) => {
    e.preventDefault();
    analyzePlan();
  };

  // Soumission (PDF + Storage + Firestore)
  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Veuillez vous connecter.");

    if (!analysis) return alert("Veuillez lancer l'analyse IA.");

    try {
      setSubmitting(true);

      // Génération du PDF
      const docPDF = new jsPDF();
      let y = 10;

      docPDF.setFontSize(18);
      docPDF.text("Plan de cours", 10, y);
      y += 12;

      docPDF.setFontSize(12);
      QUESTIONS.forEach((q) => {
        docPDF.text(q.label + " :", 10, y);
        y += 6;

        const text = answers[q.id] || "";
        const lines = docPDF.splitTextToSize(text, 180);
        docPDF.text(lines, 10, y);
        y += lines.length * 7 + 4;
      });

      docPDF.text("Statut : " + analysis.status, 10, y);
      y += 8;

      docPDF.text("Suggestions :", 10, y);
      y += 6;

      analysis.suggestions.forEach((s) => {
        const lines = docPDF.splitTextToSize("- " + s, 180);
        docPDF.text(lines, 10, y);
        y += lines.length * 6 + 2;
      });

      const pdfBlob = docPDF.output("blob");

      // Upload PDF dans Storage
      const filePath = `plans/${currentUser.uid}/plan_${Date.now()}.pdf`;
      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, pdfBlob);

      const pdfUrl = await getDownloadURL(storageRef);

      // Enregistrer dans Firestore
      await addDoc(collection(db, "coursePlans"), {
        teacherId: currentUser.uid,
        createdAt: serverTimestamp(),
        answers,
        status: analysis.status,
        suggestions: analysis.suggestions,
        pdfUrl,
      });

      alert("Plan soumis avec succès !");
      setAnswers({});
      setAnalysis(null);
      setSubmitting(false);

    } catch (error) {
      console.error(error);
      alert("Erreur lors de la soumission du plan.");
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="right-panel" style={{ flex: 1 }}>
        <div className="login-box" style={{ width: "80%", maxWidth: "900px" }}>
          
          <h1 className="login-title">Espace Enseignant</h1>

          {/* Liste */}
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Mes plans de cours</h2>

          {plans.length === 0 ? (
            <p style={{ fontSize: 14 }}>Aucun plan pour le moment.</p>
          ) : (
            <ul style={{ fontSize: 14, marginBottom: 20 }}>
              {plans.map((p) => (
                <li key={p.id} style={{ marginBottom: 8 }}>
                  <strong>{p.answers?.title || "Sans titre"}</strong> –{" "}
                  <em>{p.status}</em>{" "}
                  {p.pdfUrl && (
                    <a
                      href={p.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: 8, color: "#2563eb" }}
                    >
                      Voir PDF
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}

          <hr style={{ margin: "20px 0" }} />

          {/* Formulaire */}
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>
            Nouveau plan de cours
          </h2>

          <form onSubmit={handleSubmitPlan}>
            {QUESTIONS.map((q) => (
              <div className="input-group" key={q.id}>
                <label>{q.label}</label>
                <textarea
                  style={{
                    resize: "vertical",
                    minHeight: 70,
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                  }}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  required
                />
              </div>
            ))}

            {/* Analyse */}
            <button
              type="button"
              className="login-button"
              style={{ marginBottom: 12 }}
              onClick={handleAnalyzeClick}
            >
              Lancer l'analyse IA
            </button>

            {/* Résultat */}
            {analysis && (
              <div
                style={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  padding: 12,
                  marginBottom: 14,
                  background:
                    analysis.status === "Conforme"
                      ? "#ecfdf3"
                      : analysis.status === "À améliorer"
                      ? "#fffbeb"
                      : "#fef2f2",
                }}
              >
                <p>
                  <strong>Résultat :</strong> {analysis.status}
                </p>

                <p style={{ marginTop: 8 }}>
                  <strong>Suggestions :</strong>
                </p>

                <ul style={{ paddingLeft: 16 }}>
                  {analysis.suggestions.map((s, index) => (
                    <li key={index}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Soumission */}
            <button
              type="submit"
              className="login-button"
              disabled={submitting}
            >
              {submitting ? "Envoi..." : "Soumettre le plan et générer le PDF"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
