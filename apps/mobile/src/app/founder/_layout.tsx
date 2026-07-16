import { Stack } from "expo-router";

export default function FounderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="money-requests" />
    </Stack>
  );
}
