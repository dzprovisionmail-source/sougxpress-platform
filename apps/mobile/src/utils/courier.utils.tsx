import { Bike, Car, Truck, Motorcycle, Warehouse } from "lucide-react-native";
import { VehicleType } from "@/types/schema-04-couriers";

type VehicleIconComponent = React.ComponentType<{ size: number; color: string }>;

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: "دراجة نارية",
  car: "سيارة",
  van: "شاح نصف نقل",
  bicycle: "دراجة",
  truck: "شاح تركتويل",
};

export const VEHICLE_ICONS: Record<VehicleType, VehicleIconComponent> = {
  motorcycle: Motorcycle,
  car: Car,
  van: Warehouse,
  bicycle: Bike,
  truck: Truck,
};

export const mapVehicleType = (type: string): VehicleType => {
  if (type === "car" || type === "van") return "car";
  if (type === "truck") return "truck";
  if (type === "motorcycle") return "motorcycle";
  if (type === "bicycle") return "bicycle";
  return "bicycle";
};

export const getVehicleIcon = (type: string, color: string, size: number = 18) => {
  const vehicleType = mapVehicleType(type);
  const Icon = VEHICLE_ICONS[vehicleType] || Bike;
  return <Icon size={size} color={color} />;
};

export const vehicleLabel = (type: string): string => {
  const vehicleType = mapVehicleType(type);
  return VEHICLE_LABELS[vehicleType] || type;
};

export const isCourierAvailable = (courier: { is_available?: boolean; is_mock?: boolean }): boolean => {
  return courier.is_available || courier.is_mock;
};
