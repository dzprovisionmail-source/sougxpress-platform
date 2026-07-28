import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
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

export async function getOriginalImageInfo(uri: string): Promise<OriginalImageInfo> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      async (width, height) => {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          const sizeBytes = fileInfo.exists ? (fileInfo.size ?? 0) : 0;
          let sizeFormatted = "";
          if (sizeBytes > 1024 * 1024) {
            sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
          } else {
            sizeFormatted = `${Math.round(sizeBytes / 1024)} كيلوبايت`;
          }
          resolve({
            uri,
            width,
            height,
            sizeBytes,
            sizeFormatted,
          });
        } catch (e) {
          resolve({
            uri,
            width,
            height,
            sizeBytes: 0,
            sizeFormatted: "غير معروف",
          });
        }
      },
      (error) => {
        reject(error);
      }
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

  // 1. Calculate crop / resize actions based on specs and zoom/offsets
  // First get original size
  const info = await getOriginalImageInfo(uri);
  const origW = info.width;
  const origH = info.height;

  // Compute crop box centered with zoom
  const targetAspect = specs.aspectRatio;
  let cropWidth = origW;
  let cropHeight = origW / targetAspect;

  if (cropHeight > origH) {
    cropHeight = origH;
    cropWidth = origH * targetAspect;
  }

  // Apply zoom
  cropWidth = cropWidth / Math.max(zoom, 0.5);
  cropHeight = cropHeight / Math.max(zoom, 0.5);

  const cropX = Math.max(0, Math.min(origW - cropWidth, (origW - cropWidth) / 2 + offsetX * origW));
  const cropY = Math.max(0, Math.min(origH - cropHeight, (origH - cropHeight) / 2 + offsetY * origH));

  const actions: ImageManipulator.Action[] = [];

  if (cropWidth > 10 && cropHeight > 10 && (cropWidth < origW - 5 || cropHeight < origH - 5)) {
    actions.push({
      crop: {
        originX: Math.round(cropX),
        originY: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      },
    });
  }

  // Resize to target dimensions
  actions.push({
    resize: {
      width: specs.targetWidth,
      height: specs.targetHeight,
    },
  });

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
