
import { supabase } from "../lib/supabase";
import { Store, StoreGalleryImage, StoreVideo, StoreGalleryLike, StoreGalleryComment, StoreGalleryRating } from "../types/schema-03-core";
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

export const updateStore = async (storeId: string, updates: Partial<Store> & { category?: string; category_id?: string; subcategory_id?: string; zone_id?: string }): Promise<Store | null> => {
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
    zone_id?: string;
    neighborhood?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    phone_number?: string;
    opens_at?: string;
    closes_at?: string;
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
    zone_id: data.zone_id || null,
    neighborhood: data.neighborhood || null,
    country: data.country || "Algeria",
    latitude: data.latitude ?? null,
    longitude: data.longitude,
    description: data.description,
    phone_number: data.phone_number,
    opens_at: data.opens_at,
    closes_at: data.closes_at,
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

  // We list the base store_gallery folder and filter for files belonging to this store
  // This handles both new folder-based paths (store_gallery/ID/file) 
  // and legacy hyphenated paths (store_gallery/ID-timestamp.jpg)
  
  // First try the new folder-based structure (efficient)
  const { data: folderData, error: folderError } = await supabase.storage
    .from("store_images")
    .list(`store_gallery/${storeId}`, { sortBy: { column: "name", order: "asc" } });

  let imageUrls: string[] = [];

  if (!folderError && folderData && folderData.length > 0) {
    imageUrls = folderData.map((file) => {
      const { data: publicUrlData } = supabase.storage.from("store_images").getPublicUrl(`store_gallery/${storeId}/${file.name}`);
      return publicUrlData.publicUrl;
    });
  }

  // Also check for legacy hyphenated files in the root store_gallery folder
  const { data: rootData, error: rootError } = await supabase.storage
    .from("store_images")
    .list("store_gallery", { sortBy: { column: "name", order: "asc" } });

  if (!rootError && rootData) {
    const legacyFiles = rootData.filter(file => file.name.startsWith(`${storeId}-`));
    const legacyUrls = legacyFiles.map((file) => {
      const { data: publicUrlData } = supabase.storage.from("store_images").getPublicUrl(`store_gallery/${file.name}`);
      return publicUrlData.publicUrl;
    });
    imageUrls = [...imageUrls, ...legacyUrls];
  }

  return imageUrls;
};

export const getStoreSubcategories = async (storeId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("store_subcategories_map")
    .select("subcategory_id")
    .eq("store_id", storeId);
  if (error) return [];
  return data.map(d => d.subcategory_id);
};

export const updateStoreSubcategories = async (storeId: string, subcategoryIds: string[]): Promise<void> => {
  await supabase.from("store_subcategories_map").delete().eq("store_id", storeId);
  if (subcategoryIds.length > 0) {
    await supabase.from("store_subcategories_map").insert(
      subcategoryIds.map(id => ({ store_id: storeId, subcategory_id: id }))
    );
  }
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

// ============================================================================
// Store Gallery Likes & Comments
// ============================================================================

export const getGalleryLikeCount = async (imageId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from("store_gallery_likes")
      .select("*", { count: "exact", head: true })
      .eq("gallery_image_id", imageId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
};

export const getUserGalleryLike = async (
  imageId: string,
  userId: string
): Promise<StoreGalleryLike | null> => {
  try {
    const { data, error } = await supabase
      .from("store_gallery_likes")
      .select("*")
      .eq("gallery_image_id", imageId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return null;
    return (data ?? null) as StoreGalleryLike | null;
  } catch {
    return null;
  }
};

export const toggleGalleryLike = async (
  imageId: string,
  userId: string
): Promise<boolean> => {
  try {
    const existing = await getUserGalleryLike(imageId, userId);
    if (existing) {
      const { error } = await supabase
        .from("store_gallery_likes")
        .delete()
        .eq("id", existing.id);
      if (error) return false;
      return false;
    } else {
      const { error } = await supabase.from("store_gallery_likes").insert({
        gallery_image_id: imageId,
        user_id: userId,
      });
      if (error) return false;
      return true;
    }
  } catch {
    return false;
  }
};

export interface GalleryCommentWithAuthor extends StoreGalleryComment {
  user_name: string;
  user_avatar_url: string | null;
}

export const getGalleryComments = async (imageId: string): Promise<GalleryCommentWithAuthor[]> => {
  try {
    const { data, error } = await supabase
      .from("store_gallery_comments")
      .select("*")
      .eq("gallery_image_id", imageId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []) as GalleryCommentWithAuthor[];
  } catch {
    return [];
  }
};

export async function getUserDisplayInfo(userId: string): Promise<{ name: string; avatarUrl: string | null }> {
  try {
    // 1. Check profiles table first
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, name, avatar_url, role")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      const name = profile.full_name || profile.name;
      if (name) {
        return { name, avatarUrl: profile.avatar_url || null };
      }
    }

    const role = profile?.role;

    // 2. Check role-specific tables
    if (role === 'customer' || !role) {
      const { data: customer } = await supabase
        .from("customers")
        .select("full_name, first_name, last_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (customer) {
        const name = customer.full_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ");
        if (name) return { name, avatarUrl: customer.avatar_url || null };
      }
    }

    if (role === 'merchant') {
      const { data: merchant } = await supabase
        .from("merchants")
        .select("full_name, name, business_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (merchant) {
        const name = merchant.full_name || merchant.name || merchant.business_name;
        if (name) return { name, avatarUrl: merchant.avatar_url || null };
      }
    }

    if (role === 'driver' || role === 'courier') {
      const { data: driver } = await supabase
        .from("drivers")
        .select("full_name, name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (driver) {
        const name = driver.full_name || driver.name;
        if (name) return { name, avatarUrl: driver.avatar_url || null };
      }
    }

    // Direct fallbacks across tables
    const { data: cust } = await supabase.from("customers").select("full_name, avatar_url").eq("id", userId).maybeSingle();
    if (cust?.full_name) return { name: cust.full_name, avatarUrl: cust.avatar_url || null };

    const { data: merc } = await supabase.from("merchants").select("full_name, business_name, avatar_url").eq("id", userId).maybeSingle();
    if (merc?.full_name || merc?.business_name) return { name: merc.full_name || merc.business_name || "", avatarUrl: merc.avatar_url || null };

    const { data: driv } = await supabase.from("drivers").select("full_name, avatar_url").eq("id", userId).maybeSingle();
    if (driv?.full_name) return { name: driv.full_name, avatarUrl: driv.avatar_url || null };

    return { name: "مستخدم", avatarUrl: null };
  } catch {
    return { name: "مستخدم", avatarUrl: null };
  }
}

export const addGalleryComment = async (
  imageId: string,
  userId: string,
  content: string
): Promise<GalleryCommentWithAuthor | null> => {
  try {
    const { name, avatarUrl } = await getUserDisplayInfo(userId);
    const { data, error } = await supabase
      .from("store_gallery_comments")
      .insert({
        gallery_image_id: imageId,
        user_id: userId,
        user_name: name || "مستخدم",
        user_avatar_url: avatarUrl,
        content: content.trim(),
      })
      .select()
      .single();
    if (error) return null;
    return data as GalleryCommentWithAuthor;
  } catch {
    return null;
  }
};

export const deleteGalleryComment = async (commentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("store_gallery_comments").delete().eq("id", commentId);
    return !error;
  } catch {
    return false;
  }
};

export const getGalleryRating = async (imageId: string): Promise<{ average: number; count: number }> => {
  try {
    const { data, error } = await supabase
      .from("store_gallery_ratings")
      .select("rating")
      .eq("gallery_image_id", imageId);
    if (error || !data) return { average: 0, count: 0 };
    const ratings = (data ?? []) as Pick<StoreGalleryRating, "rating">[];
    if (ratings.length === 0) return { average: 0, count: 0 };
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / ratings.length, count: ratings.length };
  } catch {
    return { average: 0, count: 0 };
  }
};

export const getUserGalleryRating = async (imageId: string, userId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from("store_gallery_ratings")
      .select("rating")
      .eq("gallery_image_id", imageId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return null;
    return data?.rating ?? null;
  } catch {
    return null;
  }
};

export const rateGalleryItem = async (imageId: string, userId: string, rating: number): Promise<boolean> => {
  try {
    const { error } = await supabase.from("store_gallery_ratings").upsert(
      { gallery_image_id: imageId, user_id: userId, rating },
      { onConflict: "gallery_image_id,user_id" }
    );
    return !error;
  } catch {
    return false;
  }
};

export const getStoresByMerchantId = async (merchantId: string): Promise<Store[]> => {
  if (!merchantId || !isValidUUID(merchantId)) {
    return [];
  }

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("merchant_id", merchantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching stores by merchant:", error);
    return [];
  }
  return (data as Store[]) || [];
};
