import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Card,
  Avatar,
  Badge,
} from "@/components/ui";
import {
  MapPin,
  Heart,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

export default function CustomerProfileScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Fetch customer profile
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*, zones(name)")
        .eq("id", user.id)
        .single();

      if (customerError) throw customerError;
      setProfile(customerData);

      // Fetch default address
      const { data: addressData } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      
      setAddress(addressData);

    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "خروج",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const menuItems = [
    {
      id: "orders",
      title: "طلباتي",
      icon: <ClipboardList color={colors.primary} size={22} />,
      route: "/customer/orders",
    },
    {
      id: "favorites",
      title: "المفضلة",
      icon: <Heart color={colors.primary} size={22} />,
      route: "/customer/favorites",
    },
    {
      id: "addresses",
      title: "عناويني",
      icon: <MapPin color={colors.primary} size={22} />,
      route: "/customer/addresses",
    },
    {
      id: "notifications",
      title: "التنبيهات",
      icon: <Bell color={colors.primary} size={22} />,
      route: "/customer/notifications",
    },
    {
      id: "settings",
      title: "الإعدادات",
      icon: <Settings color={colors.primary} size={22} />,
      route: "/customer/settings",
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Typography variant="h1" align="right" style={styles.headerTitle}>حسابي</Typography>
        </View>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={[styles.profileInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Avatar
              size={70}
              uri={profile?.avatar_url || null}
              style={{ backgroundColor: colors.bgElevated }}
            />
            <View style={[styles.profileText, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View style={[styles.nameRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Typography variant="h2">
                  {profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')}
                </Typography>
                {profile?.is_golden && (
                  <Badge variant="warning" style={styles.goldenBadge}>
                    <Star size={10} color={colors.textOnBrand} fill={colors.textOnBrand} /> ذهبي
                  </Badge>
                )}
              </View>
              <Typography variant="body" color="secondary">
                {profile?.phone || profile?.phone_number}
              </Typography>
              <Typography variant="caption" color="secondary">
                {profile?.email}
              </Typography>
              
              <View style={[styles.locationRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <MapPin size={14} color={colors.textSecondary} />
                <Typography variant="caption" color="secondary">
                  {profile?.zones?.name || "عين صفراء"} {address ? `• ${address.neighborhood || address.address_text}` : ""}
                </Typography>
              </View>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.bgSurface }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuItemContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={styles.menuIconWrapper}>{item.icon}</View>
                <Typography variant="body" style={styles.menuTitle}>
                  {item.title}
                </Typography>
                {isRTL ? (
                  <ChevronLeft color={colors.textDisabled} size={20} />
                ) : (
                  <ChevronRight color={colors.textDisabled} size={20} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutBtn, { backgroundColor: colors.bgSurface }]}
            onPress={handleLogout}
          >
            <View style={[styles.menuItemContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.menuIconWrapper}>
                <LogOut color={colors.error} size={22} />
              </View>
              <Typography variant="body" style={[styles.menuTitle, { color: colors.error }]}>
                تسجيل الخروج
              </Typography>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Typography variant="caption" color="disabled" align="center">
            سوق إكسبريس v1.0.0
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: TOKENS.spacing.lg,
  },
  header: {
    marginBottom: TOKENS.spacing.xl,
    paddingTop: TOKENS.spacing.md,
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
  },
  profileCard: {
    padding: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.xl,
  },
  profileInfo: {
    alignItems: "center",
    gap: TOKENS.spacing.lg,
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    alignItems: "center",
    gap: TOKENS.spacing.xs,
  },
  goldenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  locationRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  menuContainer: {
    gap: TOKENS.spacing.sm,
  },
  menuItem: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  menuItemContent: {
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 138, 0, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuTitle: {
    flex: 1,
    fontWeight: "600",
  },
  logoutBtn: {
    marginTop: TOKENS.spacing.lg,
    borderColor: "rgba(255, 0, 0, 0.1)",
  },
  footer: {
    marginTop: TOKENS.spacing["3xl"],
    paddingBottom: TOKENS.spacing.xl,
  },
});
