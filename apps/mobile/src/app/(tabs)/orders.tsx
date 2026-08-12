import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAppTheme } from "@/contexts/ThemeContext";

import CustomerOrdersScreen from "./orders-customer";
import CourierOrdersScreen from "./orders-courier";
import MerchantOrdersScreen from "./orders-merchant";

type Role = 'customer' | 'courier' | 'merchant' | 'guest';

export default function OrdersGateway() {
  const { colors } = useAppTheme();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole('guest');
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const r = (profile as any)?.role;
        if (r === 'customer') setRole('customer');
        else if (r === 'driver') setRole('courier');
        else if (r === 'merchant') setRole('merchant');
        else setRole('guest');
      } catch (error) {
        console.error("Error checking role in orders gateway:", error);
        setRole('guest');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgBase }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  switch (role) {
    case 'customer':
      return <CustomerOrdersScreen />;
    case 'courier':
      return <CourierOrdersScreen />;
    case 'merchant':
      return <MerchantOrdersScreen />;
    default:
      // Guests shouldn't even see the tab, but if they reach here, we could redirect or show a message
      return null;
  }
}
