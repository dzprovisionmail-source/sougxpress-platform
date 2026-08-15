import { useState, useEffect } from "react";
import { getDriver, updateDriver } from "../services/driver.service";
import { Driver } from "../types/schema-03-core";
import { supabase } from "../lib/supabase";

const useDriver = (driverId: string) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) {
      setDriver(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDriverData = async () => {
      setLoading(true);
      const fetchedDriver = await getDriver(driverId);

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

    const channel = supabase.channel(`driver_profile:${driverId}`);
    
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers",
          filter: `id=eq.${driverId}`,
        },
        () => {
          if (!cancelled) {
            void fetchDriverData();
          }
        }
      );

    // Subscribe ONLY after registering all callbacks.
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(`Realtime channel error for driver_profile:${driverId}`);
      }
    });

    return () => {
      cancelled = true;
      // Use removeChannel to properly clean up.
      void supabase.removeChannel(channel);
    };
  }, [driverId]);

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
