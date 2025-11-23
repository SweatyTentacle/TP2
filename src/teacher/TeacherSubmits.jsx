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
    <div className="card">
      <h2>Remises du plan</h2>

      {submits.length === 0 && <p>Aucune remise pour le moment.</p>}

      {submits.map((plan) => (
        <div key={plan.id} className="submit-item">
          <h3>{plan.answers?.title || "Sans titre"}</h3>
          <p><strong>Statut :</strong> {plan.status}</p>

          <a
            href={plan.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-link"
          >
            Voir le PDF
          </a>
        </div>
      ))}
    </div>
  );
}

