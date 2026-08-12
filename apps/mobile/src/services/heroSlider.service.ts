import { supabase } from "@/lib/supabase";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  content_type: 'product' | 'store' | 'promotion' | 'custom' | 'internal';
  target_id?: string | null;
  target_store_id?: string | null;
  target_product_id?: string | null;
  cta_label?: string | null;
  is_active: boolean;
  display_order: number;
  priority: number;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch active and valid hero slides for the public/customer/guest marketplace.
 */
export async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("market_hero_slides")
      .select("*")
      .eq("is_active", true)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order("priority", { ascending: false })
      .order("display_order", { ascending: true });

    if (error) {
      console.error("getActiveHeroSlides error:", error.message);
      return [];
    }
    return (data as HeroSlide[]) || [];
  } catch (err) {
    console.error("getActiveHeroSlides exception:", err);
    return [];
  }
}

/**
 * Fetch all hero slides for Founder management.
 */
export async function getFounderHeroSlides(): Promise<HeroSlide[]> {
  try {
    const { data, error } = await supabase
      .from("market_hero_slides")
      .select("*")
      .order("priority", { ascending: false })
      .order("display_order", { ascending: true });

    if (error) {
      console.error("getFounderHeroSlides error:", error.message);
      return [];
    }
    return (data as HeroSlide[]) || [];
  } catch (err) {
    console.error("getFounderHeroSlides exception:", err);
    return [];
  }
}

/**
 * Create a new hero slide.
 */
export async function createHeroSlide(slide: Omit<HeroSlide, "id" | "created_at" | "updated_at">): Promise<{ success: boolean; data?: HeroSlide; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("market_hero_slides")
      .insert(slide)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as HeroSlide };
  } catch (err: any) {
    console.error("createHeroSlide error:", err);
    return { success: false, error: err.message || "تعذّر إنشاء شريحة العرض" };
  }
}

/**
 * Update an existing hero slide.
 */
export async function updateHeroSlide(id: string, updates: Partial<HeroSlide>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("market_hero_slides")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("updateHeroSlide error:", err);
    return { success: false, error: err.message || "تعذّر تحديث شريحة العرض" };
  }
}

/**
 * Delete a hero slide.
 */
export async function deleteHeroSlide(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("market_hero_slides")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("deleteHeroSlide error:", err);
    return { success: false, error: err.message || "تعذّر حذف شريحة العرض" };
  }
}

/**
 * Upload hero slide image to Supabase Storage (store_images bucket).
 */
export async function uploadHeroSlideImage(uri: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const ext = uri.split(".").pop()?.split("?")[0].toLowerCase() ?? "jpg";
    const fileName = `hero_slides/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    const { error: uploadError } = await supabase.storage
      .from("store_images")
      .upload(fileName, arrayBuffer, { contentType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("store_images")
      .getPublicUrl(fileName);

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    console.error("uploadHeroSlideImage error:", err);
    return { success: false, error: err.message || "فشل رفع الصورة" };
  }
}

export interface HeroSliderSettings {
  autoRotate: boolean;
  intervalSeconds: number;
}

export async function getHeroSliderSettings(): Promise<HeroSliderSettings> {
  try {
    const { data, error } = await supabase
      .from("platform_financial_settings")
      .select("key, value")
      .in("key", ["hero_auto_rotate", "hero_rotation_interval"]);

    if (error || !data) return { autoRotate: true, intervalSeconds: 3 };

    let autoRotate = true;
    let intervalSeconds = 3;

    data.forEach((row: any) => {
      if (row.key === "hero_auto_rotate") {
        if (typeof row.value === "boolean") autoRotate = row.value;
        else if (row.value === "false" || row.value === false) autoRotate = false;
      }
      if (row.key === "hero_rotation_interval") {
        const parsed = parseInt(String(row.value), 10);
        if (!isNaN(parsed) && parsed >= 1) intervalSeconds = parsed;
      }
    });

    return { autoRotate, intervalSeconds };
  } catch (err) {
    console.error("getHeroSliderSettings error:", err);
    return { autoRotate: true, intervalSeconds: 3 };
  }
}

export async function updateHeroSliderSettings(autoRotate: boolean, intervalSeconds: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: err1 } = await supabase
      .from("platform_financial_settings")
      .upsert({ key: "hero_auto_rotate", value: String(autoRotate), description: "Hero auto rotation enabled" }, { onConflict: "key" });
    if (err1) throw err1;

    const { error: err2 } = await supabase
      .from("platform_financial_settings")
      .upsert({ key: "hero_rotation_interval", value: String(intervalSeconds), description: "Hero rotation interval in seconds" }, { onConflict: "key" });
    if (err2) throw err2;

    return { success: true };
  } catch (err: any) {
    console.error("updateHeroSliderSettings error:", err);
    return { success: false, error: err.message || "تعذّر حفظ إعدادات العرض" };
  }
}
