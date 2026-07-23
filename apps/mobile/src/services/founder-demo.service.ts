import { supabase } from "@/lib/supabase";
import { adminProvisionAccount, type ProvisionAccountParams } from "@/services/admin.service";

export interface DemoStoreInput {
  name: string;
  category: string;
  zone_id?: string;
  address_line1?: string;
  city?: string;
  description?: string;
  logo_url?: string | null;
}

export interface CreateDemoStoreResult {
  storeId: string | null;
  merchantId: string | null;
  error: string | null;
}

export async function createDemoStore(
  founderId: string,
  input: DemoStoreInput
): Promise<CreateDemoStoreResult> {
  const trimmedName = input.name.trim();
  if (!trimmedName) return { storeId: null, merchantId: null, error: "اسم المتجر مطلوب" };
  if (!input.category) return { storeId: null, merchantId: null, error: "التصنيف مطلوب" };

  const merchantName = `متجر تجريبي ${trimmedName}`;
  const merchantPhone = `demo-${Date.now()}@local`;

  const { data: merchantData, error: merchantErr } =
    await adminProvisionAccount({
      role: "merchant",
      full_name: merchantName,
      phone: merchantPhone,
      business_name: merchantName,
      zone_id: input.zone_id,
      address: input.address_line1,
      is_demo: true,
    });

  if (merchantErr || !merchantData?.user_id) {
    return {
      storeId: null,
      merchantId: null,
      error: merchantErr ?? "فشل إنشاء التاجر التجريبي",
    };
  }

  const merchantId = String(merchantData.user_id);

  const storePayload: Record<string, unknown> = {
    name: trimmedName,
    category: input.category,
    merchant_id: merchantId,
    is_demo: true,
    created_by: founderId,
    status: "active",
    is_open: true,
    opens_at: "08:00:00",
    closes_at: "22:00:00",
  };

  if (input.zone_id?.trim()) storePayload.zone_id = input.zone_id.trim();
  if (input.address_line1?.trim()) storePayload.address_line1 = input.address_line1.trim();
  if (input.city?.trim()) storePayload.city = input.city.trim();
  if (input.description?.trim()) storePayload.description = input.description.trim();
  if (input.logo_url) storePayload.logo_url = input.logo_url;

  const { data: storeData, error: storeErr } = await supabase
    .from("stores")
    .insert(storePayload)
    .select("id")
    .single();

  if (storeErr || !storeData) {
    return {
      storeId: null,
      merchantId: merchantId || null,
      error: storeErr?.message ?? "فشل إنشاء المتجر",
    };
  }

  return {
    storeId: storeData.id as string,
    merchantId,
    error: null,
  };
}

export async function updateDemoStore(
  id: string,
  data: Record<string, unknown>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("stores")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_demo", true);

  return { error: error?.message ?? null };
}

export async function toggleDemoStoreStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("stores")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_demo", true);

  return { error: error?.message ?? null };
}

export async function softDeleteDemoStore(id: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("stores")
    .update({ status: "suspended", deleted_at: now, updated_at: now })
    .eq("id", id)
    .eq("is_demo", true);

  return { error: error?.message ?? null };
}

export async function getFounderDemoStores(
  search?: string,
  limit = 100
): Promise<Record<string, unknown>[]> {
  let q = supabase
    .from("stores")
    .select("id, name, category, status, zone_id, merchant_id, created_at, is_demo, deleted_at")
    .eq("is_demo", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search?.trim()) {
    q = q.or(`name.ilike.%${search.trim()}%,address_line1.ilike.%${search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) console.error("getFounderDemoStores:", error.message);
  return (data ?? []) as Record<string, unknown>[];
}
