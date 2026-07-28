import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  ScrollView,
} from "react-native";
import { X, Check, ZoomIn, ZoomOut, RefreshCw, AlertCircle } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  ImageType,
  IMAGE_SPECS,
  OriginalImageInfo,
  getOriginalImageInfo,
  processAndOptimizeImage,
} from "@/utils/imageOptimizer";

const { width: SW } = Dimensions.get("window");

interface ImageOptimizerModalProps {
  visible: boolean;
  imageUri: string | null;
  imageType: ImageType;
  onClose: () => void;
  onComplete: (processedUri: string, stats: { width: number; height: number; sizeBytes: number }) => void;
}

export const ImageOptimizerModal: React.FC<ImageOptimizerModalProps> = ({
  visible,
  imageUri,
  imageType,
  onClose,
  onComplete,
}) => {
  const { colors, tokens } = useAppTheme();
  const specs = IMAGE_SPECS[imageType];

  const [loadingOriginal, setLoadingOriginal] = useState(true);
  const [originalInfo, setOriginalInfo] = useState<OriginalImageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<{ width: number; height: number; sizeBytes: number; sizeFormatted: string } | null>(null);

  useEffect(() => {
    if (visible && imageUri) {
      loadInfo(imageUri);
    } else {
      setOriginalInfo(null);
      setError(null);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setPreviewUri(null);
      setPreviewStats(null);
    }
  }, [visible, imageUri]);

  const loadInfo = async (uri: string) => {
    setLoadingOriginal(true);
    setError(null);
    try {
      if (uri.startsWith("file://") || uri.startsWith("content://") || uri.startsWith("http")) {
        const info = await getOriginalImageInfo(uri);
        if (info.sizeBytes > 15 * 1024 * 1024) {
          setError("حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 15 ميغابايت.");
        }
        setOriginalInfo(info);
        // Generate initial preview
        generatePreview(uri, 1, 0, 0);
      } else {
        setError("صيغة الصورة غير مدعومة");
      }
    } catch (e: any) {
      setError("تعذر قراءة بيانات الصورة الأصلية");
    } finally {
      setLoadingOriginal(false);
    }
  };

  const generatePreview = async (uri: string, z: number, ox: number, oy: number) => {
    try {
      const res = await processAndOptimizeImage(uri, imageType, z, ox, oy);
      setPreviewUri(res.uri);
      setPreviewStats(res);
    } catch (e) {
      console.error("Preview generation error:", e);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoom + 0.25);
    setZoom(newZoom);
    if (imageUri) generatePreview(imageUri, newZoom, offsetX, offsetY);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(1, zoom - 0.25);
    setZoom(newZoom);
    if (imageUri) generatePreview(imageUri, newZoom, offsetX, offsetY);
  };

  const handleReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    if (imageUri) generatePreview(imageUri, 1, 0, 0);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const maxOffset = 0.5;
      const newX = Math.max(-maxOffset, Math.min(maxOffset, offsetX - gestureState.dx / 300));
      const newY = Math.max(-maxOffset, Math.min(maxOffset, offsetY - gestureState.dy / 300));
      setOffsetX(newX);
      setOffsetY(newY);
    },
    onPanResponderRelease: () => {
      if (imageUri) generatePreview(imageUri, zoom, offsetX, offsetY);
    },
  });

  const handleConfirm = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const finalRes = await processAndOptimizeImage(imageUri, imageType, zoom, offsetX, offsetY);
      onComplete(finalRes.uri, {
        width: finalRes.width,
        height: finalRes.height,
        sizeBytes: finalRes.sizeBytes,
      });
      onClose();
    } catch (e: any) {
      setError("فشل معالجة وضغط الصورة");
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.8)" }]}>
        <View style={[styles.container, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
              تحسين وتعديل {specs.labelAr}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {loadingOriginal ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: tokens.typography.families.arabic }}>
                  جاري تحليل الصورة...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <AlertCircle size={48} color={colors.error} />
                <Text style={{ color: colors.error, marginTop: 12, textAlign: "center", fontFamily: tokens.typography.families.arabic }}>
                  {error}
                </Text>
              </View>
            ) : (
              <>
                {/* Specs Info Card */}
                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.infoTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                    معلومات الصورة والمواصفات
                  </Text>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      الأبعاد الأصلية: {originalInfo?.width} × {originalInfo?.height} بكسل
                    </Text>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      الحجم الأصلي: {originalInfo?.sizeFormatted}
                    </Text>
                  </View>
                  <View style={[styles.infoRow, { marginTop: 4 }]}>
                    <Text style={[styles.infoText, { color: colors.primary, fontWeight: "600" }]}>
                      النسبة المطلوبة: {specs.recommendedDesc}
                    </Text>
                  </View>
                </View>

                {/* Crop & Reposition View */}
                <View style={styles.cropSection}>
                  <Text style={[styles.subLabel, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                    اسحب لتحديد الإطار أو قم بالتكبير/التصغير:
                  </Text>
                  <View
                    {...panResponder.panHandlers}
                    style={[
                      styles.cropContainer,
                      {
                        aspectRatio: specs.aspectRatio,
                        backgroundColor: colors.bgElevated,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    {imageUri && (
                      <Image
                        source={{ uri: imageUri }}
                        style={[
                          styles.cropImage,
                          {
                            transform: [
                              { scale: zoom },
                              { translateX: offsetX * 200 },
                              { translateY: offsetY * 200 },
                            ],
                          },
                        ]}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.cropGridOverlay} pointerEvents="none">
                      <View style={styles.gridLineH} />
                      <View style={styles.gridLineV} />
                    </View>
                  </View>

                  {/* Controls */}
                  <View style={styles.controlsRow}>
                    <TouchableOpacity onPress={handleZoomOut} style={[styles.controlBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                      <ZoomOut size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>
                      تكبير: {Math.round(zoom * 100)}%
                    </Text>
                    <TouchableOpacity onPress={handleZoomIn} style={[styles.controlBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                      <ZoomIn size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleReset} style={[styles.controlBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                      <RefreshCw size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Output Preview Card */}
                {previewStats && (
                  <View style={[styles.previewCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.infoTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                      معاينة النتيجة النهائية قبل الرفع
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        الأبعاد النهائية: {previewStats.width} × {previewStats.height} بكسل
                      </Text>
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        الحجم المضغوط المقدر: {previewStats.sizeFormatted}
                      </Text>
                    </View>
                    {previewUri && (
                      <View style={[styles.miniPreviewContainer, { aspectRatio: specs.aspectRatio }]}>
                        <Image source={{ uri: previewUri }} style={styles.miniPreviewImage} resizeMode="cover" />
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.btnSecondary, { borderColor: colors.borderSubtle, backgroundColor: colors.bgElevated }]}
            >
              <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontWeight: "600" }}>
                إلغاء
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={processing || !!error || loadingOriginal}
              style={[
                styles.btnPrimary,
                {
                  backgroundColor: processing || !!error || loadingOriginal ? colors.textDisabled : colors.primary,
                },
              ]}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" style={{ marginLeft: 6 }} />
                  <Text style={{ color: "#fff", fontFamily: tokens.typography.families.arabic, fontWeight: "700" }}>
                    اعتماد ورفع الصورة
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    height: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    marginRight: 12,
  },
  contentScroll: {
    padding: 16,
    gap: 16,
  },
  center: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoText: {
    fontSize: 12,
  },
  cropSection: {
    gap: 8,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  cropContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  cropImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cropGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(255,255,255,0.4)",
    borderWidth: 1,
    flexDirection: "column",
  },
  gridLineH: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    width: "100%",
  },
  gridLineV: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    height: "100%",
  },
  controlsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 4,
  },
  controlBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniPreviewContainer: {
    width: 120,
    alignSelf: "center",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  miniPreviewImage: {
    width: "100%",
    height: "100%",
  },
  footer: {
    flexDirection: "row-reverse",
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  btnPrimary: {
    flex: 2,
    flexDirection: "row-reverse",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
});
