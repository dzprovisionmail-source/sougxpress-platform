/**
 * Expo's development wrapper automatically calls expo-keep-awake on Android.
 * Some Expo Go/custom runtime combinations do not expose the native module,
 * which otherwise produces an unhandled "Unable to activate keep awake" error.
 *
 * The application does not use keep-awake for any business flow, so development
 * builds safely provide a no-op implementation. Production bundles resolve the
 * official Expo module through metro.config.js.
 */
export const ExpoKeepAwakeTag = "ExpoKeepAwakeDefaultTag";

export function useKeepAwake(_tag?: string): void {
  // Intentionally no-op in development; no screen in this app requires a wake lock.
}

export async function activateKeepAwakeAsync(_tag?: string): Promise<void> {}
export async function deactivateKeepAwake(_tag?: string): Promise<void> {}
export function isAvailableAsync(): Promise<boolean> {
  return Promise.resolve(false);
}

export function addListener(): never {
  throw new Error("Keep-awake listeners are unavailable in the development shim.");
}

export default {
  useKeepAwake,
  activateKeepAwakeAsync,
  deactivateKeepAwake,
  isAvailableAsync,
};

export type KeepAwakeOptions = {
  suppressDeactivateWarnings?: boolean;
  listener?: (...args: unknown[]) => void;
};
export type KeepAwakeListener = (...args: unknown[]) => void;
