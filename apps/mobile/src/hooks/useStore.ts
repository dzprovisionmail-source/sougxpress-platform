
import { useState, useEffect } from 'react';
import { getStore, updateStore, getStoreGalleryImages, getStoreSubcategories, updateStoreSubcategories } from '../services/store.service';
import { Store } from '../types/schema-03-core';
import { supabase } from '../lib/supabase';

const useStore = (storeId: string) => {
  const [store, setStore] = useState<Store | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      setLoading(true);
      const fetchedStore = await getStore(storeId);
      if (fetchedStore) {
        setStore(fetchedStore);
        const [images, subs] = await Promise.all([
          getStoreGalleryImages(storeId),
          getStoreSubcategories(storeId)
        ]);
        setGalleryImages(images);
        setSelectedSubcategories(subs);
      } else {
        setError("Failed to fetch store");
      }
      setLoading(false);
    };

    fetchStoreData();

    const channel = supabase
      .channel(`public:stores:id=eq.${storeId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` }, payload => {
        setStore(payload.new as Store);
      })
      .subscribe();

    // For gallery images, we might need a separate channel or re-fetch on storage changes
    // Supabase storage events are not directly available via postgres_changes for now.
    // A simpler approach for now is to re-fetch gallery images after an upload/delete operation.

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  const handleUpdateStore = async (updates: Partial<Store> & { subcategory_ids?: string[] }) => {
    if (!store) return;
    setLoading(true);
    
    const { subcategory_ids, ...storeUpdates } = updates;
    
    const results = await Promise.all([
      updateStore(store.id, storeUpdates),
      subcategory_ids ? updateStoreSubcategories(store.id, subcategory_ids) : Promise.resolve()
    ]);

    const updatedStore = results[0];
    if (updatedStore) {
      setStore(updatedStore);
      if (subcategory_ids) setSelectedSubcategories(subcategory_ids);
    } else {
      setError("Failed to update store");
    }
    setLoading(false);
  };

  const handleImageUpload = (newImageUrl: string, _title?: string | null, _caption?: string | null) => {
    setGalleryImages((prevImages) => [...prevImages, newImageUrl]);
  };

  const handleImageDelete = (imageUrl: string) => {
    setGalleryImages((prevImages) => prevImages.filter((img) => img !== imageUrl));
  };

  return { store, galleryImages, selectedSubcategories, loading, error, updateStore: handleUpdateStore, handleImageUpload, handleImageDelete };
};

export default useStore;
