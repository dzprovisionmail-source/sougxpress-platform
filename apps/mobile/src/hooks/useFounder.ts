
import { useState, useEffect } from 'react';
import { getFounder, updateFounder, Founder } from '../services/founder.service';
import { supabase } from '../lib/supabase';

const useFounder = (founderId: string) => {
  const [founder, setFounder] = useState<Founder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFounderData = async () => {
      setLoading(true);
      const fetchedFounder = await getFounder(founderId);
      if (fetchedFounder) {
        setFounder(fetchedFounder);
      } else {
        setError("Failed to fetch founder profile");
      }
      setLoading(false);
    };

    fetchFounderData();

    const channel = supabase
      .channel(`public:founders:id=eq.${founderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'founders', filter: `id=eq.${founderId}` }, payload => {
        setFounder(payload.new as Founder);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [founderId]);

  const handleUpdateFounder = async (updates: Partial<Founder>) => {
    if (!founder) return;
    setLoading(true);
    const updatedFounder = await updateFounder(founder.id, updates);
    if (updatedFounder) {
      setFounder(updatedFounder);
    } else {
      setError("Failed to update founder profile");
    }
    setLoading(false);
  };

  return { founder, loading, error, updateFounder: handleUpdateFounder };
};

export default useFounder;
