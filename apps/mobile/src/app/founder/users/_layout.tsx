import { Stack } from "expo-router";

/** Nested Stack navigator for the Founder User Management area. */
export default function FounderUsersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="customer-detail" />
      <Stack.Screen name="merchants" />
      <Stack.Screen name="merchant-detail" />
      <Stack.Screen name="drivers" />
      <Stack.Screen name="driver-detail" />
    </Stack>
  );
}
