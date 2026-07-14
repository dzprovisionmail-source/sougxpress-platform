import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Card,
} from "@/components/ui";
import { Heart, ShoppingBag, Star } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { I18nManager } from "react-native";

export default function CustomerFavoritesScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  
  // Note: Since there is no favorites table in the current Supabase schema,
  // we use static data for the UI demonstration as requested.
  const [favorites, setFavorites] = useState([
    {
      id: "1",
      name: "خبز طازج",
      price: 15.00,
      store: "مخبزة السعادة",
      rating: 4.9,
      image: null,
    },
    {
      id: "2",
      name: "حليب بقري",
      price: 90.00,
      store: "واحة عين صفراء",
      rating: 4.7,
      image: null,
    }
  ]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <View style={styles.header}>
        <Typography variant="h1" align="right" style={styles.headerTitle}>المفضلة</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Heart color={colors.textDisabled} size={64} />
            <Typography variant="h3" color="secondary" style={{ marginTop: 16 }}>
              ليس لديك أي منتجات مفضلة بعد
            </Typography>
          </View>
        ) : (
          <View style={styles.grid}>
            {favorites.map((item) => (
              <Card key={item.id} style={styles.favoriteCard}>
                <TouchableOpacity style={styles.heartBtn}>
                  <Heart size={20} color={colors.error} fill={colors.error} />
                </TouchableOpacity>
                
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.bgElevated }]}>
                  <ShoppingBag color={colors.textDisabled} size={32} />
                </View>
                
                <View style={[styles.cardInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                  <Typography variant="h3" numberOfLines={1}>{item.name}</Typography>
                  <Typography variant="caption" color="secondary">{item.store}</Typography>
                  
                  <View style={[styles.ratingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Star size={12} color="#FFD700" fill="#FFD700" />
                    <Typography variant="caption" style={{ marginLeft: 4 }}>{item.rating}</Typography>
                  </View>
                  
                  <View style={[styles.priceRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Typography variant="h3" color="primary">{item.price.toFixed(2)} د.ج</Typography>
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                      <ShoppingBag size={16} color={colors.textOnBrand} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    flexGrow: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TOKENS.spacing.md,
  },
  favoriteCard: {
    width: "47%",
    padding: TOKENS.spacing.sm,
    position: "relative",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 4,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: TOKENS.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: TOKENS.spacing.sm,
  },
  cardInfo: {
    gap: 2,
  },
  ratingRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  priceRow: {
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
});
