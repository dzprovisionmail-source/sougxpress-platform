/**
 * Typed interfaces mapped exactly to docs/v2/03c_MARKET_INTERFACE_SCHEMA.md
 * (client-facing read/query contracts built on top of 03 / 03b tables).
 */

export type StoreCategory =
  | "grocery"
  | "restaurant"
  | "pharmacy"
  | "bakery"
  | "butcher"
  | "electronics"
  | "household"
  | "other";

export interface FounderDashboardSummary {
  zone_id: string | null;
  period: "hourly" | "daily" | "weekly" | "monthly";
  total_orders: number;
  total_gmv_minor: number;
  total_commission_minor: number;
  active_merchants: number;
  active_drivers: number;
  open_disputes: number;
  open_alerts: number;
}

export interface FounderZoneOverview {
  zone_id: string;
  zone_name: string;
  merchant_count: number;
  store_count: number;
  driver_count: number;
  active_order_count: number;
}

export interface FounderOverrideAction {
  entity_type: string;
  entity_id: string;
  override_type: string;
  reason: string;
}

export interface StoreListItem {
  id: string;
  name: string;
  category: StoreCategory;
  zone_id: string;
  status: "draft" | "active" | "paused" | "suspended";
  is_open_now: boolean;
}

export interface ProductListItem {
  id: string;
  store_id: string;
  name: string;
  price_minor: number;
  status: "active" | "out_of_stock" | "archived";
  primary_image_url: string | null;
}

export interface OrderSummary {
  id: string;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready_for_pickup"
    | "picked_up"
    | "delivered"
    | "cancelled"
    | "disputed";
  store_id: string;
  driver_id: string | null;
  total_minor: number;
  item_count: number;
  placed_at: string;
}
