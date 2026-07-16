import React from "react";
import { Tabs } from "expo-router";
import { LayoutGrid, Package, Store as StoreIcon, CircleUserRound } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function MerchantLayout() {
  const { colors, tokens } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.borderSubtle },
        tabBarLabelStyle: { fontFamily: tokens.typography.families.arabic, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "الطلبات",
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: "متجري",
          tabBarIcon: ({ color, size }) => <StoreIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color, size }) => <CircleUserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
