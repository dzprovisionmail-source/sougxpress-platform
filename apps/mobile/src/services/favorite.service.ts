import { supabase } from "@/lib/supabase";

export type FavoriteType = 'product' | 'store';

export interface FavoriteItem {
  id: string;
  customer_id: string;
  target_type: FavoriteType;
  target_id: string;
  created_at: string;
}

/**
 * Toggles a favorite (product or store) for the current user.
 */
export const toggleFavorite = async (
  targetType: FavoriteType,
  targetId: string
): Promise<{ isFavorite: boolean; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isFavorite: false, error: 'Login required' };

    // Check if exists
    const { data: existing, error: fetchError } = await supabase
      .from('customer_favorites')
      .select('id')
      .eq('customer_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      // Remove
      const { error: deleteError } = await supabase
        .from('customer_favorites')
        .delete()
        .eq('id', existing.id);
      
      if (deleteError) throw deleteError;
      return { isFavorite: false, error: null };
    } else {
      // Add
      const { error: insertError } = await supabase
        .from('customer_favorites')
        .insert({
          customer_id: user.id,
          target_type: targetType,
          target_id: targetId,
          // For legacy compatibility, we also fill product_id if it's a product
          ...(targetType === 'product' ? { product_id: targetId } : {})
        });

      if (insertError) throw insertError;
      return { isFavorite: true, error: null };
    }
  } catch (err) {
    console.error(`Error toggling ${targetType} favorite:`, err);
    return { isFavorite: false, error: err };
  }
};

/**
 * Checks if a specific target is favorited by the current user.
 */
export const checkIfFavorite = async (
  targetType: FavoriteType,
  targetId: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('customer_favorites')
      .select('id')
      .eq('customer_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') return false;
    return !!data;
  } catch {
    return false;
  }
};

/**
 * Gets all favorited IDs for a specific type for the current user.
 */
export const getFavoriteIds = async (targetType: FavoriteType): Promise<string[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('customer_favorites')
      .select('target_id')
      .eq('customer_id', user.id)
      .eq('target_type', targetType);

    if (error) throw error;
    return (data || []).map(f => f.target_id);
  } catch (err) {
    console.error(`Error fetching ${targetType} favorite IDs:`, err);
    return [];
  }
};

/**
 * Merchant Favorites Logic
 */

export interface MerchantFavorite {
  id: string;
  merchant_id: string;
  target_id: string;
  target_type: 'customer';
  created_at: string;
}

/**
 * Toggles a merchant favorite (currently only customers).
 */
export const toggleMerchantFavorite = async (
  targetId: string
): Promise<{ isFavorite: boolean; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isFavorite: false, error: 'Login required' };

    // Check if exists
    const { data: existing, error: fetchError } = await supabase
      .from('merchant_favorites')
      .select('id')
      .eq('merchant_id', user.id)
      .eq('target_id', targetId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      // Remove
      const { error: deleteError } = await supabase
        .from('merchant_favorites')
        .delete()
        .eq('id', existing.id);
      
      if (deleteError) throw deleteError;
      return { isFavorite: false, error: null };
    } else {
      // Add
      const { error: insertError } = await supabase
        .from('merchant_favorites')
        .insert({
          merchant_id: user.id,
          target_type: 'customer',
          target_id: targetId
        });

      if (insertError) throw insertError;
      return { isFavorite: true, error: null };
    }
  } catch (err) {
    console.error(`Error toggling merchant favorite:`, err);
    return { isFavorite: false, error: err };
  }
};

/**
 * Gets all favorited customer IDs for the current merchant.
 */
export const getMerchantFavoriteCustomerIds = async (): Promise<string[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('merchant_favorites')
      .select('target_id')
      .eq('merchant_id', user.id)
      .eq('target_type', 'customer');

    if (error) throw error;
    return (data || []).map(f => f.target_id);
  } catch (err) {
    console.error(`Error fetching merchant favorite customer IDs:`, err);
    return [];
  }
};

/**
 * Gets customers who favorited a specific store (Phase 2).
 */
export interface InterestedCustomerItem {
  id: string; // customer_favorites record id
  customer_id: string;
  created_at: string;
  customer?: {
    id: string;
    full_name: string;
    avatar_url: string;
    phone: string;
    neighborhood: string;
  };
}

export const getInterestedCustomersForStore = async (storeId: string): Promise<InterestedCustomerItem[]> => {
  try {
    if (!storeId) return [];

    const { data: favs, error: fetchError } = await supabase
      .from('customer_favorites')
      .select('id, customer_id, created_at')
      .eq('target_type', 'store')
      .eq('target_id', storeId);

    if (fetchError) throw fetchError;
    if (!favs || favs.length === 0) return [];

    const customerIds = favs.map(f => f.customer_id);
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, avatar_url, phone, neighborhood')
      .in('id', customerIds);

    if (customerError) throw customerError;

    return favs.map(f => ({
      id: f.id,
      customer_id: f.customer_id,
      created_at: f.created_at,
      customer: customerData?.find(c => c.id === f.customer_id),
    })).filter(item => !!item.customer);
  } catch (err) {
    console.error('Error fetching interested customers for store:', err);
    return [];
  }
};
