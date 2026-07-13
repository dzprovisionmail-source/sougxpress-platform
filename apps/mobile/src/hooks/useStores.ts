
import { useState, useEffect } from 'react';
import { Store } from '../types/schema-03-core';
import { getAllStores, getStoresByCategory, searchStores } from '../services/store.service';

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
  const [results, setResults] = useState<{ stores: Store[] }>({ stores: [] });
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults({ stores: [] });
      return;
    }
    setLoading(true);
    try {
      const stores = await searchStores(query);
      setResults({ stores });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, handleSearch };
};
