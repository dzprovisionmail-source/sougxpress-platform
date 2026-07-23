
import { supabase } from "../lib/supabase";
import { Product, ProductImage } from "../types/schema-03-core";

export const getProductsByStoreForMerchant = async (storeId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching merchant products:", error);
    return [];
  }
  return data as Product[];
};

export const createProduct = async (input: {
  store_id: string;
  name: string;
  description?: string | null;
  price_minor: number;
  category?: string;
  stock_quantity?: number | null;
  image_url?: string | null;
  is_demo?: boolean;
}): Promise<Product | null> => {
  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id: input.store_id,
      name: input.name,
      description: input.description ?? null,
      price_minor: input.price_minor,
      category: input.category ?? "عام",
      stock_quantity: input.stock_quantity ?? 0,
      image_url: input.image_url ?? null,
      status: "active",
      is_demo: input.is_demo ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating product [code:", error.code, "]:", error.message, error.details, error.hint);
    return null;
  }
  return data as Product;
};

export const updateProduct = async (
  productId: string,
  updates: Partial<Pick<Product, "name" | "description" | "price_minor" | "category" | "stock_quantity" | "image_url" | "status">>
): Promise<Product | null> => {
  const { data, error } = await supabase
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    console.error("Error updating product:", error);
    return null;
  }
  return data as Product;
};

export const deleteProduct = async (productId: string): Promise<boolean> => {
  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    console.error("Error deleting product:", error);
    return false;
  }
  return true;
};

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
