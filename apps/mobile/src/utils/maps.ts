import { Linking, Platform } from "react-native";

/**
 * Map/navigation helpers for the Driver workspace.
 * All links resolve to Google Maps (web fallback works on both platforms;
 * iOS additionally tries the native Apple Maps scheme first for a native feel).
 */

const encode = (value: string) => encodeURIComponent(value.trim());

/**
 * Opens a pinned location by coordinates (e.g. a customer's delivery address).
 */
export const openLocationInMaps = async (latitude: number, longitude: number, label?: string) => {
  const query = label ? `${latitude},${longitude}(${encode(label)})` : `${latitude},${longitude}`;

  if (Platform.OS === "ios") {
    const appleUrl = `maps://?q=${query}&ll=${latitude},${longitude}`;
    const canOpenApple = await Linking.canOpenURL(appleUrl);
    if (canOpenApple) {
      await Linking.openURL(appleUrl);
      return;
    }
  }

  const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  await Linking.openURL(webUrl);
};

/**
 * Opens a location by free-text search (used for merchant stores, since the
 * `stores` table has no stored coordinates — only a name and zone/city).
 */
export const openAddressSearchInMaps = async (query: string) => {
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${encode(query)}`;
  await Linking.openURL(webUrl);
};

/**
 * Opens turn-by-turn Google Maps navigation to a destination coordinate.
 */
export const openGoogleMapsNavigation = async (latitude: number, longitude: number) => {
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
  await Linking.openURL(navigationUrl);
};
