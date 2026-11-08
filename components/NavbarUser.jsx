"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NavbarUser() {
  const { user, loading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <Link href="/login" className="topbar-cta" suppressHydrationWarning>
        Sign in
      </Link>
    );
  }

  if (user) {
    const displayName =
      user.displayName?.split(" ")[0] ||
      user.name?.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "Account";

    const photoURL = user.photoURL || user.image;

    return (
      <span className="nav-user-chip" suppressHydrationWarning>
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="nav-user-avatar"
          />
        ) : (
          <span className="nav-user-initial" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="nav-user-name">{displayName}</span>
        <button
          type="button"
          className="nav-signout-btn"
          disabled={isSigningOut}
          onClick={async () => {
            setIsSigningOut(true);
            setSignOutError("");
            try {
              await signOut();
              router.push("/");
            } catch {
              setSignOutError("Sign out failed. Please try again.");
            } finally {
              setIsSigningOut(false);
            }
          }}
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
        {signOutError && (
          <span className="nav-signout-error" role="alert">
            {signOutError}
          </span>
        )}
      </span>
    );
  }

  return (
    <Link href="/login" className="topbar-cta" suppressHydrationWarning>
      Sign in
    </Link>
  );
}
