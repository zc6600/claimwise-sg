"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  loadCloudGarage,
  loadLocalGarage,
  saveGarageToCloud,
  saveLocalGarage,
} from "../../lib/my-car-service";
import {
  EMPTY_CAR,
  hasCarDetails,
  nextVehicleSlotId,
  normalizeGarage,
} from "../../src/my-car.mjs";

const GARAGE_EVENT = "claimwise:garage-change";
const DEFAULT_GARAGE = normalizeGarage({});

function broadcastGarageChange(ownerUid, garage) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GARAGE_EVENT, {
      detail: { ownerUid, garage },
    })
  );
}

/**
 * Loads the saved vehicle garage from this browser, then reconciles it with the signed-in account.
 * Account data wins. Vehicles entered while signed out are uploaded when the account has none,
 * and vehicles saved by a different account are never adopted.
 */
export function useMyCar() {
  const { user, loading: authLoading } = useAuth();
  const [stored, setStored] = useState({
    ownerUid: null,
    garage: DEFAULT_GARAGE,
  });
  const [ready, setReady] = useState(false);
  const viewerUid = user?.uid ?? null;

  // State from a previous account is never exposed, even for the render before the effect runs.
  const garage = stored.ownerUid === viewerUid ? stored.garage : DEFAULT_GARAGE;
  const cars = garage.cars;
  const activeCarId = garage.activeCarId;
  const car =
    cars.find((item) => item.id === activeCarId) ??
    cars[0] ?? { id: "primary", ...EMPTY_CAR };
  const savedCars = cars.filter((item) => hasCarDetails(item));

  const applyGarage = useCallback(
    (nextRawGarage, { broadcast = true, persistLocal = false } = {}) => {
      const normalized = normalizeGarage(nextRawGarage);
      if (persistLocal) {
        saveLocalGarage(user, normalized);
      }
      setStored({
        ownerUid: viewerUid,
        garage: normalized,
      });
      if (broadcast) {
        broadcastGarageChange(viewerUid, normalized);
      }
      return normalized;
    },
    [user, viewerUid]
  );

  const setCar = useCallback(
    (update) => {
      setStored((current) => {
        const baseGarage =
          current.ownerUid === viewerUid ? current.garage : DEFAULT_GARAGE;
        const currentActive =
          baseGarage.cars.find((item) => item.id === baseGarage.activeCarId) ??
          baseGarage.cars[0];
        const nextCar =
          typeof update === "function" ? update(currentActive) : update;
        const targetId = nextCar?.id || baseGarage.activeCarId;
        const exists = baseGarage.cars.some((item) => item.id === targetId);
        const nextCars = exists
          ? baseGarage.cars.map((item) =>
              item.id === targetId ? { ...nextCar, id: targetId } : item
            )
          : [...baseGarage.cars, { ...nextCar, id: targetId }];
        return {
          ownerUid: viewerUid,
          garage: normalizeGarage({
            cars: nextCars,
            activeCarId: targetId,
          }),
        };
      });
    },
    [viewerUid]
  );

  const selectCar = useCallback(
    (nextCarId) => {
      if (!garage.cars.some((item) => item.id === nextCarId)) {
        return;
      }
      const nextGarage = saveLocalGarage(user, {
        cars: garage.cars,
        activeCarId: nextCarId,
      });
      setStored({
        ownerUid: viewerUid,
        garage: nextGarage,
      });
      broadcastGarageChange(viewerUid, nextGarage);
      if (user) {
        saveGarageToCloud(user, nextGarage).catch(() => {});
      }
    },
    [garage.cars, user, viewerUid]
  );

  const addCar = useCallback(() => {
    const slotId = nextVehicleSlotId(garage.cars);
    if (!slotId) return null;
    const nextGarage = normalizeGarage({
      cars: [...garage.cars, { id: slotId, ...EMPTY_CAR }],
      activeCarId: slotId,
    });
    setStored({
      ownerUid: viewerUid,
      garage: nextGarage,
    });
    broadcastGarageChange(viewerUid, nextGarage);
    return slotId;
  }, [garage.cars, viewerUid]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    function handleGarageEvent(event) {
      const detail = event?.detail;
      if (!detail || detail.ownerUid !== viewerUid) return;
      setStored({
        ownerUid: viewerUid,
        garage: normalizeGarage(detail.garage),
      });
    }
    window.addEventListener(GARAGE_EVENT, handleGarageEvent);
    return () => window.removeEventListener(GARAGE_EVENT, handleGarageEvent);
  }, [viewerUid]);

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;
    const local = loadLocalGarage(user);
    setStored({
      ownerUid: viewerUid,
      garage: normalizeGarage(local),
    });

    async function reconcile() {
      if (!user) return;
      try {
        const cloud = await loadCloudGarage(user);
        if (cancelled) return;
        if (cloud) {
          saveLocalGarage(user, cloud);
          setStored({
            ownerUid: viewerUid,
            garage: cloud,
          });
          broadcastGarageChange(viewerUid, cloud);
        } else if (local.unowned && local.cars.some((item) => hasCarDetails(item))) {
          await saveGarageToCloud(user, local);
          saveLocalGarage(user, local);
        }
      } catch (error) {
        console.warn("Saved cars could not be loaded from the account:", error?.message || error);
      }
    }

    reconcile().finally(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, viewerUid]);

  return {
    car,
    cars,
    savedCars,
    activeCarId,
    setCar,
    selectCar,
    addCar,
    applyGarage,
    ready,
    user,
  };
}
