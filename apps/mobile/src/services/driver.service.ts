
import { supabase } from "../lib/supabase";
import { Driver } from "../types/schema-03-core";

export const getDriver = async (driverId: string): Promise<Driver | null> => {
  if (!driverId || driverId.length < 36) return null;
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching driver:", error);
    return null;
  }
  return data as Driver;
};

export const updateDriver = async (driverId: string, updates: Partial<Driver>): Promise<Driver | null> => {
  if (!driverId || driverId.length < 36) return null;

  // The driver's primary key is also the auth.users foreign key. It is an
  // ownership key, not profile data, so never allow this service to change it.
  if (updates.id !== undefined) {
    console.error("Refusing to update driver ownership key");
    return null;
  }

  const { data, error } = await supabase
    .from("drivers")
    .update(updates)
    .eq("id", driverId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating driver:", error);
    return null;
  }
  return data as Driver;
};
