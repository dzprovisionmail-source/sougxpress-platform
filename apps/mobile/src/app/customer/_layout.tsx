import React from 'react';
import { Tabs } from 'expo-router';
import { Home, User, ShoppingCart, Heart, ClipboardList, MapPin, Bell, Settings } from 'lucide-react-native';
import { TOKENS } from '@/constants/tokens';
import { getThemeColors, DEFAULT_THEME } from '@/constants/theme';
import { I18nManager } from 'react-native';

export default function CustomerLayout() {
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: { 
        fontSize: 10,
        fontWeight: '600',
      },
      tabBarStyle: { 
        backgroundColor: colors.bgSurface,
        borderTopColor: colors.borderSubtle,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'المفضلة',
          tabBarIcon: ({ color }) => <Heart color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
      
      {/* Hidden tabs that are accessible via profile or other means but part of the workspace */}
      <Tabs.Screen
        name="addresses"
        options={{
          href: null,
          title: 'عناويني',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'التنبيهات',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'الإعدادات',
        }}
      />
    </Tabs>
  );
}
