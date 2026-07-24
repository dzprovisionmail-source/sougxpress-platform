import { supabase } from "@/lib/supabase";
import { FounderStore } from "./founder-stores.service";
import { StoreGalleryImage, StoreVideo, Product, ProductStatus } from "@/types/schema-03-core";
import {
  getStoreGallery,
  addStoreGalleryImage,
  updateStoreGalleryImage,
  deleteStoreGalleryImage,
  getStoreVideos,
  addStoreVideo,
  updateStoreVideo,
  deleteStoreVideo,
  getFacebookVideosForStore,
  addFacebookVideo,
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
  try {
    const image = await addStoreGalleryImage(storeId, imageUrl, title);
    return { image, error: null };
  } catch (e: any) {
    return { image: null, error: e.message || "فشل إضافة الصورة" };
  }
}

export async function updateFounderGalleryImage(
  id: string,
  data: { title?: string | null; is_visible?: boolean; sort_order?: number }
): Promise<{ image: StoreGalleryImage | null; error: string | null }> {
  try {
    const image = await updateStoreGalleryImage(id, data);
    return { image, error: null };
  } catch (e: any) {
    return { image: null, error: e.message || "فشل تحديث الصورة" };
  }
}

export async function deleteFounderGalleryImage(id: string): Promise<{ error: string | null }> {
  try {
    await deleteStoreGalleryImage(id);
    return { error: null };
  } catch (e: any) {
    return { error: e.message || "فشل حذف الصورة" };
  }
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
  platform?: string
): Promise<{ video: StoreVideo | null; error: string | null }> {
  try {
    const video = await addStoreVideo(storeId, url, title, platform);
    return { video, error: null };
  } catch (e: any) {
    console.error("addFounderVideo error:", e);
    return { video: null, error: e.message || "فشل إضافة الفيديو" };
  }
}

export async function updateFounderVideo(
  id: string,
  data: { title?: string | null; url?: string; platform?: string; is_visible?: boolean }
): Promise<{ video: StoreVideo | null; error: string | null }> {
  try {
    const video = await updateStoreVideo(id, data);
    return { video, error: null };
  } catch (e: any) {
    return { video: null, error: e.message || "فشل تحديث الفيديو" };
  }
}

export async function deleteFounderVideo(id: string): Promise<{ error: string | null }> {
  try {
    await deleteStoreVideo(id);
    return { error: null };
  } catch (e: any) {
    return { error: e.message || "فشل حذف الفيديو" };
  }
}

// ============================================================================
// Facebook Videos (Phase 1D-FB)
// ============================================================================

export async function getFounderStoreFacebookVideos(storeId: string): Promise<StoreVideo[]> {
  return getFacebookVideosForStore(storeId);
}

export async function addFounderFacebookVideo(
  storeId: string,
  url: string,
  title?: string | null
): Promise<{ video: StoreVideo | null; error: string | null }> {
  try {
    const result = await addFacebookVideo(storeId, url, title);
    return result;
  } catch (e: any) {
    console.error("addFounderFacebookVideo error:", e);
    return {
      video: null,
      error: "هذا الفيديو خاص أو غير قابل للعرض داخل السوق. يرجى استعمال رابط فيديو فيسبوك عام.",
    };
  }
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
}): Promise<{ product: Product | null; error: string | null }> {
  const product = await createProduct({
    store_id: storeId,
    name: input.name,
    price_minor: input.price_minor ?? 0,
    image_url: input.image_url ?? null,
    is_demo: input.is_demo ?? true,
    stock_quantity: 0,
    category: "عام",
  });
  if (!product) {
    console.error("addFounderProduct: createProduct returned null");
    return { product: null, error: "فشل إضافة المنتج — تحقق من البيانات المدخلة" };
  }
  return { product, error: null };
}

export async function updateFounderProduct(
  productId: string,
  updates: { name?: string; price_minor?: number; image_url?: string | null; status?: ProductStatus }
): Promise<{ product: unknown | null; error: string | null }> {
  const product = await updateProduct(productId, updates);
  return { product, error: product ? null : "فشل تحديث المنتج" };
}

export async function deleteFounderProduct(productId: string): Promise<{ error: string | null }> {
  const ok = await deleteProduct(productId);
  return { error: ok ? null : "فشل حذف المنتج" };
}
