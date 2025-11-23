import React, { useState } from "react";
import "./Login.css";
import maisonneuve from "./assets/maisonneuve.jpg";
import mailIcon from "./assets/mail.png";
import lockIcon from "./assets/padlock.png";
import enterIcon from "./assets/enter.png";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Aucun compte trouvé.");
        return;
      }

      const storedRole = snap.data().role;

      if (storedRole !== role) {
        alert("Rôle incorrect. Vérifiez votre sélection.");
        return;
      }

      console.log("Connexion réussie !");
      console.log("Rôle :", storedRole);

      if (storedRole === "teacher") {
        navigate("/dashboard-teacher");
      } else {
        navigate("/dashboard-coordo");
      }

    } catch (err) {
      console.error(err);
      alert("Email ou mot de passe incorrect.");
    }
  };

  return (
    <div className="login-page">

      {/* Image gauche */}
      <div className="left-panel">
        <img src={maisonneuve} alt="Cégep Maisonneuve" className="left-image" />
      </div>

      {/* Formulaire */}
      <div className="right-panel">
        <div className="login-box">
          <h1 className="login-title">Connexion</h1>

          {/* Toggle des rôles */}
          <div className="role">
            <button
              className={`r-btn ${role === "teacher" ? "active" : ""}`}
              onClick={() => setRole("teacher")}
            >
              Enseignant
            </button>

            <button
              className={`r-btn ${role === "coordonator" ? "active" : ""}`}
              onClick={() => setRole("coordonator")}
            >
              Coordonnateur
            </button>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div className="input-group">
              <label>Courriel</label>
              <div className="input-wrapper">
                <img src={mailIcon} className="input-icon" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="input-group">
              <label>Mot de passe</label>
              <div className="input-wrapper">
                <img src={lockIcon} className="input-icon" />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Bouton */}
            <button className="login-button" type="submit">
              Se connecter
              <img src={enterIcon} className="btn-icon" />
            </button>
          </form>

          {/* Lien vers Register */}
          <div className="register-link">
            Pas de compte ? <span onClick={() => navigate("/register")}>Créer un compte</span>
          </div>
        </div>
      </div>

    </div>
  );
}
