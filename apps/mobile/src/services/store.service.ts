
import { supabase } from "../lib/supabase";
import { Store } from "../types/schema-03-core";

export const getStore = async (storeId: string): Promise<Store | null> => {
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

export const getStoreGalleryImages = async (storeId: string): Promise<string[]> => {
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
