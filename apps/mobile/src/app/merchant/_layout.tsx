import React from "react";
import { Stack } from "expo-router";

export default function MerchantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="store" />
      <Stack.Screen name="promotions" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
