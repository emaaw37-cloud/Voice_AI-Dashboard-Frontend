import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _app: FirebaseApp | null = null;
let _functions: Functions | null = null;

try {
  const app: FirebaseApp =
    !getApps().length ? initializeApp(firebaseConfig) : getApp();
  _app = app;
  _auth = getAuth(app);
  _db = getFirestore(app);
  _functions = getFunctions(app);
  const base = process.env.NEXT_PUBLIC_BACKEND_URL_BASE ?? "";
  if (base.includes("127.0.0.1") || base.includes("localhost")) {
    try {
      connectFunctionsEmulator(_functions, "127.0.0.1", 5001);
    } catch {
      // ignore if already connected
    }
  }
} catch (e) {
  console.error("Firebase init failed (app will run with limited features):", e);
}

export const app: FirebaseApp | null = _app;
export const auth: Auth | null = _auth;
export const db: Firestore | null = _db;
export const functions: Functions | null = _functions;
