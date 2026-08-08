import { supabase } from "@/lib/supabase";
import { Courier, CourierServiceResponse } from "@/types/schema-04-couriers";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FounderCourier extends Courier {
  is_verified: boolean;
  is_pinned: boolean;
  display_order: number;
  show_on_home: boolean;
}

export interface FounderCourierListParams {
  search?: string;
  status_filter?: "all" | "available" | "unavailable" | "demo" | "verified" | "pinned" | "hidden";
  include_inactive?: boolean;
  limit?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function invokeCourierManagement(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<CourierServiceResponse<Record<string, unknown>>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "admin-manage-couriers",
      { body: { action, payload } }
    );

    if (error) return { data: null, error: error.message };
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (obj.success === false && typeof obj.error === "string") {
        return { data: null, error: obj.error };
      }
      if (obj.success === true) {
        return { data: obj as Record<string, unknown>, error: null };
      }
    }
    return { data: data as Record<string, unknown> | null, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────

export async function getCourierById(
  id: string
): Promise<CourierServiceResponse<FounderCourier>> {
  try {
    const { data, error } = await supabase
      .from("couriers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return { data: data as FounderCourier, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "فشل جلب بيانات الموصل" };
  }
}

// ─── List ─────────────────────────────────────────────────────────────

export async function getFounderCouriers(
  params: FounderCourierListParams = {}
): Promise<CourierServiceResponse<FounderCourier[]>> {
  const result = await invokeCourierManagement("list", {
    search: params.search,
    status_filter: params.status_filter ?? "all",
    include_inactive: params.include_inactive ?? false,
    limit: params.limit ?? 100,
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }

  const data = (result.data as Record<string, unknown>).data as FounderCourier[] | null;
  return { data: data ?? [], error: null };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateFounderCourierParams {
  full_name: string;
  phone_number: string;
  bio?: string;
  vehicle_type?: string;
  rating?: number;
  is_available?: boolean;
  is_mock?: boolean;
  is_verified?: boolean;
  is_pinned?: boolean;
  display_order?: number;
  show_on_home?: boolean;
  avatar_url?: string | null;
  vehicle_photo_url?: string | null;
  create_auth_account?: boolean;
  email?: string;
  password?: string;
  user_id?: string;
}

export async function createFounderCourier(
  params: CreateFounderCourierParams
): Promise<CourierServiceResponse<FounderCourier>> {
  const result = await invokeCourierManagement("create", params as unknown as Record<string, unknown>);
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: (result.data as Record<string, unknown>).data as FounderCourier, error: null };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateFounderCourier(
  id: string,
  updates: Partial<FounderCourier>
): Promise<CourierServiceResponse<FounderCourier>> {
  const result = await invokeCourierManagement("update", { id, ...updates });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: (result.data as Record<string, unknown>).data as FounderCourier, error: null };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFounderCourier(
  id: string
): Promise<CourierServiceResponse<null>> {
  const result = await invokeCourierManagement("delete", { id });
  return { data: null, error: result.error };
}

// ─── Toggles ──────────────────────────────────────────────────────────────────

export async function toggleFounderCourierAvailability(
  id: string
): Promise<CourierServiceResponse<{ toggled: boolean }>> {
  const result = await invokeCourierManagement("toggle_availability", { id });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: { toggled: (result.data as Record<string, unknown>).toggled as boolean }, error: null };
}

export async function toggleFounderCourierVerified(
  id: string
): Promise<CourierServiceResponse<{ toggled: boolean }>> {
  const result = await invokeCourierManagement("toggle_verified", { id });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: { toggled: (result.data as Record<string, unknown>).toggled as boolean }, error: null };
}

export async function toggleFounderCourierDemo(
  id: string
): Promise<CourierServiceResponse<{ toggled: boolean }>> {
  const result = await invokeCourierManagement("toggle_demo", { id });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: { toggled: (result.data as Record<string, unknown>).toggled as boolean }, error: null };
}

export async function toggleFounderCourierPinned(
  id: string
): Promise<CourierServiceResponse<{ toggled: boolean }>> {
  const result = await invokeCourierManagement("toggle_pinned", { id });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: { toggled: (result.data as Record<string, unknown>).toggled as boolean }, error: null };
}

export async function toggleFounderCourierHomeVisibility(
  id: string
): Promise<CourierServiceResponse<{ toggled: boolean }>> {
  const result = await invokeCourierManagement("toggle_home_visibility", { id });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: { toggled: (result.data as Record<string, unknown>).toggled as boolean }, error: null };
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

export async function reorderFounderCourier(
  id: string,
  display_order: number
): Promise<CourierServiceResponse<FounderCourier>> {
  const result = await invokeCourierManagement("reorder", { id, display_order });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: (result.data as Record<string, unknown>).data as FounderCourier, error: null };
}
