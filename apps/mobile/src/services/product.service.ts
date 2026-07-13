
import { supabase } from "../lib/supabase";
import { Product, ProductImage } from "../types/schema-03-core";

export const getProduct = async (productId: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }
  return data as Product;
};

export const getProductsByStore = async (storeId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching products by store:", error);
    return [];
  }
  return data as Product[];
};

export const getProductImages = async (productId: string): Promise<ProductImage[]> => {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching product images:", error);
    return [];
  }
  return data as ProductImage[];
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .ilike("name", `%${query}%`);

  if (error) {
    console.error("Error searching products:", error);
    return [];
  }
  return data as Product[];
};
