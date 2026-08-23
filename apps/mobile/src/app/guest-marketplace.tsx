import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GuestMarketplaceScreen() {
  const params = useLocalSearchParams();
  const isPreview = params.preview === '1';
  const isSougAdmin = params.identity === 'soug-admin';
  const href = isPreview && isSougAdmin
    ? { pathname: "/(tabs)/home", params: { preview: "1", identity: "soug-admin" } }
    : isPreview
      ? { pathname: "/(tabs)/home", params: { preview: "1" } }
      : "/(tabs)/home";
  
  return <Redirect href={href as any} />;
}
