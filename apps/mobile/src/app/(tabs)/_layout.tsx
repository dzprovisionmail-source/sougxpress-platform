
import React from 'react';
import { Tabs } from 'expo-router';
import { CircleUserRound, Store } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#007BFF', // Blue primary
      tabBarInactiveTintColor: '#666',
      tabBarLabelStyle: { fontFamily: 'Arabic-Font', fontSize: 12 }, // Assuming an Arabic font is available
      tabBarStyle: { backgroundColor: '#FFF' },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color }) => <CircleUserRound color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'متجري',
          tabBarIcon: ({ color }) => <Store color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
