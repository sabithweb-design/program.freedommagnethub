
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useAuth as useFirebaseAuth, useFirestore } from "@/firebase";

const ADMIN_EMAIL = "admin@freedommagnethub.com";

interface UserProfile {
  uid: string;
  email: string | null;
  role: "student" | "admin";
  cohortStartDate: Timestamp;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Implementation of 3-day session expiration
        const lastSignInTime = firebaseUser.metadata.lastSignInTime;
        if (lastSignInTime) {
          const lastSignInDate = new Date(lastSignInTime).getTime();
          const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
          
          if (Date.now() - lastSignInDate > threeDaysInMs) {
            // Session expired (3+ days since last login)
            await signOut(auth);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
        }

        setUser(firebaseUser);
        const docRef = doc(db, "users", firebaseUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: user?.email === ADMIN_EMAIL || profile?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
