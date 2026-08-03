import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Bike, Car, Truck, Star } from "lucide-react-native";

export default function CouriersHorizontalBar({ couriers, onCourierPress, onPress }) {
  const defaultCouriers = [
    { id: "1", name: "أحمد السعيد", vehicleType: "bike", rating: 4.9, status: "متاح" },
    { id: "2", name: "ياسين بلقاسم", vehicleType: "car", rating: 4.8, status: "متاح" },
    { id: "3", name: "محمد علي", vehicleType: "truck", rating: 5.0, status: "متاح" }
  ];

  const list = (couriers && couriers.length > 0) ? couriers : defaultCouriers;
  const handlePress = onCourierPress || onPress;

  const getIcon = (type) => {
    if (type === "car") return <Car size={13} color="#FF9500" />;
    if (type === "truck") return <Truck size={13} color="#FF9500" />;
    return <Bike size={13} color="#FF9500" />;
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>الموصلين المتاحين</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {list.map((item) => (
          <TouchableOpacity
            key={item.id || item.name}
            activeOpacity={0.8}
            onPress={() => {
              if (typeof handlePress === "function") {
                handlePress(item);
              }
            }}
            style={s.card}
          >
            <View style={s.avatarContainer}>
              <Text style={s.initials}>{(item.name || "م").substring(0, 2)}</Text>
              <View style={s.badge}>{getIcon(item.vehicleType)}</View>
            </View>
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
            <View style={s.meta}>
              <Star size={11} color="#FFD700" fill="#FFD700" />
              <Text style={s.rating}>{item.rating || "4.8"}</Text>
              <Text style={s.status}>• {item.status || "متاح"}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginVertical: 12 },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "bold", color: "#FFFFFF", textAlign: "right" },
  scroll: { paddingHorizontal: 12, gap: 10, flexDirection: "row-reverse" },
  card: {
    width: 120,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2C2C2E"
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2C2C2E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    position: "relative"
  },
  initials: { color: "#FF9500", fontWeight: "bold", fontSize: 13 },
  badge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "#2C2C2E"
  },
  name: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", marginBottom: 4, textAlign: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { color: "#FFD700", fontSize: 10, fontWeight: "bold" },
  status: { color: "#34C759", fontSize: 10 }
});
