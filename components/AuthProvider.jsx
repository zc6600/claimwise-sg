"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";

const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Discard legacy client-only demo sessions; authentication must come from Firebase.
    try {
      sessionStorage.removeItem("claimwise_demo_user");
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    // Keep the current user until Firebase confirms the sign-out. The auth observer
    // will clear the context state after the Firebase session is actually removed.
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
