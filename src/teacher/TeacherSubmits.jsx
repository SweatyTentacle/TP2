import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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
                <span className="text-xs text-primary">{plan.status}</span>
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
