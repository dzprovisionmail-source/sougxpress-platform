
import { supabase } from "../lib/supabase";
import { Store, StoreGalleryImage, StoreVideo } from "../types/schema-03-core";
import { mapLegacyCategoryToMain } from "../config/storeCategories";

const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const getStore = async (storeId: string): Promise<Store | null> => {
  if (!storeId || !isValidUUID(storeId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("stores")
    .select("*", { count: "exact" })
    .eq("id", storeId)
    .single();

  if (error) {
    console.error("Error fetching store:", error);
    return null;
  }
  return data as Store;
};

export const getStoreByMerchantId = async (merchantId: string): Promise<Store | null> => {
  if (!merchantId || !isValidUUID(merchantId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching store by merchant:", error);
    return null;
  }
  return data as Store | null;
};

export const getAllStores = async (): Promise<Store[]> => {
  let { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active");

  if (error && (error.code === '42703' || error.message?.includes('main_category'))) {
    const fallback = await supabase
      .from("stores")
      .select("id, name, category, merchant_id, zone_id, address_line1, city, country, status, is_open, opens_at, closes_at, rating, cover_url, logo_url, description")
      .eq("status", "active");
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Error fetching all stores:", error);
    return [];
  }
  return ((data as Store[]) || []).map(s => ({
    ...s,
    main_category: (s as any).main_category || mapLegacyCategoryToMain(s.category)
  }));
};

export const getStoresByCategory = async (category: string): Promise<Store[]> => {
  let { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active")
    .or(`main_category.eq.${category},category.eq.${category}`);

  if (error && (error.code === '42703' || error.message?.includes('main_category'))) {
    const fallback = await supabase
      .from("stores")
      .select("*")
      .eq("status", "active")
      .eq("category", category);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Error fetching stores by category:", error);
    return [];
  }
  return ((data as Store[]) || []).map(s => ({
    ...s,
    main_category: (s as any).main_category || mapLegacyCategoryToMain(s.category)
  }));
};

export const searchStores = async (query: string): Promise<Store[]> => {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active")
    .ilike("name", `%${query}%`);

  if (error) {
    console.error("Error searching stores:", error);
    return [];
  }
  return data as Store[];
};

export const updateStore = async (storeId: string, updates: Partial<Store> & { category?: string; category_id?: string; subcategory_id?: string }): Promise<Store | null> => {
  if (!storeId || !isValidUUID(storeId)) {
    return null;
  }

  const payload: any = { ...updates };
  if (payload.category && !payload.main_category && !payload.category_id) {
    payload.main_category = mapLegacyCategoryToMain(payload.category);
  }

  const { data, error } = await supabase
    .from("stores")
    .update(payload)
    .eq("id", storeId)
    .select()
    .single();

  if (error) {
    console.error("Error updating store:", error);
    return null;
  }
  return data as Store;
};

export const createStore = async (
  merchantId: string,
  data: {
    name: string;
    category: string;
    main_category?: string;
    sub_category?: string;
    category_id?: string;
    subcategory_id?: string;
    tags?: string[];
    badges?: string[];
    address_line1: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<Store | null> => {
  if (!merchantId || !isValidUUID(merchantId)) return null;

  const payload: any = {
    merchant_id: merchantId,
    name: data.name,
    category: data.category,
    main_category: data.main_category || mapLegacyCategoryToMain(data.category),
    sub_category: data.sub_category || null,
    tags: data.tags || [],
    badges: data.badges || [],
    address_line1: data.address_line1,
    city: data.city || "عين الصفراء",
    country: data.country || "Algeria",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    status: "pending",
    is_open: false,
  };
  if (data.category_id) payload.category_id = data.category_id;
  if (data.subcategory_id) payload.subcategory_id = data.subcategory_id;

  const { data: created, error } = await supabase
    .from("stores")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating store:", error);
    return null;
  }
  return created as Store;
};

export const getStoreGalleryImages = async (storeId: string): Promise<string[]> => {
  if (!storeId || !isValidUUID(storeId)) {
    return [];
  }

  const { data, error } = await supabase.storage.from("store_images").list(`store_gallery/${storeId}`, { sortBy: { column: "name", order: "asc" } });

  if (error) {
    console.error("Error listing store gallery images:", error);
    return [];
  }

  const imageUrls = data.map((file) => {
    const { data: publicUrlData } = supabase.storage.from("store_images").getPublicUrl(`store_gallery/${file.name}`);
    return publicUrlData.publicUrl;
  });

  return imageUrls;
};

// ============================================================================
// Store Gallery DB-backed CRUD
// ============================================================================

export const getStoreGallery = async (storeId: string): Promise<StoreGalleryImage[]> => {
  if (!storeId || !isValidUUID(storeId)) return [];
  const { data, error } = await supabase
    .from("store_gallery")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) { console.error("Error fetching store gallery:", error); return []; }
  return data as StoreGalleryImage[];
};

export const addStoreGalleryImage = async (storeId: string, imageUrl: string, title?: string | null, caption?: string | null): Promise<StoreGalleryImage> => {
  const { data, error } = await supabase
    .from("store_gallery")
    .insert({ store_id: storeId, image_url: imageUrl, title: title ?? null, caption: caption ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message || "فشل إضافة الصورة");
  return data as StoreGalleryImage;
};

export const updateStoreGalleryImage = async (id: string, updates: { title?: string | null; caption?: string | null; is_visible?: boolean; sort_order?: number }): Promise<StoreGalleryImage> => {
  const { data, error } = await supabase
    .from("store_gallery")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message || "فشل تحديث الصورة");
  return data as StoreGalleryImage;
};

export const deleteStoreGalleryImage = async (id: string): Promise<void> => {
  const { error } = await supabase.from("store_gallery").delete().eq("id", id);
  if (error) throw new Error(error.message || "فشل حذف الصورة");
};

// ============================================================================
// Store Videos DB-backed CRUD
// ============================================================================

export const getStoreVideos = async (storeId: string): Promise<StoreVideo[]> => {
  if (!storeId || !isValidUUID(storeId)) return [];
  const { data, error } = await supabase
    .from("store_videos")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });
  if (error) { console.error("Error fetching store videos:", error); return []; }
  return data as StoreVideo[];
};

export const addStoreVideo = async (storeId: string, url: string, title?: string | null, platform: string = "youtube"): Promise<StoreVideo> => {
  const { data, error } = await supabase
    .from("store_videos")
    .insert({ store_id: storeId, url, title: title ?? null, platform })
    .select()
    .single();
  if (error) throw new Error(error.message || "فشل إضافة الفيديو");
  return data as StoreVideo;
};

export const updateStoreVideo = async (id: string, updates: { title?: string | null; url?: string; platform?: string; is_visible?: boolean }): Promise<StoreVideo> => {
  const { data, error } = await supabase
    .from("store_videos")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message || "فشل تحديث الفيديو");
  return data as StoreVideo;
};

export const deleteStoreVideo = async (id: string): Promise<void> => {
  const { error } = await supabase.from("store_videos").delete().eq("id", id);
  if (error) throw new Error(error.message || "فشل حذف الفيديو");
};
