/**
 * Typed interfaces mapped to the Phase 4 couriers subsystem
 * (supabase/migrations/20260802_couriers_system.sql).
 */

export type VehicleType = "motorcycle" | "car" | "van" | "bicycle" | "truck";

export interface Courier {
  id: string;
  user_id: string | null;
  full_name: string;
  phone_number: string;
  bio: string;
  avatar_url: string | null;
  vehicle_type: VehicleType;
  vehicle_photo_url: string | null;
  rating: number;
  is_available: boolean;
  is_mock: boolean;
  created_at: string;
}

export interface FavoriteCourier {
  id: string;
  user_id: string;
  courier_id: string;
  created_at: string;
}

export interface CourierWithFavorite extends Courier {
  is_favorite: boolean;
}

export interface CourierServiceResponse<T> {
  data: T | null;
  error: string | null;
}
