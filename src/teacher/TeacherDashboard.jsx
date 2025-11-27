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
} from "firebase/firestore";
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
  const [scheduleRows, setScheduleRows] = useState([{ week: 1, activity: "", deliver: "" }]);

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
      { week: scheduleRows.length + 1, activity: "", deliver: "" },
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
        suggestions: ["Trop court", "Ajoute plus de contenu"],
      });
    }

    setAnalysis({
      status: "Conforme",
      suggestions: ["Structure correcte", "Détails suffisants"],
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
      pdfUrl,
    });

    alert("Plan enregistré !");

    // ===== RESET FORM =====
    setAnswers({});
    setObjectivesList([""]);
    setEvaluationList([""]);
    setScheduleRows([{ week: 1, activity: "", deliver: "" }]);
    setAnalysis(null);
    setSubmitting(false);

    // Reload plans
    const q = query(
      collection(db, "coursePlans"),
      where("teacherId", "==", currentUser.uid)
    );
    const snap = await getDocs(q);
    setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    setAnswers(plan.answers);
    setObjectivesList(plan.objectives || [""]);
    setEvaluationList(plan.evaluation || [""]);
    setScheduleRows(plan.schedule || [{ week: 1, activity: "", deliver: "" }]);
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
                  <p key={p.id}>
                    <strong>{p.answers.title}</strong> — {p.status}
                  </p>
                ))
              )}
            </div>
          )}

          {/* ================= REMISES DU PLAN ================= */}
          {activeTab === "submits" && (
            <div className="card">
              <h2>Remises du plan</h2>

              {plans.length === 0 ? (
                <p>Aucune remise</p>
              ) : (
                <table className="word-table">
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id}>
                        <td>{p.answers.title}</td>
                        <td>{p.status}</td>
                        <td className="action-buttons">
                          <button className="btn-primary" onClick={() => handleEditPlan(p)}>
                            Modifier
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeletePlan(p.id)}
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

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
                      <li key={i} className="row-item">
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
                        <button
                          className="delete-btn"
                          onClick={() =>
                            setObjectivesList(objectivesList.filter((_, index) => index !== i))
                          }
                        >
                          ✕
                        </button>
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
                      <li key={i} className="row-item">
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
                        <button
                          className="delete-btn"
                          onClick={() =>
                            setEvaluationList(evaluationList.filter((_, index) => index !== i))
                          }
                        >
                          ✕
                        </button>
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
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.map((row, i) => (
                        <tr key={i}>
                          <td>{row.week}</td>
                          <td>
                            <input
                              className="word-input"
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
                              value={row.deliver}
                              onChange={(e) => {
                                const copy = [...scheduleRows];
                                copy[i].deliver = e.target.value;
                                setScheduleRows(copy);
                              }}
                            />
                          </td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={() =>
                                setScheduleRows(scheduleRows.filter((_, index) => index !== i))
                              }
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="word-add-row" onClick={addScheduleRow}>
                    Ajouter une semaine
                  </div>

                  <button type="button" className="btn-primary" onClick={analyzePlan}>
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
