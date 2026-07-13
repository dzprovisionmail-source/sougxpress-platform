
import { useState, useEffect } from 'react';
import { getStore, updateStore, getStoreGalleryImages } from '../services/store.service';
import { Store } from '../types/schema-03-core';
import { supabase } from '../lib/supabase';

const useStore = (storeId: string) => {
  const [store, setStore] = useState<Store | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      setLoading(true);
      const fetchedStore = await getStore(storeId);
      if (fetchedStore) {
        setStore(fetchedStore);
        const images = await getStoreGalleryImages(storeId);
        setGalleryImages(images);
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

  const handleUpdateStore = async (updates: Partial<Store>) => {
    if (!store) return;
    setLoading(true);
    const updatedStore = await updateStore(store.id, updates);
    if (updatedStore) {
      setStore(updatedStore);
    } else {
      setError("Failed to update store");
    }
    setLoading(false);
  };

  const handleImageUpload = (newImageUrl: string) => {
    setGalleryImages((prevImages) => [...prevImages, newImageUrl]);
  };

  const handleImageDelete = (imageUrl: string) => {
    setGalleryImages((prevImages) => prevImages.filter((img) => img !== imageUrl));
  };

  return { store, galleryImages, loading, error, updateStore: handleUpdateStore, handleImageUpload, handleImageDelete };
};

export default useStore;
