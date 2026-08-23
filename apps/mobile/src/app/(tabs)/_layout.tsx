import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, router, useGlobalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  Home,
  ShoppingCart,
  CircleUserRound,
  Bike,
  Store,
  ClipboardList,
  Package,
  Wallet,
  Heart,
} from 'lucide-react-native';
type Role = 'guest' | 'customer' | 'courier' | 'merchant';

interface TabConfig {
  name: string;
  title: string;
  Icon: any;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();
  const [role, setRole] = useState<Role>('guest');
  const params = useGlobalSearchParams<{ preview?: string; identity?: string }>();
  const isSougAdminPreview = params.identity === 'soug-admin';
  // Store/details and media routes may carry the official identity without
  // inheriting the tab entry's preview query parameter. The identity itself
  // is the authoritative presentation context for Founder market browsing.
  const isPreviewMode = isSougAdminPreview && (params.preview === '1' || params.preview === undefined);

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

  // Define approved tabs for each role strictly per specifications
  const roleTabs: Record<Role, TabConfig[]> = {
    guest: [
      { name: 'home', title: 'الرئيسية', Icon: Home },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
    customer: [
      { name: 'home', title: 'Soug-XPRESS', Icon: Home },
      { name: 'favorites', title: 'المفضلة', Icon: Heart },
      { name: 'orders', title: 'الطلبات', Icon: ClipboardList },
      { name: 'cart', title: 'السلة', Icon: ShoppingCart },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
    merchant: [
      { name: 'home', title: 'الرئيسية', Icon: Home },
      { name: 'orders', title: 'الطلبات', Icon: ClipboardList },
      { name: 'favorites', title: 'المفضلة', Icon: Heart },
      { name: 'my-store', title: 'المتجر', Icon: Store },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
    courier: [
      { name: 'home', title: 'الرئيسية', Icon: Home },
      { name: 'orders', title: 'الطلبات', Icon: ClipboardList },
      { name: 'favorites', title: 'المفضلة', Icon: Heart },
      { name: 'deliveries', title: 'التوصيلات', Icon: Bike },
      { name: 'earnings', title: 'الأرباح', Icon: Wallet },
      { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
    ],
  };

  const currentTabs = roleTabs[role];

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
      tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
        <IconComponent
          color={color}
          size={focused ? size + 1 : size}
          strokeWidth={focused ? 2.5 : 2}
        />
      ),
    };
  };

  return (
    <View style={{ flex: 1 }}>
      {isPreviewMode && (
        <View style={[styles.previewBanner, { backgroundColor: colors.primary, paddingTop: Math.max(insets.top, 8) + 4, paddingBottom: 10, paddingHorizontal: 16 }]}>
          <Text style={[styles.previewText, { fontFamily: tokens.typography.families.arabic }]}>{isSougAdminPreview ? "soug-admin — الحساب الرسمي لمنصة Soug-XPRESS" : "وضع معاينة السوق"}</Text>
          <TouchableOpacity 
            onPress={() => router.replace('/founder')}
            style={styles.exitBtn}
          >
            <Text style={[styles.exitText, { fontFamily: tokens.typography.families.arabic }]}>← لوحة المؤسس</Text>
          </TouchableOpacity>
        </View>
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tokens.colors.brandPrimary,
          tabBarInactiveTintColor: colors.textDisabled,
          tabBarLabelStyle: {
            fontFamily: tokens.typography.families.arabic,
            fontSize: 11,
            fontWeight: '700',
          },
          tabBarStyle: {
            backgroundColor: colors.bgSurface,
            borderTopColor: colors.borderSubtle,
            borderTopWidth: 1,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 7,
            height: 62 + Math.max(insets.bottom, 8),
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
        <Tabs.Screen name="favorites" options={getTabOptions('favorites')} />
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
