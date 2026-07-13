
import { supabase } from "../lib/supabase";

// Assuming a basic Founder interface for now, might need to be refined based on actual Supabase table structure
export interface Founder {
  id: string;
  full_name: string;
  email: string;
  // Add other founder-specific fields as needed
}

export const getFounder = async (founderId: string): Promise<Founder | null> => {
  const { data, error } = await supabase
    .from("founders") // Assuming a 'founders' table
    .select("*", { count: "exact" })
    .eq("id", founderId)
    .single();

  if (error) {
    console.error("Error fetching founder:", error);
    return null;
  }
  return data as Founder;
};

export const updateFounder = async (founderId: string, updates: Partial<Founder>): Promise<Founder | null> => {
  const { data, error } = await supabase
    .from("founders")
    .update(updates)
    .eq("id", founderId)
    .select()
    .single();

  if (error) {
    console.error("Error updating founder:", error);
    return null;
  }
  return data as Founder;
};
