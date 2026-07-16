/**
 * Typed interfaces mapped exactly to docs/v2/03b_DATABASE_SCHEMA_ADDENDUM.md
 * (Founder Operating System & Platform Settings).
 */

export interface PlatformFinancialSetting {
  id: string;
  key: string;
  value: unknown;
  zone_id: string | null;
  effective_from: string;
  set_by: string;
  created_at: string;
}

export interface FounderOverride {
  id: string;
  entity_type: string;
  entity_id: string;
  override_type: string;
  previous_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  reason: string;
  founder_id: string;
  created_at: string;
}

export type MetricPeriod = "hourly" | "daily" | "weekly" | "monthly";

export interface PlatformMetricsSnapshot {
  id: string;
  zone_id: string | null;
  metric_period: MetricPeriod;
  period_start: string;
  period_end: string;
  total_orders: number;
  total_gmv_minor: number;
  total_commission_minor: number;
  total_delivery_fees_minor: number;
  active_customers: number;
  active_merchants: number;
  active_drivers: number;
  dispute_count: number;
  created_at: string;
}

export type FounderAlertSeverity = "info" | "warning" | "critical";
export type FounderAlertStatus = "open" | "acknowledged" | "resolved";

export interface FounderAlert {
  id: string;
  category: string;
  severity: FounderAlertSeverity;
  zone_id: string | null;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  status: FounderAlertStatus;
  acknowledged_by: string | null;
  created_at: string;
  resolved_at: string | null;
}
