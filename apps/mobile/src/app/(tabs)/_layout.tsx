import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  Home,
  Heart,
  ShoppingCart,
  CircleUserRound,
  LogIn,
  Bike,
  Store,
  ClipboardList,
} from 'lucide-react-native';

type Role = 'guest' | 'customer' | 'courier' | 'merchant';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useAppTheme();
  const [role, setRole] = useState<Role>('guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setRole('guest');
          setLoading(false);
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
      } catch {
        if (mounted) setRole('guest');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkRole();
    return () => { mounted = false; };
  }, []);

  const screens = (() => {
    switch (role) {
      case 'customer':
        return [
          { name: 'home', title: 'الرئيسية', Icon: Home },
          { name: 'favorites', title: 'المفضلة', Icon: Heart },
          { name: 'cart', title: 'السلة', Icon: ShoppingCart },
          { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
        ];
      case 'courier':
        return [
          { name: 'home', title: 'الرئيسية', Icon: Home },
          { name: 'deliveries', title: 'التوصيلات', Icon: Bike },
          { name: 'profile', title: 'حسابي', Icon: CircleUserRound },
        ];
      case 'merchant':
        return [
          { name: 'home', title: 'الرئيسية', Icon: Home },
          { name: 'my-store', title: 'متجري', Icon: Store },
          { name: 'orders', title: 'الطلبات', Icon: ClipboardList },
        ];
      case 'guest':
      default:
        return [
          { name: 'home', title: 'الرئيسية', Icon: Home },
          { name: 'favorites', title: 'المفضلة', Icon: Heart },
          { name: 'cart', title: 'السلة', Icon: ShoppingCart },
          { name: 'login', title: 'تسجيل الدخول', Icon: LogIn },
        ];
    }
  })();

  if (loading) {
    return null;
  }

  return (
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
      {screens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: ({ color }) => <ScreenIcon color={color} Icon={screen.Icon} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const ScreenIcon = ({ color, Icon }: { color: string; Icon: React.ComponentType<{ color: string; size: number }> }) => {
  return <Icon color={color} size={24} />;
};
