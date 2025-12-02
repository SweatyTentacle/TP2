import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const formatDateTime = (ts) => {
  if (!ts) return "N/A";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TeacherSubmits() {
  const [submits, setSubmits] = useState([]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "coursePlans"),
        where("teacherId", "==", user.uid)
      );
      const snap = await getDocs(q);
      setSubmits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  return (
    <div className="card-modern">
      <h2 className="text-2xl font-bold text-white mb-6">
        Historique des remises
      </h2>
      {submits.length === 0 ? (
        <p className="text-dark-muted text-center">Aucune remise.</p>
      ) : (
        <div className="grid gap-4">
          {submits.map((plan) => (
            <div
              key={plan.id}
              className="bg-dark-bg p-4 rounded-xl border border-dark-border flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-white">
                  {plan.title || "Sans titre"}
                </h3>

                <div className="flex flex-col gap-1">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded inline-block ${
                      plan.status === "Approuvé"
                        ? "text-green-400 bg-green-900/20"
                        : "text-yellow-400 bg-yellow-900/20"
                    }`}
                  >
                    {plan.status}
                  </span>

                  <span className="text-xs text-dark-muted">
                    Soumis : {formatDateTime(plan.createdAt)}
                  </span>

                  {plan.status === "Approuvé" && (
                    <span className="text-xs text-dark-muted">
                      Approuvé : {formatDateTime(plan.updatedAt)}
                    </span>
                  )}
                </div>
              </div>

              <a
                href={plan.pdfUrl}
                target="_blank"
                className="text-sm bg-dark-card px-4 py-2 rounded hover:bg-dark-border transition-colors text-white"
              >
                Voir PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
