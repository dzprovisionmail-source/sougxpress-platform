import { supabase } from "@/lib/supabase";
import { MoneyRequest, MoneyRequestStatus } from "@/types/schema-03b-addendum";

const TABLE = "money_requests";

/** Submit a new money request. The caller must own the user_id. */
export async function createMoneyRequest(
  userId: string,
  amount: number,
  reason: string
): Promise<MoneyRequest> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, amount, reason })
    .select()
    .single();
  if (error) throw error;
  return data as MoneyRequest;
}

/** Fetch all requests belonging to the current user. */
export async function getMyMoneyRequests(userId: string): Promise<MoneyRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MoneyRequest[];
}

/** Fetch every request — only succeeds for founder/admin roles (enforced by RLS). */
export async function getAllMoneyRequests(): Promise<MoneyRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, requester:user_id(email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MoneyRequest[];
}

/** Approve or reject a request — only founder/admin can call this (RLS). */
export async function reviewMoneyRequest(
  id: string,
  status: "approved" | "rejected",
  reviewerId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
