import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MarketScreen() {
  const params = useLocalSearchParams();
  const isSougAdmin = params.preview === "1" && params.identity === "soug-admin";
  const href = isSougAdmin
    ? { pathname: "/(tabs)/home", params: { preview: "1", identity: "soug-admin" } }
    : params.preview === "1"
      ? { pathname: "/(tabs)/home", params: { preview: "1" } }
      : "/(tabs)/home";

  return <Redirect href={href as any} />;
}
