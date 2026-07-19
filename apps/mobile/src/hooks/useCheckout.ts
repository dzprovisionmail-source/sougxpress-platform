import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomerAddress } from '@/types/schema-03-core';
import { processCheckout, CheckoutData } from '@/services/checkout.service';
import useCart from './useCart';

const useCheckout = () => {
  const { cartItems, subtotal, deliveryFee, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [notes, setNotes] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [customerZoneId, setCustomerZoneId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: addressData } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', user.id);
        
        if (addressData) {
          setAddresses(addressData);
          const defaultAddress = addressData.find(a => a.is_default) || addressData[0];
          setSelectedAddress(defaultAddress || null);
        }

        const { data: customer } = await supabase
          .from('customers')
          .select('zone_id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (customer) {
          setCustomerZoneId(customer.zone_id);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleConfirmOrder = async (): Promise<{ success: boolean; orderId?: string }> => {
    if (!currentUserId || !selectedAddress || cartItems.length === 0) {
      setError("يرجى اختيار العنوان والتأكد من أن سلتك ليست فارغة.");
      return { success: false };
    }

    setLoading(true);
    setError(null);

    const storeId = cartItems[0].product.store_id;
    const zoneId = selectedAddress.zone_id || customerZoneId;

    if (!zoneId) {
      setError("يرجى تحديد المنطقة من عنوانك.");
      setLoading(false);
      return { success: false };
    }

    const checkoutData: CheckoutData = {
      customer_id: currentUserId,
      store_id: storeId,
      zone_id: zoneId,
      delivery_address_id: selectedAddress.id,
      subtotal_minor: subtotal,
      delivery_fee_minor: deliveryFee,
      platform_commission_minor: Math.round(subtotal * 0.1),
      total_minor: total,
      notes,
      cartItems,
    };

    const result = await processCheckout(checkoutData);

    if (result.success) {
      await clearCart();
      setLoading(false);
      return { success: true, orderId: result.orderId };
    } else {
      setError(result.error || "فشل في إنشاء الطلب.");
      setLoading(false);
      return { success: false };
    }
  };

  return {
    loading,
    error,
    selectedAddress,
    setSelectedAddress,
    addresses,
    notes,
    setNotes,
    handleConfirmOrder,
    cartItems,
    subtotal,
    deliveryFee,
    total,
  };
};

export default useCheckout;
