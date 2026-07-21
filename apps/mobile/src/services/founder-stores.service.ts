import { supabase } from "@/lib/supabase";

export interface FounderStore {
  id: string;
  merchant_id: string;
  zone_id: string;
  name: string;
  category: string;
  description: string | null;
  status: string;
  opens_at: string;
  closes_at: string;
  is_open: boolean;
  phone_number: string | null;
  address_line1: string | null;
  city: string | null;
  logo_url: string | null;
  cover_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_new: boolean;
  is_featured: boolean;
  show_on_home: boolean;
  created_at: string;
  updated_at: string;
  merchant?: {
    business_name: string;
    owner_full_name: string;
    phone: string;
  } | null;
}

export async function getFounderStores(
  search?: string,
  category?: string,
  status?: string,
  featured?: boolean,
  limit = 100
): Promise<FounderStore[]> {
  let q = supabase
    .from("stores")
    .select("*, merchant:merchants(business_name,owner_full_name,phone)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search?.trim()) q = q.or(`name.ilike.%${search.trim()}%,address_line1.ilike.%${search.trim()}%`);
  if (category && category !== "all") q = q.eq("category", category);
  if (status && status !== "all") q = q.eq("status", status);
  if (featured !== undefined) q = q.eq("is_featured", featured);

  const { data, error } = await q;
  if (error) console.error("getFounderStores:", error.message);
  return (data ?? []) as FounderStore[];
}

export async function getFounderStore(id: string): Promise<{ store: FounderStore | null; error: string | null }> {
  const { data, error } = await supabase
    .from("stores")
    .select("*, merchant:merchants(business_name,owner_full_name,phone)")
    .eq("id", id)
    .single();

  return {
    store: (data as FounderStore) ?? null,
    error: error?.message ?? null,
  };
}

export async function updateFounderStore(
  id: string,
  data: Partial<FounderStore>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("stores")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function setFounderStoreStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("stores")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function softDeleteFounderStore(id: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("stores")
    .update({ status: "suspended", updated_at: now })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function uploadStoreLogo(
  storeId: string,
  uri: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${storeId}/logo.${ext}`;
    const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    const { error: uploadError } = await supabase.storage
      .from("store_images")
      .upload(path, blob, { upsert: true, contentType });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = supabase.storage.from("store_images").getPublicUrl(path);
    return { url: urlData.publicUrl ?? null, error: null };
  } catch (e) {
    return { url: null, error: (e as Error).message };
  }
}

export async function uploadStoreCover(
  storeId: string,
  uri: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${storeId}/cover.${ext}`;
    const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    const { error: uploadError } = await supabase.storage
      .from("store_images")
      .upload(path, blob, { upsert: true, contentType });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = supabase.storage.from("store_images").getPublicUrl(path);
    return { url: urlData.publicUrl ?? null, error: null };
  } catch (e) {
    return { url: null, error: (e as Error).message };
  }
}
