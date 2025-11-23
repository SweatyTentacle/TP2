import SidebarTeacher from "./SidebarTeacher";
import TeacherSubmits from "./TeacherSubmits";
import TeacherSettings from "./TeacherSettings";
import Navbar from "../components/Navbar";
import React, { useEffect, useState } from "react";
import "./TeacherDashboard.css";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { jsPDF } from "jspdf";

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("new");

  const [plans, setPlans] = useState([]);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [objectivesList, setObjectivesList] = useState([""]);
  const [evaluationList, setEvaluationList] = useState([""]);
  const [scheduleRows, setScheduleRows] = useState([
    { week: 1, activity: "", deliver: "" }
  ]);

  const currentUser = auth.currentUser;

  /* ===== Load plans ===== */
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;

      const q = query(
        collection(db, "coursePlans"),
        where("teacherId", "==", currentUser.uid)
      );

      const snap = await getDocs(q);
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    load();
  }, [currentUser]);

  /* ===== Add items ===== */
  const addObjective = () => setObjectivesList([...objectivesList, ""]);
  const addEvaluation = () => setEvaluationList([...evaluationList, ""]);
  const addScheduleRow = () => {
    setScheduleRows([
      ...scheduleRows,
      {
        week: scheduleRows.length + 1,
        activity: "",
        deliver: ""
      }
    ]);
  };

  /* ===== Analyze Plan ===== */
  const analyzePlan = () => {
    const text =
      (answers.title || "") +
      (answers.description || "") +
      objectivesList.join(" ") +
      evaluationList.join(" ");

    if (text.length < 40) {
      return setAnalysis({
        status: "Non conforme",
        suggestions: ["Trop court", "Ajoute plus de contenu"]
      });
    }

    setAnalysis({
      status: "Conforme",
      suggestions: ["Structure correcte", "Détails suffisants"]
    });
  };

  /* ===== Submit Plan ===== */
  const handleSubmitPlan = async () => {
    if (!analysis) return alert("Analyse IA requise");
    setSubmitting(true);

    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Plan de cours", 10, 10);

    const blob = docPDF.output("blob");
    const filePath = `plans/${currentUser.uid}/plan_${Date.now()}.pdf`;

    await uploadBytes(ref(storage, filePath), blob);
    const pdfUrl = await getDownloadURL(ref(storage, filePath));

    await addDoc(collection(db, "coursePlans"), {
      teacherId: currentUser.uid,
      createdAt: serverTimestamp(),
      answers,
      objectives: objectivesList,
      evaluation: evaluationList,
      schedule: scheduleRows,
      status: analysis.status,
      pdfUrl
    });

    alert("Plan enregistré !");
    setSubmitting(false);
  };

  return (
    <>
      <Navbar />

      <div className="dashboard-container">

        {/* ===== NEW SIDEBAR ===== */}
        <SidebarTeacher activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* ===== CONTENT ===== */}
        <div className="dashboard-content">

          {/* ================= PLANS ================= */}
          {activeTab === "plans" && (
            <div className="card">
              <h2>Mes plans de cours</h2>

              {plans.length === 0 ? (
                <p>Aucun plan</p>
              ) : (
                plans.map((p) => (
                  <p key={p.id}>
                    <strong>{p.answers.title}</strong> — {p.status}
                  </p>
                ))
              )}
            </div>
          )}

          {/* ================= SUBMITS ================= */}
          {activeTab === "submits" && <TeacherSubmits />}

          {/* ================= SETTINGS ================= */}
          {activeTab === "settings" && <TeacherSettings />}

          {/* ================= NEW PLAN ================= */}
          {activeTab === "new" && (
            <>
              <div className="card">
                <h2>Créer un nouveau plan</h2>

                <form onSubmit={(e) => e.preventDefault()}>

                  {/* TITLE */}
                  <div className="word-label">Titre :</div>
                  <input
                    className="word-input"
                    value={answers.title || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, title: e.target.value })
                    }
                  />

                  {/* DESCRIPTION */}
                  <div className="word-label">Description du cours</div>
                  <textarea
                    className="desc-fixed"
                    placeholder="..."
                    value={answers.description || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, description: e.target.value })
                    }
                  />

                  {/* OBJECTIFS */}
                  <div className="word-label">Objectifs</div>
                  <ul className="word-list">
                    {objectivesList.map((obj, i) => (
                      <li key={i}>
                        <input
                          className="word-input"
                          value={obj}
                          placeholder={`Objectif #${i + 1}`}
                          onChange={(e) => {
                            const copy = [...objectivesList];
                            copy[i] = e.target.value;
                            setObjectivesList(copy);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="word-add" onClick={addObjective}>
                    Ajouter un objectif
                  </div>

                  {/* METHODS */}
                  <div className="word-label">Méthodes d'évaluation</div>
                  <ul className="word-list">
                    {evaluationList.map((m, i) => (
                      <li key={i}>
                        <input
                          className="word-input"
                          value={m}
                          placeholder={`Méthode #${i + 1}`}
                          onChange={(e) => {
                            const copy = [...evaluationList];
                            copy[i] = e.target.value;
                            setEvaluationList(copy);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="word-add" onClick={addEvaluation}>
                    Ajouter une méthode
                  </div>

                  {/* PLANIFICATION */}
                  <div className="word-label">Planification des séances</div>

                  <table className="word-table">
                    <thead>
                      <tr>
                        <th>Semaine</th>
                        <th>Activité</th>
                        <th>Remise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.map((row, i) => (
                        <tr key={i}>
                          <td>{row.week}</td>
                          <td>
                            <input
                              className="word-input"
                              placeholder=""
                              value={row.activity}
                              onChange={(e) => {
                                const copy = [...scheduleRows];
                                copy[i].activity = e.target.value;
                                setScheduleRows(copy);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="word-input"
                              placeholder=""
                              value={row.deliver}
                              onChange={(e) => {
                                const copy = [...scheduleRows];
                                copy[i].deliver = e.target.value;
                                setScheduleRows(copy);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="word-add-row" onClick={addScheduleRow}>
                    Ajouter une semaine
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={analyzePlan}
                  >
                    Analyse IA
                  </button>

                  {analysis && (
                    <div className="analysis-box">
                      <strong>Résultat :</strong> {analysis.status}
                    </div>
                  )}
                </form>
              </div>

              <div className="submit-container">
                <button
                  className="submit-btn"
                  onClick={handleSubmitPlan}
                  disabled={submitting}
                >
                  Soumettre et générer le PDF
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
