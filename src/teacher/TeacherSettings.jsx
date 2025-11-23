import React, { useState } from "react";
import { auth } from "../firebase";
import { updateProfile } from "firebase/auth";

export default function TeacherSettings() {
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert("Nom invalide");

    setSaving(true);

    await updateProfile(user, {
      displayName: name,
    });

    setSaving(false);
    alert("Nom mis à jour !");
  };

  const logout = () => auth.signOut();

  return (
    <div className="card">
      <h2>Paramètres du compte</h2>

      <div className="settings-row">
        <label>Nom complet :</label>
        <input
          className="word-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          Sauvegarder
        </button>
      </div>

      <div className="settings-row">
        <label>Email :</label>
        <input className="word-input" value={user.email} disabled />
      </div>

      <button className="btn-logout" onClick={logout}>
        Se déconnecter
      </button>
    </div>
  );
}
