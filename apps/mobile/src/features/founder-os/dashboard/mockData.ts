import type { FounderDashboardSummary, FounderZoneOverview } from "@/types";

/**
 * Mock data for the Founder OS dashboard. Shapes conform exactly to
 * FounderDashboardSummary (docs/v2/03c_MARKET_INTERFACE_SCHEMA.md).
 * No Supabase connection exists yet — this is placeholder data only.
 */
export const MOCK_FOUNDER_DASHBOARD_SUMMARY: FounderDashboardSummary = {
  zone_id: null,
  period: "daily",
  total_orders: 0,
  total_gmv_minor: 0,
  total_commission_minor: 0,
  active_merchants: 0,
  active_drivers: 0,
  open_disputes: 0,
  open_alerts: 0,
};

export const MOCK_FOUNDER_ZONE_OVERVIEWS: FounderZoneOverview[] = [];
