import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import exitIcon from "../assets/exit.png";
import searchIcon from "../assets/search.png";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  const [searchText, setSearchText] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const roleMap = {
    teacher: "Enseignant",
    enseignant: "Enseignant",

    admin: "Coordonnateur",
    coordonnateur: "Coordonnateur",
    coordinator: "Coordonnateur"
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();

        setUserName(`${data.firstName} ${data.lastName}`);

        const roleKey = data.role?.toLowerCase() || "";
        setUserRole(roleMap[roleKey] || data.role);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllUsers(users);
    };

    loadUsers();
  }, []);

  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredUsers([]);
      return;
    }

    const results = allUsers.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchText.toLowerCase())
    );

    setFilteredUsers(results);
  }, [searchText, allUsers]);

  const handleLogout = () => {
    auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="nav">
      {/* LEFT */}
      <div className="nav-left">
        <h1 className="nav-logo">EnseignIA</h1>
      </div>

      {/* CENTER SEARCH */}
      <div className="nav-search">
        <img src={searchIcon} alt="search" className="search-icon" />
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* SEARCH DROPDOWN */}
      {filteredUsers.length > 0 && (
        <div className="search-results">
          {filteredUsers.map((u) => (
            <div key={u.id} className="search-item">
              {u.firstName} {u.lastName} — {roleMap[u.role.toLowerCase()] || u.role}
            </div>
          ))}
        </div>
      )}

      <div className="nav-right">
        <span className="user-name">
          {userName} — {userRole}
        </span>

        <button className="logout-btn" onClick={handleLogout}>
          <img src={exitIcon} className="logout-icon" alt="logout" />
        </button>
      </div>
    </nav>
  );
}
