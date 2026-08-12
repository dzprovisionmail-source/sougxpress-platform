import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GuestMarketplaceScreen() {
  const params = useLocalSearchParams();
  const isPreview = params.preview === '1';
  
  const href = isPreview ? "/(tabs)/home?preview=1" : "/(tabs)/home";
  
  return <Redirect href={href as any} />;
}
