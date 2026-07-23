/**
 * Typed interfaces mapped exactly to docs/v2/03_DATABASE_SCHEMA.md (Core Schema).
 * Do not modify these shapes without updating that document first.
 */

// --- Zones ---------------------------------------------------------------

export type ZoneStatus = "active" | "inactive" | "planned";

export interface Zone {
  id: string;
  name: string;
  city: string;
  boundary: unknown | null;
  status: ZoneStatus;
  created_at: string;
  updated_at: string;
}

// --- Customers -------------------------------------------------------------

export type CustomerStatus = "active" | "suspended" | "banned";

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  zone_id: string;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  zone_id: string;
  label: string;
  address_text: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
}

// --- Merchants & Stores ------------------------------------------------------

export type MerchantStatus = "pending_review" | "active" | "suspended" | "rejected";

export interface Merchant {
  id: string;
  business_name: string;
  owner_full_name: string;
  phone: string;
  zone_id: string;
  status: MerchantStatus;
  commission_rate: number | null;
  email?: string;
  address?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export type StoreStatus = "draft" | "active" | "paused" | "suspended";

export interface Store {
  id: string;
  merchant_id: string;
  zone_id: string;
  name: string;
  category: string;
  description?: string;
  status: StoreStatus;
  opens_at: string;
  closes_at: string;
  is_open?: boolean;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  logo_url?: string;
  cover_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: unknown | null;
  rating?: number | null;
  review_count?: number | null;
  is_new?: boolean;
  is_featured?: boolean;
  show_on_home?: boolean;
  is_demo?: boolean;
  created_by?: string | null;
  deleted_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

// --- Products ---------------------------------------------------------------

export type ProductStatus = "active" | "out_of_stock" | "archived";

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price_minor: number;
  category: string;
  image_url?: string | null;
  stock_quantity: number | null;
  is_available: boolean;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  is_demo?: boolean;
  stores?: {
    name: string;
  };
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
}

export interface StoreGalleryImage {
  id: string;
  store_id: string;
  image_url: string;
  title: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreVideo {
  id: string;
  store_id: string;
  url: string;
  title: string | null;
  platform: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export type StoreContentItem = StoreGalleryImage | StoreVideo;

// --- Orders -------------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "disputed";

export interface Order {
  id: string;
  customer_id: string;
  store_id: string;
  zone_id: string;
  driver_id: string | null;
  status: OrderStatus;
  subtotal_minor: number;
  delivery_fee_minor: number;
  platform_commission_minor: number;
  total_minor: number;
  delivery_address_id: string;
  placed_at: string;
  delivered_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
}

export type ActorRole = "customer" | "merchant" | "driver" | "founder" | "system";

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string;
  changed_by_role: ActorRole;
  created_at: string;
}

// --- Drivers ------------------------------------------------------------------

export type DriverStatus = "pending_review" | "active" | "suspended" | "offline";
export type DriverAvailability = "online" | "offline" | "on_delivery";

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  city?: string;
  neighborhood?: string;
  vehicle_make?: string;
  vehicle_color?: string;
  license_plate?: string;
  zone_id: string;
  vehicle_type: string;
  status: DriverStatus;
  availability: DriverAvailability;
  created_at: string;
  updated_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

// --- Finance ------------------------------------------------------------------

export type PayoutRecipientType = "merchant" | "driver";
export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export interface Payout {
  id: string;
  recipient_type: PayoutRecipientType;
  recipient_id: string;
  amount_minor: number;
  status: PayoutStatus;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

export type TransactionType = "order_payment" | "commission" | "payout" | "refund" | "adjustment";

export interface Transaction {
  id: string;
  order_id: string | null;
  type: TransactionType;
  amount_minor: number;
  created_at: string;
}

// --- Promotions ----------------------------------------------------------------

export type PromotionScope = "platform" | "zone" | "store";
export type DiscountType = "percentage" | "fixed_amount" | "free_delivery";
export type PromotionStatus = "draft" | "active" | "expired" | "cancelled";

export interface Promotion {
  id: string;
  scope: PromotionScope;
  scope_id: string | null;
  code: string | null;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  status: PromotionStatus;
  created_by: string;
  created_at: string;
}

export interface PromotionRedemption {
  id: string;
  promotion_id: string;
  order_id: string;
  customer_id: string;
  discount_applied_minor: number;
  created_at: string;
}

// --- Store Promotions (merchant-scoped) -----------------------------------------

export type StoreDiscountType = "percentage" | "fixed_amount" | "free_delivery";

export interface StorePromotion {
  id: string;
  store_id: string;
  title: string;
  description?: string | null;
  discount_type: StoreDiscountType;
  discount_value: number;
  image_url?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  min_order_minor: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Disputes -------------------------------------------------------------------

export type DisputeRaisedByRole = "customer" | "merchant" | "driver";
export type DisputeStatus = "open" | "investigating" | "resolved" | "rejected";

export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  raised_by_role: DisputeRaisedByRole;
  reason_category: string;
  description: string;
  status: DisputeStatus;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Audit Logs -----------------------------------------------------------------

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: ActorRole;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
