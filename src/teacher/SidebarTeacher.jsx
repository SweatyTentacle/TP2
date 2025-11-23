import React from "react";
import "./SidebarTeacher.css";

export default function SidebarTeacher({ activeTab, setActiveTab }) {
  return (
    <div className="teacher-sidebar">

      <div className="sidebar-title">Enseignant</div>

      <button
        className={`sidebar-btn ${activeTab === "plans" ? "active" : ""}`}
        onClick={() => setActiveTab("plans")}
      >
        Mes plans de cours
      </button>

      <button
        className={`sidebar-btn ${activeTab === "new" ? "active" : ""}`}
        onClick={() => setActiveTab("new")}
      >
        Nouveau plan
      </button>

      <button
        className={`sidebar-btn ${activeTab === "submits" ? "active" : ""}`}
        onClick={() => setActiveTab("submits")}
      >
        Remises du plan
      </button>

      <button
        className={`sidebar-btn ${activeTab === "settings" ? "active" : ""}`}
        onClick={() => setActiveTab("settings")}
      >
        Paramètres du compte
      </button>

    </div>
  );
}
