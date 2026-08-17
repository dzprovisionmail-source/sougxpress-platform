import { supabase } from "@/lib/supabase";
import {
  Courier,
  CourierWithFavorite,
  CourierServiceResponse,
  VehicleType,
} from "@/types/schema-04-couriers";
import { VEHICLE_LABELS, mapVehicleType } from "@/utils/courier.utils";

const VALID_VEHICLE_TYPES: VehicleType[] = [
  "motorcycle",
  "car",
  "van",
  "bicycle",
  "truck",
];

export interface CourierProfileUpdate {
  full_name?: string;
  phone_number?: string;
  bio?: string;
  avatar_url?: string | null;
  vehicle_type?: VehicleType;
  vehicle_photo_url?: string | null;
  rating?: number;
  is_available?: boolean;
  availability?: string;
}

/**
 * Maps a database driver row to the standard Courier interface.
 */
function mapDriverRowToCourier(row: any): Courier {
  return {
    id: row.id,
    user_id: row.user_id ?? row.id,
    full_name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "موصل Soug-XPRESS",
    phone_number: row.phone_number || row.phone || "",
    bio: row.bio || `موصل معتمد في ${row.neighborhood || row.city || "عين صفراء"}`,
    avatar_url: row.avatar_url || null,
    vehicle_type: mapVehicleType(row.vehicle_type) as VehicleType,
    vehicle_photo_url: row.vehicle_photo_url || null,
    rating: Number(row.rating) || 5.0,
    is_available: row.availability === "online" || row.is_available === true,
    is_mock: row.is_demo === true,
    is_verified: row.status === "active",
    is_pinned: false,
    display_order: 0,
    show_on_home: row.status === "active" && (row.availability === "online" || row.is_available === true),
    created_at: row.created_at || new Date().toISOString(),
  };
}

/**
 * Fetches all active & online couriers from the authoritative `drivers` table,
 * ordered by rating descending.
 */
export const getAvailableCouriers = async (
  userId?: string
): Promise<CourierServiceResponse<CourierWithFavorite[]>> => {
  try {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("status", "active")
      .eq("is_suspended_for_debt", false)
      .order("rating", { ascending: false });

    if (error) throw error;

    const rawRows = data ?? [];
    const couriers = rawRows
      .filter((r) => r.availability === "online" || r.is_available === true)
      .map(mapDriverRowToCourier);

    if (!userId) {
      return { data: couriers.map((c) => ({ ...c, is_favorite: false })), error: null };
    }

    const courierIds = couriers.map((c) => c.id);
    if (courierIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: favRows, error: favError } = await supabase
      .from("favorite_couriers")
      .select("courier_id")
      .eq("user_id", userId)
      .in("courier_id", courierIds);

    if (favError && favError.code !== "PGRST116") {
      console.warn("getAvailableCouriers favorite lookup failed:", favError);
    }

    const favoriteIds = new Set((favRows ?? []).map((r) => r.courier_id));

    return {
      data: couriers.map((c) => ({ ...c, is_favorite: favoriteIds.has(c.id) })),
      error: null,
    };
  } catch (err: any) {
    console.error("getAvailableCouriers failed:", err);
    return { data: null, error: err?.message ?? "فشل جلب قائمة الموصلين" };
  }
};

/**
 * Retrieves full courier details by ID from `drivers` table.
 */
export const getCourierById = async (
  courierId: string
): Promise<CourierServiceResponse<CourierWithFavorite>> => {
  try {
    const { data: row, error: courierError } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", courierId)
      .single();

    if (courierError) throw courierError;
    if (!row) return { data: null, error: "لم يتم العثور على الموصل" };

    const courier = mapDriverRowToCourier(row);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    let is_favorite = false;
    if (userId && !userError) {
      const { data: favRow, error: favError } = await supabase
        .from("favorite_couriers")
        .select("id")
        .eq("user_id", userId)
        .eq("courier_id", courierId)
        .maybeSingle();

      if (favError && favError.code !== "PGRST116") {
        console.warn("getCourierById favorite lookup failed:", favError);
      }
      is_favorite = !!favRow;
    }

    return {
      data: { ...courier, is_favorite } as CourierWithFavorite,
      error: null,
    };
  } catch (err: any) {
    console.error("getCourierById failed:", err);
    return { data: null, error: err?.message ?? "فشل جلب تفاصيل الموصل" };
  }
};

/**
 * Updates a driver/courier profile in the `drivers` table.
 */
export const updateCourierProfile = async (
  courierId: string,
  payload: CourierProfileUpdate
): Promise<CourierServiceResponse<Courier>> => {
  try {
    if (payload.bio !== undefined && payload.bio.length > 160) {
      return {
        data: null,
        error: "السيرة الذاتية يجب أن تكون 160 حرفًا أو أقل",
      };
    }

    if (
      payload.vehicle_type &&
      !VALID_VEHICLE_TYPES.includes(payload.vehicle_type)
    ) {
      return { data: null, error: "نوع المركبة غير صالح" };
    }

    const dbPayload: any = { ...payload };
    if (payload.is_available !== undefined) {
      dbPayload.availability = payload.is_available ? "online" : "offline";
    }

    const { data, error } = await supabase
      .from("drivers")
      .update(dbPayload)
      .eq("id", courierId)
      .select()
      .single();

    if (error) throw error;

    return { data: data ? mapDriverRowToCourier(data) : null, error: null };
  } catch (err: any) {
    console.error("updateCourierProfile failed:", err);
    return { data: null, error: err?.message ?? "فشل تحديث ملف الموصل" };
  }
};

/**
 * Toggles a courier in the current user's favorites list (idempotent).
 */
export const toggleFavoriteCourier = async (
  userId: string,
  courierId: string
): Promise<CourierServiceResponse<{ is_favorite: boolean }>> => {
  try {
    const { data: existing, error: lookupError } = await supabase
      .from("favorite_couriers")
      .select("id")
      .eq("user_id", userId)
      .eq("courier_id", courierId)
      .maybeSingle();

    if (lookupError && lookupError.code !== "PGRST116") {
      throw lookupError;
    }

    if (existing) {
      const { error: deleteError } = await supabase
        .from("favorite_couriers")
        .delete()
        .eq("user_id", userId)
        .eq("courier_id", courierId);

      if (deleteError) throw deleteError;
      return { data: { is_favorite: false }, error: null };
    }

    // Check count before insert (Limit: 10)
    const { count, error: countError } = await supabase
      .from("favorite_couriers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) throw countError;
    if (count !== null && count >= 10) {
      return { data: null, error: "لا يمكنك إضافة أكثر من 10 موصلين مفضلين (الحد الأقصى: 10)" };
    }

    const { error: insertError } = await supabase
      .from("favorite_couriers")
      .insert({ user_id: userId, courier_id: courierId });

    if (insertError) throw insertError;
    return { data: { is_favorite: true }, error: null };
  } catch (err: any) {
    console.error("toggleFavoriteCourier failed:", err);
    return { data: null, error: err?.message ?? "فشل تحديث المفضلة" };
  }
};

export interface UploadedCourierImage {
  path: string;
  publicUrl: string;
}

const COURIER_BUCKET = "courier-assets";

const uuid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const uploadCourierImage = async (
  file: File | Blob,
  pathFolder: string
): Promise<CourierServiceResponse<UploadedCourierImage>> => {
  try {
    if (!file) {
      return { data: null, error: "لم يتم توفير الملف" };
    }

    const folder = (pathFolder || "courier-images").replace(/^\/+|\/+$/g, "");
    const name =
      (file as File).name ||
      `${uuid()}.${inferExtension(file)}`;
    const path = `${folder}/${name}`;

    const { data: uploaded, error: uploadError } = await supabase.storage
      .from(COURIER_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;
    if (!uploaded?.path) {
      return { data: null, error: "فشل رفع الصورة" };
    }

    const { data: urlData } = supabase.storage
      .from(COURIER_BUCKET)
      .getPublicUrl(uploaded.path);

    return {
      data: { path: uploaded.path, publicUrl: urlData?.publicUrl ?? "" },
      error: null,
    };
  } catch (err: any) {
    console.error("uploadCourierImage failed:", err);
    return { data: null, error: err?.message ?? "فشل رفع الصورة" };
  }
};

function inferExtension(file: File | Blob): string {
  const mime = file.type ?? "";
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] ?? "jpg";
}

export const getCourierByUserId = async (
  userId: string
): Promise<CourierServiceResponse<Courier | null>> => {
  try {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    return { data: data ? mapDriverRowToCourier(data) : null, error: null };
  } catch (err: any) {
    console.error("getCourierByUserId failed:", err);
    return { data: null, error: err?.message ?? "فشل جلب بيانات الموصل" };
  }
};

export { mapVehicleType, vehicleLabel } from "@/utils/courier.utils";
