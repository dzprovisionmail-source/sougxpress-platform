
import { supabase } from "../lib/supabase";
import { Store, StoreGalleryImage, StoreVideo } from "../types/schema-03-core";

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
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active");

  if (error) {
    console.error("Error fetching all stores:", error);
    return [];
  }
  return data as Store[];
};

export const getStoresByCategory = async (category: string): Promise<Store[]> => {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active")
    .eq("category", category);

  if (error) {
    console.error("Error fetching stores by category:", error);
    return [];
  }
  return data as Store[];
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

export const updateStore = async (storeId: string, updates: Partial<Store>): Promise<Store | null> => {
  if (!storeId || !isValidUUID(storeId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("stores")
    .update(updates)
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
    address_line1: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<Store | null> => {
  if (!merchantId || !isValidUUID(merchantId)) return null;

  const { data: created, error } = await supabase
    .from("stores")
    .insert({
      merchant_id: merchantId,
      name: data.name,
      category: data.category,
      address_line1: data.address_line1,
      city: data.city || "عين الصفراء",
      country: data.country || "Algeria",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      // RLS requires status = 'pending' for merchant self-insert
      status: "pending",
      is_open: false,
    })
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
// Helpers
// ============================================================================

export const detectVideoPlatform = (url: string): string => {
  const lower = url.toLowerCase();
  if (lower.includes("facebook.com") || lower.includes("fb.watch")) return "facebook";
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("instagram.com") || lower.includes("instagr.am")) return "instagram";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  return "youtube";
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

export const addStoreGalleryImage = async (storeId: string, imageUrl: string, title?: string | null): Promise<StoreGalleryImage> => {
  const { data, error } = await supabase
    .from("store_gallery")
    .insert({ store_id: storeId, image_url: imageUrl, title: title ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message || "فشل إضافة الصورة");
  return data as StoreGalleryImage;
};

export const updateStoreGalleryImage = async (id: string, updates: { title?: string | null; is_visible?: boolean; sort_order?: number }): Promise<StoreGalleryImage> => {
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

export const addStoreVideo = async (storeId: string, url: string, title?: string | null, platform?: string): Promise<StoreVideo> => {
  const detectedPlatform = platform ?? detectVideoPlatform(url);
  const { data, error } = await supabase
    .from("store_videos")
    .insert({ store_id: storeId, url, title: title ?? null, platform: detectedPlatform })
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

// ============================================================================
// Facebook-specific video methods (Phase 1D-FB)
// ============================================================================

export const getFacebookVideosForStore = async (storeId: string): Promise<StoreVideo[]> => {
  if (!storeId || !isValidUUID(storeId)) return [];
  const { data, error } = await supabase
    .from("store_videos")
    .select("*")
    .eq("store_id", storeId)
    .eq("provider", "facebook")
    .eq("can_embed", true)
    .not("embed_url", "is", null)
    .order("created_at", { ascending: true });
  if (error) { console.error("Error fetching Facebook videos:", error); return []; }
  return (data ?? []) as StoreVideo[];
};

export const addFacebookVideo = async (
  storeId: string,
  url: string,
  title?: string | null
): Promise<{ video: StoreVideo | null; error: string | null }> => {
  try {
    // Call the facebook-video-meta edge function
    const { data: meta, error: metaErr } = await supabase.functions.invoke("facebook-video-meta", {
      body: { url },
    });

    if (metaErr || !meta?.ok) {
      return {
        video: null,
        error: "هذا الفيديو خاص أو غير قابل للعرض داخل السوق. يرجى استعمال رابط فيديو فيسبوك عام.",
      };
    }

    const { provider, normalized_url, embed_url, embed_html, thumbnail_url } = meta as {
      provider: string;
      normalized_url: string;
      embed_url: string;
      embed_html: string | null;
      thumbnail_url: string | null;
    };

    const { data: video, error: insertErr } = await supabase
      .from("store_videos")
      .insert({
        store_id: storeId,
        title: title ?? meta.title ?? null,
        url,
        provider,
        normalized_url,
        embed_url,
        embed_html,
        thumbnail_url,
        can_embed: true,
        meta_checked_at: new Date().toISOString(),
        platform: "facebook",
        is_visible: true,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    return { video: video as StoreVideo, error: null };
  } catch (e: any) {
    console.error("addFacebookVideo error:", e);
    return {
      video: null,
      error: e.message || "هذا الفيديو خاص أو غير قابل للعرض داخل السوق. يرجى استعمال رابط فيديو فيسبوك عام.",
    };
  }
};
