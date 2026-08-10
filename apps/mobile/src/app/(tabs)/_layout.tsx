import React from 'react';
import { Tabs } from 'expo-router';
import { CircleUserRound, ShoppingCart, Heart, Home } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#007BFF',
      tabBarInactiveTintColor: '#666',
      tabBarLabelStyle: { fontFamily: 'Arabic-Font', fontSize: 12 },
      tabBarStyle: { backgroundColor: '#FFF', paddingBottom: Math.max(insets.bottom, 8) },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'المفضلة',
          tabBarIcon: ({ color }) => <Heart color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color }) => <CircleUserRound color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
