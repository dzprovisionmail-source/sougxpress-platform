import React from 'react';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: {
        paddingBottom: Math.max(insets.bottom, 8),
      },
    }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
