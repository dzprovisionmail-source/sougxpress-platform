import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Region } from "react-native-maps";
import { Check, LocateFixed, X } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

type LocationPoint = { latitude: number; longitude: number };

type Props = {
  visible: boolean;
  initialPoint?: LocationPoint | null;
  onClose: () => void;
  onConfirm: (point: LocationPoint) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 34.8009,
  longitude: -0.3181,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function LocationPickerModal({ visible, initialPoint, onClose, onConfirm }: Props) {
  const { colors } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const [point, setPoint] = useState<LocationPoint>(initialPoint ?? DEFAULT_REGION);
  const [region, setRegion] = useState<Region>(initialPoint ? { ...DEFAULT_REGION, ...initialPoint } : DEFAULT_REGION);
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const centerOnCurrentLocation = async (showError = true) => {
    setLocating(true);
    setPermissionDenied(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setPermissionDenied(true);
        if (showError) Alert.alert("صلاحية الموقع", "اسمح للتطبيق باستخدام موقعك الحالي لتحديد نقطة GPS.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setPoint(next);
      const nextRegion = { ...region, ...next };
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 450);
    } catch (error) {
      console.error("Location picker error:", error);
      if (showError) Alert.alert("تعذر تحديد الموقع", "تعذر الحصول على موقع GPS. حرّك الخريطة وحدد النقطة يدويًا.");
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (initialPoint) {
      setPoint(initialPoint);
      setRegion({ ...DEFAULT_REGION, ...initialPoint });
    } else {
      void centerOnCurrentLocation(false);
    }
  }, [visible]);

  const handleRegionChangeComplete = (nextRegion: Region) => {
    setRegion(nextRegion);
    setPoint({ latitude: nextRegion.latitude, longitude: nextRegion.longitude });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="إغلاق الخريطة">
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>اختيار موقع GPS</Text>
          <TouchableOpacity onPress={() => void centerOnCurrentLocation(true)} disabled={locating} accessibilityLabel="موقعي الحالي">
            {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <LocateFixed size={23} color={colors.primary} />}
          </TouchableOpacity>
        </View>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={!permissionDenied}
          showsMyLocationButton={false}
          showsCompass
        >
          <Marker coordinate={point} draggable onDragEnd={(event) => setPoint(event.nativeEvent.coordinate)} title="الموقع المحدد" />
        </MapView>
        <View style={[styles.footer, { backgroundColor: colors.bgSurface }]}>
          {permissionDenied ? <Text style={[styles.warning, { color: colors.error }]}>تم رفض صلاحية GPS. يمكنك تحديد النقطة يدويًا على الخريطة.</Text> : null}
          <Text style={[styles.coordinates, { color: colors.textSecondary }]}>
            {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
          </Text>
          <TouchableOpacity onPress={() => onConfirm(point)} style={[styles.confirm, { backgroundColor: colors.primary }]} accessibilityLabel="تأكيد وإرسال الموقع">
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.confirmText}>تأكيد وإرسال الموقع</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  map: { flex: 1 },
  footer: { padding: 16, gap: 10 },
  warning: { textAlign: "center", fontSize: 13 },
  coordinates: { textAlign: "center", fontSize: 12 },
  confirm: { minHeight: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
