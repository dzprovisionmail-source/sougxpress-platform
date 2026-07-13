
import { supabase } from "../lib/supabase";
import { Driver } from "../types/schema-03-core";

export const getDriver = async (driverId: string): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from("drivers")
    .select("*", { count: "exact" })
    .eq("id", driverId)
    .single();

  if (error) {
    console.error("Error fetching driver:", error);
    return null;
  }
  return data as Driver;
};

export const updateDriver = async (driverId: string, updates: Partial<Driver>): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from("drivers")
    .update(updates)
    .eq("id", driverId)
    .select()
    .single();

  if (error) {
    console.error("Error updating driver:", error);
    return null;
  }
  return data as Driver;
};
