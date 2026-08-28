
import { useState, useEffect } from 'react';
import { Store } from '../types/schema-03-core';
import { getAllStores, getStoresByCategory, searchStores } from '../services/store.service';
import { supabase, withRetry } from '../lib/supabase';
import { PlatformPublicProfile, searchPlatformPublicProfiles } from '../services/platform-profile.service';

export const useStores = (category?: string) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        let data;
        if (category && category !== 'All') {
          data = await getStoresByCategory(category);
        } else {
          data = await getAllStores();
        }
        setStores(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [category]);

  return { stores, loading, error };
};

export const useSearch = () => {
  const [results, setResults] = useState<{ stores: Store[]; platformProfiles: PlatformPublicProfile[] }>({ stores: [], platformProfiles: [] });
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults({ stores: [], platformProfiles: [] });
      return;
    }
    setLoading(true);
    try {
      const [stores, platformProfiles] = await Promise.all([
        searchStores(query),
        searchPlatformPublicProfiles(query),
      ]);
      setResults({ stores, platformProfiles });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, handleSearch };
};

export const useNewStores = (limit: number = 10) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewStores = async () => {
      setLoading(true);
      try {
        const { data, error } = await withRetry<Store[]>(async () => {
          const result = await supabase
            .from('stores')
            .select('*')
            .eq('status', 'active')
            .eq('is_new', true)
            .order('created_at', { ascending: false })
            .limit(limit);
          return { data: result.data as Store[] | null, error: result.error };
        });
        
        if (error) throw error;
        setStores(data || []);
      } catch (err) {
        console.error('Error fetching new stores:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewStores();
  }, [limit]);

  return { stores, loading };
};
