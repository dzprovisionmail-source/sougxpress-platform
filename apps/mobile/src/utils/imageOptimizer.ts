import * as ImageManipulator from "expo-image-manipulator";
// Expo SDK 54 keeps the async helpers in the legacy entrypoint; the root
// getInfoAsync export intentionally throws at runtime after the deprecation.
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "react-native";

export type ImageType = "cover" | "logo" | "gallery";

export interface ImageSpecs {
  aspectRatio: number; // width / height
  targetWidth: number;
  targetHeight: number;
  labelAr: string;
  recommendedDesc: string;
}

export const IMAGE_SPECS: Record<ImageType, ImageSpecs> = {
  cover: {
    aspectRatio: 16 / 9,
    targetWidth: 1280,
    targetHeight: 720,
    labelAr: "غلاف المتجر",
    recommendedDesc: "16:9 (موصى به: 1280×720 بكسل)",
  },
  logo: {
    aspectRatio: 1,
    targetWidth: 512,
    targetHeight: 512,
    labelAr: "شعار المتجر",
    recommendedDesc: "1:1 مربع (موصى به: 512×512 بكسل)",
  },
  gallery: {
    aspectRatio: 4 / 3,
    targetWidth: 1200,
    targetHeight: 900,
    labelAr: "معرض الصور",
    recommendedDesc: "4:3 (موصى به: 1200×900 بكسل)",
  },
};

export interface OriginalImageInfo {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: "image/jpeg";
}

const MAX_UPLOAD_DIMENSION = 1600;
const MIN_UPLOAD_DIMENSION = 320;
const MAX_SAFE_UPLOAD_BYTES = 1 * 1024 * 1024;
const COMPRESSION_QUALITIES = [0.85, 0.78, 0.7, 0.62, 0.55, 0.45, 0.35, 0.25];

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      console.warn("[imageOptimizer] processed URI does not exist", { uri });
      return 0;
    }
    return info.size ?? 0;
  } catch (error) {
    console.error("[imageOptimizer] failed to inspect processed URI", { uri, error });
    return 0;
  }
}

/**
 * Prepares an image entirely on-device before Storage upload.
 * No original URI is passed to the upload transport.
 */
export async function prepareImageForUpload(uri: string): Promise<PreparedImage> {
  if (!uri) throw new Error("لم يتم تحديد صورة");

  let original: { width: number; height: number };
  try {
    original = await getImageSize(uri);
  } catch (error) {
    console.error("[imageOptimizer] unable to read source image dimensions", { uri, error });
    throw new Error("تعذر قراءة أبعاد الصورة");
  }

  const largestSide = Math.max(original.width, original.height);
  const dimensionStages = Array.from(
    new Set([
      MAX_UPLOAD_DIMENSION,
      1400,
      1200,
      1000,
      800,
      640,
      512,
      400,
      MIN_UPLOAD_DIMENSION,
    ].filter((dimension) => dimension <= largestSide))
  );

  if (dimensionStages.length === 0) dimensionStages.push(Math.max(1, largestSide));

  let bestResult: PreparedImage | null = null;
  let attemptCount = 0;

  for (const maxDimension of dimensionStages) {
    const scale = Math.min(1, maxDimension / largestSide);
    const targetWidth = Math.max(1, Math.round(original.width * scale));
    const targetHeight = Math.max(1, Math.round(original.height * scale));
    const actions: ImageManipulator.Action[] = [];

    if (targetWidth !== original.width || targetHeight !== original.height) {
      actions.push({ resize: { width: targetWidth, height: targetHeight } });
    }

    for (const quality of COMPRESSION_QUALITIES) {
      attemptCount += 1;
      try {
        const result = await ImageManipulator.manipulateAsync(uri, actions, {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        });

        if (!result.uri) {
          console.warn("[imageOptimizer] manipulator returned an empty URI", {
            maxDimension,
            quality,
          });
          continue;
        }

        const sizeBytes = await getFileSize(result.uri);
        if (sizeBytes <= 0) {
          console.warn("[imageOptimizer] processed output was not readable", {
            outputUri: result.uri,
            maxDimension,
            quality,
          });
          continue;
        }

        let dimensions: { width: number; height: number };
        try {
          dimensions = await getImageSize(result.uri);
        } catch (error) {
          console.error("[imageOptimizer] processed output dimensions failed", {
            outputUri: result.uri,
            maxDimension,
            quality,
            error,
          });
          continue;
        }

        const prepared: PreparedImage = {
          uri: result.uri,
          width: dimensions.width,
          height: dimensions.height,
          sizeBytes,
          contentType: "image/jpeg",
        };

        console.log("[imageOptimizer] processed image candidate", {
          maxDimension,
          quality,
          width: dimensions.width,
          height: dimensions.height,
          sizeBytes,
        });

        if (!bestResult || sizeBytes < bestResult.sizeBytes) {
          bestResult = prepared;
        }

        if (sizeBytes <= MAX_SAFE_UPLOAD_BYTES) return prepared;
      } catch (error) {
        console.error("[imageOptimizer] image manipulation attempt failed; continuing", {
          sourceUri: uri,
          maxDimension,
          quality,
          error,
        });
      }
    }
  }

  if (bestResult) {
    console.warn("[imageOptimizer] 1 MB target was not reached; using best processed output", {
      attemptCount,
      sizeBytes: bestResult.sizeBytes,
      width: bestResult.width,
      height: bestResult.height,
    });
    return bestResult;
  }

  console.error("[imageOptimizer] all image manipulation attempts failed", {
    sourceUri: uri,
    attemptCount,
    originalWidth: original.width,
    originalHeight: original.height,
  });
  throw new Error("تعذر تجهيز الصورة للرفع");
}

export async function getOriginalImageInfo(uri: string): Promise<OriginalImageInfo> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      async (width, height) => {
        try {
          const sizeBytes = await getFileSize(uri);
          let sizeFormatted = "";
          if (sizeBytes > 1024 * 1024) {
            sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
          } else {
            sizeFormatted = `${Math.round(sizeBytes / 1024)} كيلوبايت`;
          }
          resolve({ uri, width, height, sizeBytes, sizeFormatted });
        } catch (e) {
          resolve({ uri, width, height, sizeBytes: 0, sizeFormatted: "غير معروف" });
        }
      },
      reject
    );
  });
}

export async function processAndOptimizeImage(
  uri: string,
  type: ImageType,
  zoom = 1,
  offsetX = 0,
  offsetY = 0
): Promise<{ uri: string; width: number; height: number; sizeBytes: number; sizeFormatted: string }> {
  const specs = IMAGE_SPECS[type];
  const info = await getOriginalImageInfo(uri);
  const origW = info.width;
  const origH = info.height;

  const targetAspect = specs.aspectRatio;
  let cropWidth = origW;
  let cropHeight = origW / targetAspect;

  if (cropHeight > origH) {
    cropHeight = origH;
    cropWidth = origH * targetAspect;
  }

  cropWidth = cropWidth / Math.max(zoom, 0.5);
  cropHeight = cropHeight / Math.max(zoom, 0.5);

  const cropX = Math.max(0, Math.min(origW - cropWidth, (origW - cropWidth) / 2 + offsetX * origW));
  const cropY = Math.max(0, Math.min(origH - cropHeight, (origH - cropHeight) / 2 + offsetY * origH));

  const actions: ImageManipulator.Action[] = [];
  if (cropWidth > 10 && cropHeight > 10 && (cropWidth < origW - 5 || cropHeight < origH - 5)) {
    actions.push({ crop: { originX: Math.round(cropX), originY: Math.round(cropY), width: Math.round(cropWidth), height: Math.round(cropHeight) } });
  }
  actions.push({ resize: { width: specs.targetWidth, height: specs.targetHeight } });

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const processedInfo = await getOriginalImageInfo(result.uri);
  return {
    uri: result.uri,
    width: processedInfo.width,
    height: processedInfo.height,
    sizeBytes: processedInfo.sizeBytes,
    sizeFormatted: processedInfo.sizeFormatted,
  };
}
