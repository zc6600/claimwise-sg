"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NavbarUser() {
  const { user, loading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <Link href="/login" className="nav-user-link" suppressHydrationWarning>
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
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
        >
          Sign out
        </button>
      </span>
    );
  }

  return (
    <Link href="/login" className="nav-user-link" suppressHydrationWarning>
      Sign in
    </Link>
  );
}
