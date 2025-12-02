import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import exitIcon from "../assets/exit.png";

export default function Navbar() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [searchText, setSearchText] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserName(user.displayName || `${d.firstName} ${d.lastName}`);
          setUserRole(d.role === "teacher" ? "Enseignant" : "Coordonnateur");
        }
      }
    });

    getDocs(collection(db, "users")).then((snap) =>
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return unsub;
  }, []);

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredUsers([]);
      return;
    }

    setFilteredUsers(
      allUsers.filter((u) =>
        `${u.firstName} ${u.lastName}`
          .toLowerCase()
          .includes(searchText.toLowerCase())
      )
    );
  }, [searchText, allUsers]);

  return (
    <nav className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 sticky top-0 z-50">
      
      {/* LOGO */}
      <div className="text-xl font-bold text-primary tracking-wide">
        EnseignIA
      </div>

      {/* SEARCH */}
      <div className="relative hidden md:block w-96">
        <input
          type="text"
          placeholder="Rechercher un collègue..."
          className="w-full bg-dark-bg border border-dark-border rounded-full px-4 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        {filteredUsers.length > 0 && (
          <div className="absolute top-12 left-0 w-full bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden z-50">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="px-4 py-3 hover:bg-dark-bg cursor-pointer text-sm text-white border-b border-dark-border last:border-0"
              >
                <span className="font-bold">
                  {u.firstName} {u.lastName}
                </span>

                <span className="ml-2 text-xs text-dark-muted px-2 py-0.5 bg-dark-bg rounded-full border border-dark-border">
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* USER + LOGOUT */}
      <div className="flex items-center gap-4">
        
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-white">{userName}</div>
          <div className="text-xs text-dark-muted">{userRole}</div>
        </div>

        {/* LOGOUT ICON ONLY */}
        <button
          onClick={() => {
            auth.signOut();
            navigate("/login");
          }}
          className="bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors"
        >
          <img src={exitIcon} alt="logout" className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
