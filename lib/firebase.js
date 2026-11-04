import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";

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
