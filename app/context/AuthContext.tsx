"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type UserRole = "admin" | "user" | null;

interface UserProfile {
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from Firestore
  const fetchProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    if (!db) {
      console.error("Firestore not initialized");
      return null;
    }

    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.warn("User document not found in Firestore:", uid);
        return null;
      }

      const data = userSnap.data();
      return {
        email: data.email || "",
        role: data.role === "admin" ? "admin" : "user",
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? undefined,
      };
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  }, []);

  // Refresh profile manually
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    const newProfile = await fetchProfile(user.uid);
    setProfile(newProfile);
  }, [user, fetchProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    if (!auth) return;
    
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error("Error signing out:", err);
      throw err;
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setError("Firebase not configured");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch user profile
        const userProfile = await fetchProfile(firebaseUser.uid);
        
        if (!userProfile) {
          // User exists in Auth but not in Firestore
          // This could be a new user or data inconsistency
          setError("User profile not found. Contact administrator.");
          setProfile(null);
        } else if (!userProfile.isActive) {
          // User is deactivated
          setError("Your account has been deactivated. Contact administrator.");
          setProfile(null);
          // Sign them out
          await signOut();
        } else {
          setProfile(userProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile, signOut]);

  const value: AuthContextType = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    error,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
