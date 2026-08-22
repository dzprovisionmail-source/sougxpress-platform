import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// EXPO_PUBLIC_SUPABASE_ANON_KEY is the public/anon key (safe to ship in the client bundle)
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing Supabase anon key. Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Helper to retry Supabase requests that fail due to clock skew (PGRST303: JWT issued at future).
 * This is a common issue in mobile environments where the device clock is ahead of the server.
 */
export async function withRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 2,
  delayMs = 1000
): Promise<{ data: T | null; error: any }> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    const result = await fn();
    if (!result.error) return result;
    
    lastError = result.error;
    
    // PGRST303: JWT issued at future
    if (result.error.code === 'PGRST303') {
      if (i < maxRetries) {
        // Wait a bit for the clock to "catch up" or just retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    } else {
      // Not a clock skew error, don't retry here
      break;
    }
  }
  
  return { data: null, error: lastError };
}
