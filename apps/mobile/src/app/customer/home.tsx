import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CustomerHomeScreen() {
  const params = useLocalSearchParams<{ preview?: string; identity?: string }>();
  const isSougAdmin = params.preview === "1" && params.identity === "soug-admin";

  return (
    <Redirect
      href={
        isSougAdmin
          ? { pathname: "/(tabs)/home", params: { preview: "1", identity: "soug-admin" } }
          : "/(tabs)/home"
      }
    />
  );
}
