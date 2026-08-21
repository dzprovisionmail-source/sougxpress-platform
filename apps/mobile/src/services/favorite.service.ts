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

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'driver') {
      return toggleCourierFavorite(targetType as CourierFavoriteTargetType, targetId);
    }

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
      // Ensure customer record exists with all NOT NULL constraints to avoid foreign key violation
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'الزبون جديد';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'الزبون';
      const lastName = nameParts.slice(1).join(' ') || 'جديد';

      const { error: customerError } = await supabase.from('customers').upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: user.email || `${user.id}@sougxpress.local`,
        status: 'active',
        phone: user.user_metadata?.phone || null,
        phone_number: user.user_metadata?.phone || null,
      }, { onConflict: 'id' });

      if (customerError) throw customerError;

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

    // Check user role to determine which table to query
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const table = profile?.role === 'driver' ? 'courier_favorites' : 'customer_favorites';
    const idField = profile?.role === 'driver' ? 'courier_id' : 'customer_id';

    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(idField, user.id)
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

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const table = profile?.role === 'driver' ? 'courier_favorites' : 'customer_favorites';
    const idField = profile?.role === 'driver' ? 'courier_id' : 'customer_id';

    const { data, error } = await supabase
      .from(table)
      .select('target_id')
      .eq(idField, user.id)
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

export type MerchantFavoriteTargetType = 'customer' | 'courier';

export interface MerchantFavorite {
  id: string;
  merchant_id: string;
  target_id: string;
  target_type: MerchantFavoriteTargetType;
  created_at: string;
}

/**
 * Toggles a merchant-owned customer or courier favorite.
 */
export const toggleMerchantFavorite = async (
  targetId: string,
  targetType: MerchantFavoriteTargetType = 'customer',
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
      .eq('target_type', targetType)
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
          target_type: targetType,
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


/**
 * Courier-owned favorites. This is intentionally separate from
 * `favorite_couriers`, which belongs to the customer -> courier relationship.
 */
export type CourierFavoriteTargetType = 'store' | 'customer';

export interface CourierFavoriteCard {
  id: string;
  target_id: string;
  target_type: CourierFavoriteTargetType;
  created_at: string | null;
  isFavorite: boolean;
  store?: {
    id: string;
    name: string;
    logo_url: string | null;
    cover_url: string | null;
    address_line1: string;
    city: string;
    category: string;
    main_category: string | null;
    rating: number | null;
    is_open: boolean;
    status: string;
    merchant_id?: string;
  };
  customer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    neighborhood: string | null;
    address: string | null;
    last_order_id?: string | null;
    last_order_status?: string | null;
    last_assignment_status?: string | null;
    store_name?: string | null;
    order_created_at?: string | null;
    contact_allowed?: boolean;
    delivery_count?: number;
    last_delivery_at?: string | null;
  };
}

export interface CourierFavoritesHubData {
  favorites: {
    stores: CourierFavoriteCard[];
    customers: CourierFavoriteCard[];
  };
    interestedCustomers: {
    id: string;
    customer_id: string;
    created_at: string;
    full_name: string | null;
    avatar_url: string | null;
    neighborhood: string | null;
    last_order_id?: string | null;
    last_order_status?: string | null;
    last_assignment_status?: string | null;
    store_name?: string | null;
    order_created_at?: string | null;
    contact_allowed?: boolean;
    delivery_count?: number;
    last_delivery_at?: string | null;
  }[];
  candidates: {
    stores: CourierFavoriteCard[];
    customers: CourierFavoriteCard[];
  };
}

/**
 * Sends a direct delivery offer from a customer to a favorite courier.
 */
export const sendDirectDeliveryOffer = async (
  orderId: string,
  driverId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    const { error } = await supabase.rpc('customer_send_direct_delivery_offer', {
      p_order_id: orderId,
      p_driver_id: driverId
    });

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Error sending direct delivery offer:', err);
    return { success: false, error: err };
  }
};

const courierError = (message: string) => ({
  data: null,
  error: message,
});

/**
 * Toggles a courier's preferred store or customer.
 * The authenticated user must be a `driver` and must own the drivers row.
 */
export const toggleCourierFavorite = async (
  targetType: CourierFavoriteTargetType,
  targetId: string,
): Promise<{ isFavorite: boolean; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isFavorite: false, error: 'Login required' };
    if (!targetId) return { isFavorite: false, error: 'Target required' };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'driver') {
      return { isFavorite: false, error: 'Driver access required' };
    }

    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (driverError) throw driverError;
    if (!driver) return { isFavorite: false, error: 'Courier profile not found' };

    const { data: existing, error: fetchError } = await supabase
      .from('courier_favorites')
      .select('id')
      .eq('courier_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      const { error: deleteError } = await supabase
        .from('courier_favorites')
        .delete()
        .eq('id', existing.id)
        .eq('courier_id', user.id);
      if (deleteError) throw deleteError;
      return { isFavorite: false, error: null };
    }

    const { error: insertError } = await supabase
      .from('courier_favorites')
      .insert({
        courier_id: user.id,
        target_type: targetType,
        target_id: targetId,
      });
    if (insertError) throw insertError;
    return { isFavorite: true, error: null };
  } catch (err) {
    console.error(`Error toggling courier ${targetType} favorite:`, err);
    return { isFavorite: false, error: err };
  }
};

/**
 * Loads favorite stores/customers and the real stores/customers connected to
 * the courier's own delivery history. Customer results come from a
 * security-definer function that never returns phone fields.
 */
export const getCourierFavoritesHub = async (
  courierId: string,
): Promise<{ data: CourierFavoritesHubData | null; error: any }> => {
  try {
    if (!courierId) return courierError('Courier id required');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== courierId) return courierError('Courier access required');

    const { data: favoriteRows, error: favoritesError } = await supabase
      .from('courier_favorites')
      .select('id, target_type, target_id, created_at')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false });
    if (favoritesError) throw favoritesError;

    const { data: assignments, error: assignmentsError } = await supabase
      .from('delivery_assignments')
      .select('order:orders(customer_id, store_id)')
      .eq('driver_id', courierId);
    if (assignmentsError) throw assignmentsError;

    const storeIds = new Set<string>();
    const customerIds = new Set<string>();
    (assignments || []).forEach((assignment: any) => {
      const order = Array.isArray(assignment.order) ? assignment.order[0] : assignment.order;
      if (order?.store_id) storeIds.add(order.store_id);
      if (order?.customer_id) customerIds.add(order.customer_id);
    });
    (favoriteRows || []).forEach((favorite: any) => {
      if (favorite.target_type === 'store') storeIds.add(favorite.target_id);
      if (favorite.target_type === 'customer') customerIds.add(favorite.target_id);
    });

    const [storesResult, customersResult, interestedResult] = await Promise.all([
      storeIds.size === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from('stores')
            .select('id, name, logo_url, cover_url, address_line1, city, category, main_category, rating, is_open, status, merchant_id')
            .in('id', Array.from(storeIds)),
      supabase.rpc('get_courier_relationship_customers', { p_courier_id: courierId }),
      supabase.rpc('get_courier_interested_customers', { p_courier_id: courierId }),
    ]);

    if (storesResult.error) throw storesResult.error;
    if (customersResult.error) throw customersResult.error;
    if (interestedResult.error) {
      console.error('Error fetching interested customers for courier:', interestedResult.error);
    }

    const favoriteByKey = new Map(
      (favoriteRows || []).map((favorite: any) => [
        `${favorite.target_type}:${favorite.target_id}`,
        favorite,
      ]),
    );

    const storeCards: CourierFavoriteCard[] = (storesResult.data || []).map((store: any) => {
      const favorite = favoriteByKey.get(`store:${store.id}`) as any;
      return {
        id: favorite?.id || store.id,
        target_id: store.id,
        target_type: 'store',
        created_at: favorite?.created_at || null,
        isFavorite: !!favorite,
        store,
      };
    });

    const customerCards: CourierFavoriteCard[] = (customersResult.data || []).map((customer: any) => {
      const favorite = favoriteByKey.get(`customer:${customer.id}`) as any;
      return {
        id: favorite?.id || customer.id,
        target_id: customer.id,
        target_type: 'customer',
        created_at: favorite?.created_at || null,
        isFavorite: !!favorite,
        customer: {
          ...customer,
          last_order_id: customer.last_order_id ?? null,
          last_order_status: customer.last_order_status ?? null,
          last_assignment_status: customer.last_assignment_status ?? null,
          store_name: customer.store_name ?? null,
          order_created_at: customer.order_created_at ?? null,
          contact_allowed: Boolean(customer.contact_allowed),
          delivery_count: Number(customer.delivery_count || 0),
          last_delivery_at: customer.last_delivery_at ?? null,
        },
      };
    });

    return {
      data: {
        favorites: {
          stores: storeCards.filter(card => card.isFavorite),
          customers: customerCards.filter(card => card.isFavorite),
        },
        interestedCustomers: (interestedResult.data || []).map((customer: any) => ({
          ...customer,
          last_order_id: customer.last_order_id ?? null,
          last_order_status: customer.last_order_status ?? null,
          last_assignment_status: customer.last_assignment_status ?? null,
          store_name: customer.store_name ?? null,
          order_created_at: customer.order_created_at ?? null,
          contact_allowed: Boolean(customer.contact_allowed),
          delivery_count: Number(customer.delivery_count || 0),
          last_delivery_at: customer.last_delivery_at ?? null,
        })),
        candidates: {
          stores: storeCards,
          customers: customerCards,
        },
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching courier favorites hub:', err);
    return { data: null, error: err };
  }
};


export interface MerchantFavoriteCourier {
  id: string;
  target_id: string;
  created_at: string | null;
  courier: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    delivery_count: number | null;
    vehicle_type: string | null;
    status: string | null;
    availability: string | null;
    neighborhood: string | null;
  };
  isFavorite: boolean;
}

export interface MerchantFavoriteCouriersData {
  favorites: MerchantFavoriteCourier[];
  candidates: MerchantFavoriteCourier[];
}

/**
 * Loads the merchant's favorite couriers and the real active courier directory.
 * Phone numbers are deliberately omitted from both the select and the return type.
 */
export const getMerchantFavoriteCouriers = async (
  merchantId: string,
): Promise<{ data: MerchantFavoriteCouriersData | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== merchantId) return { data: null, error: 'Merchant access required' };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', merchantId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'merchant') return { data: null, error: 'Merchant access required' };

    const { data: favoriteRows, error: favoritesError } = await supabase
      .from('merchant_favorites')
      .select('id, target_id, created_at')
      .eq('merchant_id', merchantId)
      .eq('target_type', 'courier')
      .order('created_at', { ascending: false });
    if (favoritesError) throw favoritesError;

    const { data: couriers, error: couriersError } = await supabase
      .from('drivers')
      .select('id, full_name, avatar_url, rating, delivery_count, vehicle_type, status, availability, neighborhood')
      .eq('status', 'active')
      .eq('is_suspended_for_debt', false)
      .order('rating', { ascending: false });
    if (couriersError) throw couriersError;

    const favoriteById = new Map((favoriteRows || []).map(row => [row.target_id, row]));
    const cards: MerchantFavoriteCourier[] = (couriers || []).map(courier => {
      const favorite = favoriteById.get(courier.id);
      return {
        id: favorite?.id || courier.id,
        target_id: courier.id,
        created_at: favorite?.created_at || null,
        courier,
        isFavorite: !!favorite,
      };
    });

    return {
      data: {
        favorites: cards.filter(card => card.isFavorite),
        candidates: cards,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching merchant favorite couriers:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetches detailed favorites for a customer including products, stores, and couriers.
 */
export const getCustomerFavoritesDetailed = async (customerId: string) => {
  try {
    // 1. Fetch IDs first to avoid relationship name issues
    const { data: favs, error: favError } = await supabase
      .from('customer_favorites')
      .select('id, target_type, target_id, product_id')
      .eq('customer_id', customerId);

    if (favError) throw favError;

    const { data: courierFavs, error: courierFavError } = await supabase
      .from('favorite_couriers')
      .select('id, courier_id')
      .eq('user_id', customerId);

    if (courierFavError) throw courierFavError;

    // 2. Separate IDs by type
    const productIds = (favs || [])
      .filter(f => f.target_type === 'product' || f.product_id)
      .map(f => f.product_id || f.target_id);
    
    const storeIds = (favs || [])
      .filter(f => f.target_type === 'store')
      .map(f => f.target_id);
    
    const courierIds = (courierFavs || []).map(f => f.courier_id);

    // 3. Fetch detailed objects in parallel
    const [productsRes, storesRes, couriersRes] = await Promise.all([
      productIds.length > 0 
        ? supabase.from('products').select('*').in('id', productIds)
        : Promise.resolve({ data: [], error: null }),
      storeIds.length > 0
        ? supabase.from('stores').select('*').in('id', storeIds)
        : Promise.resolve({ data: [], error: null }),
      courierIds.length > 0
        ? supabase.from('drivers').select('*').in('id', courierIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    // 4. Map back to original favorite records
    return {
      data: {
        products: (productsRes.data || []).map(p => {
          const fav = favs.find(f => (f.product_id === p.id || (f.target_type === 'product' && f.target_id === p.id)));
          return { ...p, favorite_id: fav?.id };
        }),
        stores: (storesRes.data || []).map(s => {
          const fav = favs.find(f => f.target_type === 'store' && f.target_id === s.id);
          return { ...s, favorite_id: fav?.id };
        }),
        couriers: (couriersRes.data || []).map(d => {
          const fav = courierFavs.find(f => f.courier_id === d.id);
          return { driver: d, favorite_id: fav?.id };
        })
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching customer favorites detailed:', error);
    return { data: null, error };
  }
};
