import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCz7WYNRb0Nm6WCqfTUlaa3qmCFnarFpOY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "claimwise-sg.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "claimwise-sg",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "claimwise-sg.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "721110976915",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:721110976915:web:a6a137a0037af6852e0066",
};

// Initialize Firebase app singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Disable WebChannel Fetch streams to prevent unhandled AbortController.abort()
// ("Runtime AbortError: signal is aborted without reason") when streams close or tear down.
let db;
try {
  db = initializeFirestore(app, { useFetchStreams: false });
} catch {
  db = getFirestore(app);
}

const googleProvider = new GoogleAuthProvider();

// Customize Google Provider parameters if needed
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { app, auth, db, googleProvider };
