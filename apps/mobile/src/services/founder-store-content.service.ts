import { supabase } from "@/lib/supabase";
import { FounderStore } from "./founder-stores.service";
import { StoreGalleryImage, StoreVideo, ProductStatus } from "@/types/schema-03-core";
import {
  getStoreGallery,
  addStoreGalleryImage,
  updateStoreGalleryImage,
  deleteStoreGalleryImage,
  getStoreVideos,
  addStoreVideo,
  updateStoreVideo,
  deleteStoreVideo,
} from "@/services/store.service";
import {
  getProductsByStoreForMerchant,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/services/product.service";

// ============================================================================
// Gallery
// ============================================================================

export async function getFounderStoreGallery(storeId: string): Promise<StoreGalleryImage[]> {
  return getStoreGallery(storeId);
}

export async function addFounderGalleryImage(
  storeId: string,
  imageUrl: string,
  title?: string | null
): Promise<{ image: StoreGalleryImage | null; error: string | null }> {
  const image = await addStoreGalleryImage(storeId, imageUrl, title);
  return { image, error: image ? null : "فشل إضافة الصورة" };
}

export async function updateFounderGalleryImage(
  id: string,
  data: { title?: string | null; is_visible?: boolean; sort_order?: number }
): Promise<{ image: StoreGalleryImage | null; error: string | null }> {
  const image = await updateStoreGalleryImage(id, data);
  return { image, error: image ? null : "فشل تحديث الصورة" };
}

export async function deleteFounderGalleryImage(id: string): Promise<{ error: string | null }> {
  const ok = await deleteStoreGalleryImage(id);
  return { error: ok ? null : "فشل حذف الصورة" };
}

// ============================================================================
// Videos
// ============================================================================

export async function getFounderStoreVideos(storeId: string): Promise<StoreVideo[]> {
  return getStoreVideos(storeId);
}

export async function addFounderVideo(
  storeId: string,
  url: string,
  title?: string | null,
  platform: string = "youtube"
): Promise<{ video: StoreVideo | null; error: string | null }> {
  const video = await addStoreVideo(storeId, url, title, platform);
  return { video, error: video ? null : "فشل إضافة الفيديو" };
}

export async function updateFounderVideo(
  id: string,
  data: { title?: string | null; url?: string; platform?: string; is_visible?: boolean }
): Promise<{ video: StoreVideo | null; error: string | null }> {
  const video = await updateStoreVideo(id, data);
  return { video, error: video ? null : "فشل تحديث الفيديو" };
}

export async function deleteFounderVideo(id: string): Promise<{ error: string | null }> {
  const ok = await deleteStoreVideo(id);
  return { error: ok ? null : "فشل حذف الفيديو" };
}

// ============================================================================
// Products (simple CRUD for founder demo store content)
// ============================================================================

export async function getFounderStoreProducts(storeId: string) {
  return getProductsByStoreForMerchant(storeId);
}

export async function addFounderProduct(storeId: string, input: {
  name: string;
  price_minor?: number;
  image_url?: string | null;
  is_demo?: boolean;
}): Promise<{ product: unknown | null; error: string | null }> {
  const product = await createProduct({
    store_id: storeId,
    name: input.name,
    price_minor: input.price_minor ?? 0,
    image_url: input.image_url ?? null,
    is_demo: input.is_demo ?? true,
  });
  return { product, error: product ? null : "فشل إضافة المنتج" };
}

export async function updateFounderProduct(
  productId: string,
  updates: { name?: string; price_minor?: number; image_url?: string | null; status?: string }
): Promise<{ product: unknown | null; error: string | null }> {
  const product = await updateProduct(productId, updates);
  return { product, error: product ? null : "فشل تحديث المنتج" };
}

export async function deleteFounderProduct(productId: string): Promise<{ error: string | null }> {
  const ok = await deleteProduct(productId);
  return { error: ok ? null : "فشل حذف المنتج" };
}
