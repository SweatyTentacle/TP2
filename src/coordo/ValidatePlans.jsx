import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export default function ValidatePlans() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [comment, setComment] = useState("");

  const load = async () => {
    const snap = await getDocs(
      query(collection(db, "coursePlans"), orderBy("createdAt", "desc"))
    );
    setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };
  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (status) => {
    await updateDoc(doc(db, "coursePlans", selectedPlan.id), {
      status,
      coordinatorComment: comment,
      approvedAt: serverTimestamp(),
    });
    alert("Mis à jour !");
    setSelectedPlan(null);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {!selectedPlan ? (
        <div className="card-modern">
          <h2 className="text-2xl font-bold text-white mb-6">Validation</h2>
          <div className="grid gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="bg-dark-bg p-4 rounded-xl border border-dark-border flex justify-between items-center hover:border-primary cursor-pointer"
                onClick={() => setSelectedPlan(p)}
              >
                <div>
                  <div className="font-bold text-white">
                    {p.title || "Sans titre"}
                  </div>
                  <div className="text-sm text-dark-muted">
                    Prof: {p.teacherId}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    p.status === "Approuvé"
                      ? "text-green-400"
                      : "text-orange-400"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-modern space-y-6">
          <button
            onClick={() => setSelectedPlan(null)}
            className="text-dark-muted hover:text-white"
          >
            ← Retour
          </button>
          <h2 className="text-3xl font-bold text-white">
            {selectedPlan.title}
          </h2>
          <a
            href={selectedPlan.pdfUrl}
            target="_blank"
            className="btn-primary inline-block"
          >
            Voir le PDF
          </a>

          <div className="bg-dark-bg p-6 rounded-xl border border-dark-border">
            <h3 className="text-lg font-bold text-white mb-4">Décision</h3>
            <textarea
              className="input-modern min-h-[100px] mb-4"
              placeholder="Commentaire..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-4">
              <button
                onClick={() => updateStatus("Approuvé")}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold"
              >
                Approuver
              </button>
              <button
                onClick={() => updateStatus("À corriger")}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-bold"
              >
                Corriger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
