
import { supabase } from "../lib/supabase";
import { Customer } from "../types/schema-03-core";

export const getProfile = async (userId: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data as Customer;
};

export const updateProfile = async (userId: string, updates: Partial<Customer>): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }
  return data as Customer;
};
