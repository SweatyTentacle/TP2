import React, { useState } from "react";
import maisonneuve from "./assets/maisonneuve.jpg";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("teacher");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[A-Z]/.test(firstName) || !/^[A-Z]/.test(lastName))
      return alert("Nom/Prénom doivent commencer par une majuscule.");
    if (password !== confirm) return alert("Mots de passe différents.");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        firstName,
        lastName,
        email,
        role,
        createdAt: new Date(),
      });
      alert("Compte créé !");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Erreur création compte.");
    }
  };

  return (
    <div className="flex h-screen w-full bg-dark-bg text-dark-text overflow-hidden">
      <div className="hidden lg:flex w-1/2 relative">
        <img
          src={maisonneuve}
          className="w-full h-full object-cover opacity-50"
        />
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-3xl font-bold text-center text-white">
            Créer un compte
          </h2>
          <div className="flex bg-dark-card p-1 rounded-lg border border-dark-border">
            {["teacher", "coordonator"].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-md text-sm ${
                  role === r ? "bg-primary text-white" : "text-dark-muted"
                }`}
              >
                {r === "teacher" ? "Enseignant" : "Coordonnateur"}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <input
                placeholder="Prénom"
                className="input-modern"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                placeholder="Nom"
                className="input-modern"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <input
              type="email"
              placeholder="Courriel"
              className="input-modern"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              className="input-modern"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirmer"
              className="input-modern"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button type="submit" className="w-full btn-primary py-3">
              S'inscrire
            </button>
          </form>
          <p className="text-center text-dark-muted">
            Déjà un compte ?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-primary cursor-pointer hover:underline"
            >
              Connexion
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
