/**
 * Robustly converts a local URI to a Blob for Supabase Storage upload in React Native.
 * Using XMLHttpRequest is often more reliable than fetch() for local file:// URIs.
 */
export const uriToBlob = async (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.error("uriToBlob failed:", e);
      reject(new Error("Network request failed (uriToBlob)"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
};

/**
 * Standardizes the upload to Supabase Storage using a Blob.
 */
export const uploadToSupabase = async (
  supabase: any,
  bucket: string,
  path: string,
  uri: string,
  contentType?: string
) => {
  const blob = await uriToBlob(uri);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType: contentType || blob.type || "image/jpeg",
      upsert: true,
    });
  
  if (error) throw error;
  return data;
};
