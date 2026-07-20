import { useState, useEffect, useCallback } from "react";
import { StorePromotion } from "../types/schema-03-core";
import {
  getStorePromotions,
  getActiveStorePromotions,
  createStorePromotion,
  updateStorePromotion,
  deleteStorePromotion,
  PromotionInput,
} from "../services/promotion.service";

/**
 * Full CRUD hook for the merchant workspace (all promotions for a store).
 */
export const useMerchantPromotions = (storeId: string) => {
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const data = await getStorePromotions(storeId);
    setPromotions(data);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addPromotion = async (input: Omit<PromotionInput, "store_id">) => {
    const created = await createStorePromotion({ ...input, store_id: storeId });
    if (created) await refresh();
    return created;
  };

  const editPromotion = async (
    id: string,
    updates: Partial<Omit<PromotionInput, "store_id">>
  ) => {
    const updated = await updateStorePromotion(id, updates);
    if (updated) await refresh();
    return updated;
  };

  const removePromotion = async (id: string) => {
    const ok = await deleteStorePromotion(id);
    if (ok) await refresh();
    return ok;
  };

  const toggleActive = async (p: StorePromotion) => {
    return editPromotion(p.id, { is_active: !p.is_active });
  };

  return { promotions, loading, refresh, addPromotion, editPromotion, removePromotion, toggleActive };
};

/**
 * Read-only hook for the public store page (active promotions only).
 */
export const useActivePromotions = (storeId: string) => {
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    getActiveStorePromotions(storeId).then((data) => {
      setPromotions(data);
      setLoading(false);
    });
  }, [storeId]);

  return { promotions, loading };
};
