"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMyCar } from "./my-car/useMyCar";
import { hasCarDetails } from "../src/my-car.mjs";

export default function NavbarUser() {
  const { user, loading, signOut } = useAuth();
  const { car } = useMyCar();
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMyCarActive = pathname === "/my-car";
  const hasSavedCar = mounted && hasCarDetails(car);
  const myCarLabel = mounted && car.label ? car.label : "My car";
  const myCarStatusTitle = hasSavedCar
    ? `Saved car details (${myCarLabel})`
    : "Save your car details and renewal reminders";

  const myCarLink = (
    <Link
      href="/my-car"
      className={`nav-mycar-link${isMyCarActive ? " is-active" : ""}${hasSavedCar ? " is-saved" : ""}`}
      aria-current={isMyCarActive ? "page" : undefined}
      aria-label={hasSavedCar ? `${myCarLabel} (saved car details)` : "My car"}
      title={myCarStatusTitle}
    >
      <span className="nav-mycar-dot" aria-hidden="true" />
      <span className="nav-mycar-label">{myCarLabel}</span>
    </Link>
  );

  if (!mounted || loading) {
    return (
      <>
        {myCarLink}
        <Link href="/login" className="topbar-cta" suppressHydrationWarning>
          Sign in
        </Link>
      </>
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
      <>
        {myCarLink}
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
      </>
    );
  }

  return (
    <>
      {myCarLink}
      <Link href="/login" className="topbar-cta" suppressHydrationWarning>
        Sign in
      </Link>
    </>
  );
}
