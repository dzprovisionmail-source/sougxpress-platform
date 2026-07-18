import React from "react";
import { Tabs } from "expo-router";
import {
  LayoutGrid,
  Package,
  Store as StoreIcon,
  Bell,
  CircleUserRound,
  Wallet,
} from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function MerchantLayout() {
  const { colors, tokens } = useAppTheme();

  const tabBarStyle = {
    backgroundColor: colors.bgElevated,
    borderTopColor: colors.borderSubtle,
  };

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle,
    tabBarLabelStyle: {
      fontFamily: tokens.typography.families.arabic,
      fontSize: 11,
    },
  };

  return (
    <Tabs screenOptions={screenOptions}>
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
        name="notifications"
        options={{
          title: "الإشعارات",
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "الأرباح",
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
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
