import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="founder" />
      <Stack.Screen name="customer-auth" />
      <Stack.Screen name="merchant-auth" />
      <Stack.Screen name="driver-auth" />
      <Stack.Screen name="guest-marketplace" />
      <Stack.Screen name="store-details" />
      <Stack.Screen name="product-details" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
