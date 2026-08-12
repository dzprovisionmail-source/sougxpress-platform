import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  Home,
  Heart,
  ShoppingCart,
  CircleUserRound,
  Bike,
  Store,
  ClipboardList,
  Package,
  Wallet,
} from 'lucide-react-native';

type Role = 'guest' | 'customer' | 'courier' | 'merchant';

interface TabConfig {
  name: string;
  title: string;
  Icon: React.ComponentType<{ color: string; size: number }>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();
  const [role, setRole] = useState<Role>('guest');
  const params = useLocalSearchParams();
  const isPreviewMode = params.preview === '1';

  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setRole('guest');
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        const r = (profile as any)?.role;
        
        // Handle Founder Market Preview
        if (isPreviewMode && (r === 'founder' || r === 'admin')) {
          setRole('customer'); // Presentation role only
          return;
        }

        if (r === 'customer') setRole('customer');
        else if (r === 'driver') setRole('courier');
        else if (r === 'merchant') setRole('merchant');
        else if (r === 'founder' || r === 'admin') {
          router.replace('/founder');
        } else setRole('guest');
      } catch {
        if (mounted) setRole('guest');
      }
    };
    checkRole();
    return () => { mounted = false; };
  }, [isPreviewMode]);

  // Define approved tabs for each role
  const roleTabs: Record<Role, TabConfig[]> = {
    guest: [
      { name: 'home', title: 'الرئيسية', Icon: Home },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
    customer: [
      { name: 'home', title: 'الرئيسية', Icon: Home },
      { name: 'market', title: 'السوق', Icon: Store },
      { name: 'orders', title: 'الطلبات', Icon: ClipboardList },
      { name: 'cart', title: 'السلة', Icon: ShoppingCart },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
    merchant: [
      { name: 'home', title: 'الرئيسية', Icon: Home },
      { name: 'orders', title: 'الطلبات', Icon: ClipboardList },
      { name: 'products', title: 'المنتجات', Icon: Package },
      { name: 'my-store', title: 'المتجر', Icon: Store },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
    courier: [
      { name: 'home', title: 'الرئيسية', Icon: Home },
      { name: 'orders', title: 'الطلبات', Icon: ClipboardList },
      { name: 'deliveries', title: 'التوصيلات', Icon: Bike },
      { name: 'earnings', title: 'الأرباح', Icon: Wallet },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
  };

  const currentTabs = roleTabs[role];

  // Helper to check if a route is an approved tab for the current role
  const getTabOptions = (routeName: string) => {
    const approvedTab = currentTabs.find(t => t.name === routeName);
    if (!approvedTab) {
      return {
        href: null,
      };
    }

    const IconComponent = approvedTab.Icon;
    return {
      title: approvedTab.title,
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <IconComponent color={color} size={size} />
      ),
      href: `/(tabs)/${routeName}`,
    };
  };

  return (
    <View style={{ flex: 1 }}>
      {isPreviewMode && (
        <View style={[styles.previewBanner, { backgroundColor: colors.info, paddingTop: insets.top }]}>
          <Text style={styles.previewText}>وضع معاينة السوق للمؤسس</Text>
          <TouchableOpacity 
            onPress={() => router.replace('/founder')}
            style={styles.exitBtn}
          >
            <Text style={styles.exitText}>العودة لمركز التحكم</Text>
          </TouchableOpacity>
        </View>
      )}
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF8A00',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontFamily: tokens.typography.families.arabic,
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen name="home" options={getTabOptions('home')} />
      <Tabs.Screen name="market" options={getTabOptions('market')} />
      <Tabs.Screen name="orders" options={getTabOptions('orders')} />
      <Tabs.Screen name="cart" options={getTabOptions('cart')} />
      <Tabs.Screen name="profile" options={getTabOptions('profile')} />
      <Tabs.Screen name="products" options={getTabOptions('products')} />
      <Tabs.Screen name="my-store" options={getTabOptions('my-store')} />
      <Tabs.Screen name="deliveries" options={getTabOptions('deliveries')} />
      <Tabs.Screen name="earnings" options={getTabOptions('earnings')} />

      {/* Hidden Routes */}
      <Tabs.Screen name="orders-customer" options={{ href: null }} />
      <Tabs.Screen name="orders-merchant" options={{ href: null }} />
      <Tabs.Screen name="orders-courier" options={{ href: null }} />
      <Tabs.Screen name="driver" options={{ href: null }} />
      <Tabs.Screen name="store" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="couriers" options={{ href: null }} />
      <Tabs.Screen name="courier/[id]" options={{ href: null }} />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  previewBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 100,
  },
  previewText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'System',
  },
  exitBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exitText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});
