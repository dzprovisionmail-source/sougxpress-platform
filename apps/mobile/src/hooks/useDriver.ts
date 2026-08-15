import { useState, useEffect } from "react";
import { getDriver, updateDriver } from "../services/driver.service";
import { Driver } from "../types/schema-03-core";
import { supabase } from "../lib/supabase";

type DriverChannel = ReturnType<typeof supabase.channel>;

type DriverChannelRegistryEntry = {
  channel: DriverChannel;
  listeners: Set<() => void>;
};

// Supabase returns the existing channel when the same topic is requested. Keep
// one owner per driver id so React Strict Mode/remounts cannot call `.on()` on
// a channel that has already been subscribed.
const driverChannelRegistry = new Map<string, DriverChannelRegistryEntry>();

const subscribeToDriverChanges = (driverId: string, listener: () => void) => {
  let entry = driverChannelRegistry.get(driverId);

  if (!entry) {
    const channel = supabase.channel(`driver_profile:${driverId}`);
    entry = {
      channel,
      listeners: new Set<() => void>(),
    };
    driverChannelRegistry.set(driverId, entry);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drivers",
        filter: `id=eq.${driverId}`,
      },
      () => {
        const currentEntry = driverChannelRegistry.get(driverId);
        currentEntry?.listeners.forEach((callback) => callback());
      }
    );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(`Realtime channel error for driver_profile:${driverId}`);
      }
    });
  }

  entry.listeners.add(listener);

  return () => {
    const currentEntry = driverChannelRegistry.get(driverId);
    if (!currentEntry) return;

    currentEntry.listeners.delete(listener);
    if (currentEntry.listeners.size === 0) {
      driverChannelRegistry.delete(driverId);
      void supabase.removeChannel(currentEntry.channel);
    }
  };
};

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
    const unsubscribe = subscribeToDriverChanges(driverId, () => {
      if (!cancelled) {
        void fetchDriverData();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
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
export { subscribeToDriverChanges };
