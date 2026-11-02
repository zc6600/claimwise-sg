"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        router.push("/calculator");
      }
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled before completion.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not yet authorized in Firebase Authentication.");
      } else {
        setError(err.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/calculator");
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Email or password is incorrect. Check your details and try again.");
      } else {
        setError(err.message || "Sign in failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper section-pad">
      <div className="auth-card">
        <div className="auth-header">
          <div className="section-kicker">Account sync</div>
          <h1>Sign in to ClaimWise</h1>
          <p>Sync your saved repair comparisons and policy settings across devices.</p>
        </div>

        {error && (
          <div className="auth-error-alert" role="alert">
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="google-auth-btn"
          disabled={googleLoading || loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {googleLoading ? "Connecting to Google…" : "Continue with Google"}
        </button>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="button button-primary button-large auth-submit-btn"
            disabled={loading || googleLoading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-footer">
          No account needed to run numbers —
          <Link href="/calculator">continue as guest →</Link>
        </div>
      </div>
    </div>
  );
}
