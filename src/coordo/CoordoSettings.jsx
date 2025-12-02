import React, { useState } from "react";
import { auth } from "../firebase";
import { updateProfile } from "firebase/auth";

export default function CoordoSettings() {
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert("Nom invalide");

    setSaving(true);

    try {
      await updateProfile(user, { displayName: name });
      await user.reload();
      alert("Nom mis à jour avec succès!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la mise à jour du nom.");
    }

    setSaving(false);
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
