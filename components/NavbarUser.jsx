"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMyCar } from "./my-car/useMyCar";
import { formatCarSlotLabel, hasCarDetails } from "../src/my-car.mjs";

export default function NavbarUser() {
  const { user, loading, signOut } = useAuth();
  const { car, cars, activeCarId, selectCar } = useMyCar();
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
  const hasMultipleCars = mounted && cars.length > 1;
  const activeIndex = Math.max(
    0,
    cars.findIndex((item) => item.id === activeCarId)
  );
  const myCarLabel =
    mounted && (car.label || hasMultipleCars)
      ? formatCarSlotLabel(car, activeIndex)
      : "My car";
  const myCarStatusTitle = hasSavedCar
    ? `Saved car details (${myCarLabel})`
    : "Save your car details and renewal reminders";

  const myCarControl = hasMultipleCars ? (
    <div
      className={`nav-mycar-group${isMyCarActive ? " is-active" : ""}${hasSavedCar ? " is-saved" : ""}`}
    >
      <span className="nav-mycar-dot" aria-hidden="true" />
      <select
        aria-label="Active car"
        className="nav-mycar-select"
        value={activeCarId}
        onChange={(event) => selectCar(event.target.value)}
      >
        {cars.map((item, index) => (
          <option key={item.id} value={item.id}>
            {formatCarSlotLabel(item, index)}
          </option>
        ))}
      </select>
      <Link
        href="/my-car"
        className="nav-mycar-manage"
        aria-current={isMyCarActive ? "page" : undefined}
        title="Manage saved cars and reminders"
      >
        Manage ({cars.length})
      </Link>
    </div>
  ) : (
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
        {myCarControl}
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
        {myCarControl}
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
      {myCarControl}
      <Link href="/login" className="topbar-cta" suppressHydrationWarning>
        Sign in
      </Link>
    </>
  );
}
