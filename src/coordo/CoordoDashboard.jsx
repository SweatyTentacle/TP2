import React, { useState } from "react";
import Navbar from "../components/Navbar";
import SidebarCoordo from "./SidebarCoordo";
import ManageForms from "./ManageForms";
import ValidatePlans from "./ValidatePlans";
import CoordoSettings from "./CoordoSettings";

export default function CoordoDashboard() {
  const [activeTab, setActiveTab] = useState("forms");

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <SidebarCoordo activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="flex-1 overflow-y-auto p-8">
            {activeTab === "forms" && <ManageForms />}
            {activeTab === "validate" && <ValidatePlans />}
            {activeTab === "settings" && <CoordoSettings />}
          </main>
        </div>
      </div>
    </div>
  );
}
