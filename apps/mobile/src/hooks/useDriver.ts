import { useState, useEffect } from "react";
import { getDriver, updateDriver } from "../services/driver.service";
import { Driver } from "../types/schema-03-core";
import { subscribeToTableChanges } from "../lib/realtime-registry";

const useDriver = (driverId: string) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ensure driverId is a string and not an object from useCurrentUserId
  const safeDriverId = typeof driverId === 'string' ? driverId : undefined;

  useEffect(() => {
    if (!safeDriverId) {
      setDriver(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDriverData = async () => {
      setLoading(true);
      const fetchedDriver = await getDriver(safeDriverId);

      if (cancelled) return;

      if (fetchedDriver) {
        setDriver(fetchedDriver);
        setError(null);
      } else {
        setError("Failed to fetch driver profile");
      }
      setLoading(false);
    };

    void fetchDriverData();
    const unsubscribe = subscribeToTableChanges(
      `driver_profile:${safeDriverId}`,
      "drivers",
      `id=eq.${safeDriverId}`,
      () => {
        if (!cancelled) {
          void fetchDriverData();
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [safeDriverId]);

  const handleUpdateDriver = async (updates: Partial<Driver>) => {
    if (!driver) return;
    setLoading(true);
    const updatedDriver = await updateDriver(driver.id, updates);
    if (updatedDriver) {
      setDriver(updatedDriver);
      setError(null);
    } else {
      setError("Failed to update driver profile");
    }
    setLoading(false);
  };

  return { driver, loading, error, updateDriver: handleUpdateDriver };
};

export default useDriver;
