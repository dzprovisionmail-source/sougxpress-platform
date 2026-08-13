import * as FileSystem from 'expo-file-system';

/**
 * Robustly converts a base64 string to a Uint8Array.
 * Does not rely on global atob() which might be missing in some RN environments.
 */
const base64ToUint8Array = (base64: string): Uint8Array => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const cleanBase64 = base64.replace(/\s/g, '');
  let bufferLength = cleanBase64.length * 0.75;
  const len = cleanBase64.length;

  if (cleanBase64[len - 1] === '=') {
    bufferLength--;
    if (cleanBase64[len - 2] === '=') {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[cleanBase64.charCodeAt(i)];
    const encoded2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const encoded3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const encoded4 = lookup[cleanBase64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return bytes;
};

/**
 * Standardizes the upload to Supabase Storage using ArrayBuffer via FileSystem.
 * This avoids the common "Network request failed" error in React Native when using Blobs.
 */
export const uploadToSupabase = async (
  supabase: any,
  bucket: string,
  path: string,
  uri: string,
  contentType?: string
) => {
  try {
    console.log(`[upload] starting upload to ${bucket}/${path} from ${uri}`);
    
    // 1. Read the file as base64 string
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // 2. Convert to Uint8Array
    const uint8Array = base64ToUint8Array(base64);

    // 3. Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, uint8Array, {
        contentType: contentType || (path.endsWith('.png') ? 'image/png' : 'image/jpeg'),
        upsert: true,
      });

    if (error) {
      console.error("[upload] Supabase error:", error);
      throw error;
    }

    console.log(`[upload] success: ${path}`);
    return data;
  } catch (err: any) {
    console.error("[upload] Fatal error:", err);
    throw new Error(err.message || "فشل رفع الملف (خطأ في الشبكة أو النظام)");
  }
};
