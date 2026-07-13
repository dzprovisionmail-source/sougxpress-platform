
import { useState, useEffect } from 'react';
import { getDriver, updateDriver } from '../services/driver.service';
import { Driver } from '../types/schema-03-core';
import { supabase } from '../lib/supabase';

const useDriver = (driverId: string) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDriverData = async () => {
      setLoading(true);
      const fetchedDriver = await getDriver(driverId);
      if (fetchedDriver) {
        setDriver(fetchedDriver);
      } else {
        setError("Failed to fetch driver profile");
      }
      setLoading(false);
    };

    fetchDriverData();

    const channel = supabase
      .channel(`public:drivers:id=eq.${driverId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` }, payload => {
        setDriver(payload.new as Driver);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const handleUpdateDriver = async (updates: Partial<Driver>) => {
    if (!driver) return;
    setLoading(true);
    const updatedDriver = await updateDriver(driver.id, updates);
    if (updatedDriver) {
      setDriver(updatedDriver);
    } else {
      setError("Failed to update driver profile");
    }
    setLoading(false);
  };

  return { driver, loading, error, updateDriver: handleUpdateDriver };
};

export default useDriver;
