
import { supabase } from "../lib/supabase";
import { Merchant } from "../types/schema-03-core";

export const getMerchant = async (merchantId: string): Promise<Merchant | null> => {
  const { data, error } = await supabase
    .from("merchants")
    .select("*", { count: "exact" })
    .eq("id", merchantId)
    .single();

  if (error) {
    console.error("Error fetching merchant:", error);
    return null;
  }
  return data as Merchant;
};

export const updateMerchant = async (merchantId: string, updates: Partial<Merchant>): Promise<Merchant | null> => {
  const { data, error } = await supabase
    .from("merchants")
    .update(updates)
    .eq("id", merchantId)
    .select()
    .single();

  if (error) {
    console.error("Error updating merchant:", error);
    return null;
  }
  return data as Merchant;
};
