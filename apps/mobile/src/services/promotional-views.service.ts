import { supabase } from "@/lib/supabase";

export interface PromotionalViewRecord {
  id: string;
  entity_type: "store" | "courier";
  entity_id: string;
  base_views: number;
  daily_increment: number;
  manual_views: number;
  enabled: boolean;
  started_at: string;
  updated_at: string;
}

export interface PromotionalViewAuditRecord {
  id: string;
  view_record_id: string;
  entity_type: string;
  entity_id: string;
  founder_id: string | null;
  previous_manual_views: number;
  added_views: number;
  new_manual_views: number;
  previous_daily_increment: number | null;
  new_daily_increment: number | null;
  previous_enabled: boolean | null;
  new_enabled: boolean | null;
  created_at: string;
}

/**
 * Calculate current promotional views based on real-time database timestamps.
 * Rules:
 * - First 24 hours: returns null (does not appear).
 * - After 24 hours: base_views (default 74) + (completed days after first 24h * daily_increment) + manual_views.
 * - If disabled, stops daily incrementing but keeps base + manual views.
 */
export function calculateViews(record: PromotionalViewRecord | null, entityCreatedAt?: string | null): number | null {
  if (!record) return null;

  const referenceTime = entityCreatedAt ? new Date(entityCreatedAt).getTime() : new Date(record.started_at).getTime();
  const now = Date.now();
  const diffHours = (now - referenceTime) / (1000 * 60 * 60);

  // Less than 24 hours -> does not show promotional views
  if (diffHours < 24) {
    return null;
  }

  let total = record.base_views; // Default 74

  if (record.enabled) {
    // Completed hours after the first 24 hours
    const hoursAfterFirstDay = diffHours - 24;
    const completedDays = Math.floor(hoursAfterFirstDay / 24);
    total += completedDays * record.daily_increment;
  } else {
    // If disabled, we calculate up to the last update or keep fixed base
    // Per rule: stops daily incrementing
    const updatedTime = new Date(record.updated_at).getTime();
    const diffHoursWhenDisabled = Math.max(0, (updatedTime - referenceTime - 24 * 60 * 60 * 1000));
    const completedDaysWhenDisabled = Math.floor(diffHoursWhenDisabled / (24 * 60 * 60 * 1000));
    total += Math.max(0, completedDaysWhenDisabled * record.daily_increment);
  }

  total += record.manual_views;
  return Math.max(0, total);
}

/**
 * Fetch promotional views record for a given entity, or create default if not exists.
 */
export async function getPromotionalViews(entityType: "store" | "courier", entityId: string, entityCreatedAt?: string | null): Promise<{ currentViews: number | null; record: PromotionalViewRecord | null }> {
  try {
    const { data, error } = await supabase
      .from("promotional_views")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching promotional views:", error);
    }

    if (!data) {
      // Create default record if not exists
      const { data: created, error: createError } = await supabase
        .from("promotional_views")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          base_views: 74,
          daily_increment: 30,
          manual_views: 0,
          enabled: true,
          started_at: entityCreatedAt || new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating promotional views record:", createError);
        return { currentViews: null, record: null };
      }

      return {
        currentViews: calculateViews(created, entityCreatedAt),
        record: created,
      };
    }

    return {
      currentViews: calculateViews(data, entityCreatedAt),
      record: data,
    };
  } catch (err) {
    console.error("Exception in getPromotionalViews:", err);
    return { currentViews: null, record: null };
  }
}

/**
 * Fetch all promotional views records for Founder Management.
 */
export async function getAllPromotionalViews(): Promise<PromotionalViewRecord[]> {
  try {
    const { data, error } = await supabase
      .from("promotional_views")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching all promotional views:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception in getAllPromotionalViews:", err);
    return [];
  }
}

/**
 * Founder update action: add manual views, change daily increment, or toggle enabled status.
 */
export async function updatePromotionalViews({
  recordId,
  entityType,
  entityId,
  currentManualViews,
  addedViews,
  newDailyIncrement,
  newEnabled,
  previousDailyIncrement,
  previousEnabled,
}: {
  recordId: string;
  entityType: "store" | "courier";
  entityId: string;
  currentManualViews: number;
  addedViews: number;
  newDailyIncrement?: number;
  newEnabled?: boolean;
  previousDailyIncrement: number;
  previousEnabled: boolean;
}): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const founderId = userData?.user?.id || null;

    const newManualViews = currentManualViews + addedViews;
    const finalDailyIncrement = newDailyIncrement !== undefined ? newDailyIncrement : previousDailyIncrement;
    const finalEnabled = newEnabled !== undefined ? newEnabled : previousEnabled;

    // 1. Update record
    const { error: updateError } = await supabase
      .from("promotional_views")
      .update({
        manual_views: newManualViews,
        daily_increment: finalDailyIncrement,
        enabled: finalEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (updateError) {
      console.error("Error updating promotional views:", updateError);
      return false;
    }

    // 2. Insert audit trail
    const { error: auditError } = await supabase
      .from("promotional_views_audit")
      .insert({
        view_record_id: recordId,
        entity_type: entityType,
        entity_id: entityId,
        founder_id: founderId,
        previous_manual_views: currentManualViews,
        added_views: addedViews,
        new_manual_views: newManualViews,
        previous_daily_increment: previousDailyIncrement,
        new_daily_increment: finalDailyIncrement,
        previous_enabled: previousEnabled,
        new_enabled: finalEnabled,
      });

    if (auditError) {
      console.error("Error inserting promotional views audit:", auditError);
    }

    return true;
  } catch (err) {
    console.error("Exception in updatePromotionalViews:", err);
    return false;
  }
}
