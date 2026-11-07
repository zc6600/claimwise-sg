"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  cacheCarLocally,
  loadCloudCar,
  loadLocalCar,
  saveCar,
} from "../../lib/my-car-service";
import { EMPTY_CAR, hasCarDetails } from "../../src/my-car.mjs";

/**
 * Loads the saved car from this browser, then reconciles it with the signed-in account.
 * Account data wins; details entered before signing in are uploaded when none exist.
 */
export function useMyCar() {
  const { user, loading: authLoading } = useAuth();
  const [car, setCar] = useState(EMPTY_CAR);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;
    const local = loadLocalCar();
    setCar(local);

    async function reconcile() {
      if (!user) return;
      try {
        const cloud = await loadCloudCar(user);
        if (cancelled) return;
        if (cloud) {
          cacheCarLocally(cloud);
          setCar(cloud);
        } else if (hasCarDetails(local)) {
          await saveCar(user, local);
        }
      } catch (error) {
        console.warn("Saved car could not be loaded from the account:", error?.message || error);
      }
    }

    reconcile().finally(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { car, setCar, ready, user };
}
