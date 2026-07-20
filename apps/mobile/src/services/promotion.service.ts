import { supabase } from "../lib/supabase";
import { StorePromotion } from "../types/schema-03-core";

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getStorePromotions = async (storeId: string): Promise<StorePromotion[]> => {
  const { data, error } = await supabase
    .from("store_promotions")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[promotion] getStorePromotions:", error);
    return [];
  }
  return data as StorePromotion[];
};

export const getActiveStorePromotions = async (storeId: string): Promise<StorePromotion[]> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("store_promotions")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[promotion] getActiveStorePromotions:", error);
    return [];
  }
  return data as StorePromotion[];
};

// ─── Write ────────────────────────────────────────────────────────────────────

export type PromotionInput = {
  store_id: string;
  title: string;
  description?: string | null;
  discount_type: "percentage" | "fixed_amount" | "free_delivery";
  discount_value: number;
  image_url?: string | null;
  starts_at: string;   // ISO string
  ends_at: string;     // ISO string
  is_active?: boolean;
  min_order_minor?: number;
};

export const createStorePromotion = async (
  input: PromotionInput
): Promise<StorePromotion | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("store_promotions")
    .insert({ ...input, created_by: user?.id ?? null })
    .select()
    .single();

  if (error) {
    console.error("[promotion] createStorePromotion:", error);
    return null;
  }
  return data as StorePromotion;
};

export const updateStorePromotion = async (
  id: string,
  updates: Partial<Omit<PromotionInput, "store_id">>
): Promise<StorePromotion | null> => {
  const { data, error } = await supabase
    .from("store_promotions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[promotion] updateStorePromotion:", error);
    return null;
  }
  return data as StorePromotion;
};

export const deleteStorePromotion = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from("store_promotions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[promotion] deleteStorePromotion:", error);
    return false;
  }
  return true;
};

export const uploadPromotionImage = async (
  promotionId: string,
  uri: string
): Promise<string | null> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = uri.split(".").pop() ?? "jpg";
    const path = `promotions/${promotionId}.${ext}`;
    const { error } = await supabase.storage
      .from("store_images")
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("store_images").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("[promotion] uploadPromotionImage:", err);
    return null;
  }
};
