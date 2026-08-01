
import { useState, useEffect } from 'react';
import { Store } from '../types/schema-03-core';
import { getAllStores, getStoresByCategory, searchStores } from '../services/store.service';
import { supabase } from '../lib/supabase';

export const useStores = (category?: string) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryMap, setGalleryMap] = useState<Record<string, string[]>>({});

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

        const storeIds = (data || []).slice(0, 20).map((s) => s.id);
        if (storeIds.length > 0) {
          const { data: galleryData } = await supabase
            .from('store_gallery')
            .select('store_id, image_url')
            .in('store_id', storeIds)
            .order('sort_order', { ascending: true });

          const map: Record<string, string[]> = {};
          (galleryData || []).forEach((g: any) => {
            if (!map[g.store_id]) map[g.store_id] = [];
            map[g.store_id].push(g.image_url);
          });
          setGalleryMap(map);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [category]);

  return { stores, loading, error, galleryMap };
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
