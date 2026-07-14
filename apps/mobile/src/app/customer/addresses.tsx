import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Button,
  Card,
  Badge,
} from "@/components/ui";
import { MapPin, Plus, Trash2, Home, Briefcase, Map as MapIcon, ChevronRight, ChevronLeft } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

export default function CustomerAddressesScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<any[]>([]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", user.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert(
      "حذف العنوان",
      "هل أنت متأكد أنك تريد حذف هذا العنوان؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("customer_addresses")
                .delete()
                .eq("id", id);
              if (error) throw error;
              fetchAddresses();
            } catch (error) {
              Alert.alert("خطأ", "تعذر حذف العنوان");
            }
          },
        },
      ]
    );
  };

  const getAddressIcon = (line1: string) => {
    const text = line1.toLowerCase();
    if (text.includes("منزل") || text.includes("home")) return <Home size={20} color={colors.primary} />;
    if (text.includes("عمل") || text.includes("work") || text.includes("office")) return <Briefcase size={20} color={colors.primary} />;
    return <MapIcon size={20} color={colors.primary} />;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          {isRTL ? <ChevronRight size={24} color={colors.textPrimary} /> : <ChevronLeft size={24} color={colors.textPrimary} />}
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>عناويني</Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin color={colors.textDisabled} size={64} />
            <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
              ليس لديك أي عناوين مسجلة
            </Typography>
          </View>
        ) : (
          addresses.map((address) => (
            <Card key={address.id} style={styles.addressCard}>
              <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.bgElevated }]}>
                  {getAddressIcon(address.address_line1)}
                </View>
                
                <View style={[styles.addressInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                  <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Typography variant="h3">{address.address_line1}</Typography>
                    {address.is_default && <Badge variant="success">افتراضي</Badge>}
                  </View>
                  <Typography variant="body" color="secondary">{address.city}, {address.country}</Typography>
                </View>

                <TouchableOpacity onPress={() => handleDeleteAddress(address.id)}>
                  <Trash2 color={colors.error} size={20} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="إضافة عنوان جديد"
          icon={<Plus size={20} color={colors.textOnBrand} />}
          onPress={() => { /* Navigate to add address */ }}
          style={styles.addBtn}
        />
      </View>
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
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
    flex: 1,
    textAlign: "center",
  },
  backBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.md,
    flexGrow: 1,
  },
  addressCard: {
    padding: TOKENS.spacing.md,
  },
  addressRow: {
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  addressInfo: {
    flex: 1,
  },
  titleRow: {
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  footer: {
    padding: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.xl,
  },
  addBtn: {
    width: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
});
