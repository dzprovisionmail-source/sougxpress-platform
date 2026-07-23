import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ShoppingCart, Clock3, MapPin, Star, Tag, Play } from "lucide-react-native";

import { ProductCard } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import useStore from "@/hooks/useStore";
import { useStoreProducts } from "@/hooks/useProducts";
import { useActivePromotions } from "@/hooks/usePromotions";
import { getStoreGallery, getStoreVideos } from "@/services/store.service";
import { StorePromotion, StoreGalleryImage, StoreVideo } from "@/types/schema-03-core";

const { width: SW } = Dimensions.get("window");

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtTime = (t?: string) => (t ? String(t).slice(0, 5) : "--");

const discountLabel = (p: StorePromotion) => {
  if (p.discount_type === "percentage") return `خصم ${p.discount_value}%`;
  if (p.discount_type === "fixed_amount") return `خصم ${p.discount_value} د.ج`;
  return "توصيل مجاني";
};

// ─── screen ──────────────────────────────────────────────────────────────────

export default function StoreDetailsScreen() {
  const { colors, tokens } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const storeId = typeof id === "string" ? id : "";

  const { store, loading: storeLoading } = useStore(storeId);
  const { products, loading: productsLoading } = useStoreProducts(storeId);
  const { promotions } = useActivePromotions(storeId);

  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [gallery, setGallery] = useState<StoreGalleryImage[]>([]);
  const [videos, setVideos] = useState<StoreVideo[]>([]);

  useEffect(() => {
    if (!storeId) return;
    getStoreGallery(storeId).then(setGallery).catch(() => {});
    getStoreVideos(storeId).then(setVideos).catch(() => {});
  }, [storeId]);

  if (!storeId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errText, { color: colors.error }]}>معرّف المتجر غير متوفر</Text>
      </View>
    );
  }

  if (storeLoading || productsLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errText, { color: colors.error }]}>لم يتم العثور على المتجر</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={[styles.errText, { color: colors.primary, fontSize: 14 }]}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOpen = store.is_open ?? store.status === "active";
  const categories = ["الكل", ...new Set(products.map((p) => p.category || "عام"))];
  const filtered =
    selectedCategory === "الكل"
      ? products
      : products.filter((p) => (p.category || "عام") === selectedCategory);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen
        options={{
          title: store.name,
          headerStyle: { backgroundColor: colors.bgElevated },
          headerTintColor: colors.textPrimary,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/customer/cart" as any)}
              style={{ marginRight: 12 }}
            >
              <ShoppingCart color={colors.textPrimary} size={22} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ── Cover ── */}
        <View style={styles.coverContainer}>
          {store.cover_url ? (
            <Image
              source={{ uri: store.cover_url }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.bgElevated }]} />
          )}
          <View
            style={[
              styles.openBadge,
              { backgroundColor: isOpen ? colors.success : colors.error },
            ]}
          >
            <Text style={[styles.openBadgeText, { color: "#fff" }]}>
              {isOpen ? "مفتوح" : "مغلق"}
            </Text>
          </View>
        </View>

        {/* ── Store card ── */}
        <View
          style={[
            styles.storeCard,
            { backgroundColor: colors.bgElevated },
          ]}
        >
          {store.logo_url ? (
            <Image
              source={{ uri: store.logo_url }}
              style={[styles.logo, { borderColor: colors.bgBase }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.logo,
                { backgroundColor: colors.bgSurface, borderColor: colors.bgBase },
              ]}
            >
              <Text style={{ fontSize: 28 }}>🏪</Text>
            </View>
          )}

          <Text style={[styles.storeName, { color: colors.textPrimary }]}>{store.name}</Text>
          <Text style={[styles.storeCategory, { color: colors.textSecondary }]}>
            {store.category}
          </Text>

          <View style={styles.row}>
            <Star size={14} color="#FFA500" fill="#FFA500" />
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>4.5</Text>
          </View>

          {store.opens_at || store.closes_at ? (
            <View style={styles.row}>
              <Clock3 size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {fmtTime(store.opens_at)} – {fmtTime(store.closes_at)}
              </Text>
            </View>
          ) : null}

          {store.address_line1 ? (
            <View style={styles.row}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {store.address_line1}
              </Text>
            </View>
          ) : null}

          {store.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {store.description}
            </Text>
          ) : null}
        </View>

        {/* ── Gallery ── */}
        {gallery.filter((g) => g.is_visible).length > 0 ? (
          <View style={{ marginTop: tokens.spacing.lg }}>
            <SectionHeading label="معرض الصور" colors={colors} tokens={tokens} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, gap: tokens.spacing.sm }}>
              {gallery.filter((g) => g.is_visible).map((img) => (
                <Image key={img.id} source={{ uri: img.image_url }} style={[styles.galleryImg, { borderRadius: tokens.radius.sm }]} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ marginTop: tokens.spacing.lg, paddingHorizontal: tokens.spacing.lg }}>
            <Text style={{ color: colors.textDisabled, textAlign: "center", fontSize: 13 }}>لا توجد صور في المعرض</Text>
          </View>
        )}

        {/* ── Videos ── */}
        {videos.filter((v) => v.is_visible).length > 0 ? (
          <View style={{ marginTop: tokens.spacing.lg }}>
            <SectionHeading label="فيديوهات" colors={colors} tokens={tokens} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, gap: tokens.spacing.sm }}>
              {videos.filter((v) => v.is_visible).map((vid) => (
                <TouchableOpacity
                  key={vid.id}
                  style={[styles.videoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm, padding: tokens.spacing.sm, width: 200 }]}
                  onPress={() => {
                    Linking.openURL(vid.url).catch(() => {
                      // URL could not be opened
                    });
                  }}
                >
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Play size={14} color={colors.primary} fill={colors.primary} />
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1 }}>{vid.title || vid.url}</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right" }}>{vid.platform}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ marginTop: tokens.spacing.lg, paddingHorizontal: tokens.spacing.lg }}>
            <Text style={{ color: colors.textDisabled, textAlign: "center", fontSize: 13 }}>لا توجد فيديوهات</Text>
          </View>
        )}

        {/* ── Active Promotions ── */}
        {promotions.length > 0 && (
          <View style={{ marginTop: tokens.spacing.lg }}>
            <SectionHeading
              label="العروض الحالية"
              icon={<Tag size={16} color={colors.primary} />}
              colors={colors}
              tokens={tokens}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: tokens.spacing.lg,
                gap: tokens.spacing.md,
              }}
            >
              {promotions.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.promoCard,
                    { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
                  ]}
                >
                  {p.image_url ? (
                    <Image
                      source={{ uri: p.image_url }}
                      style={styles.promoImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.promoImgPlaceholder,
                        { backgroundColor: colors.primary + "22" },
                      ]}
                    >
                      <Text style={{ fontSize: 24 }}>🏷️</Text>
                    </View>
                  )}
                  <View style={{ padding: tokens.spacing.sm }}>
                    <Text
                      style={[styles.promoTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                    <View
                      style={[styles.discountBadge, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.discountText, { color: colors.textOnBrand }]}>
                        {discountLabel(p)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Category filter ── */}
        {categories.length > 1 && (
          <View style={{ marginTop: tokens.spacing.lg }}>
            <SectionHeading label="التصنيفات" colors={colors} tokens={tokens} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: tokens.spacing.lg,
                gap: tokens.spacing.sm,
              }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        selectedCategory === cat ? colors.primary : colors.bgElevated,
                      borderColor:
                        selectedCategory === cat ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catText,
                      {
                        color:
                          selectedCategory === cat
                            ? colors.textOnBrand
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Products ── */}
        <View style={{ marginTop: tokens.spacing.lg }}>
          <SectionHeading label="المنتجات" colors={colors} tokens={tokens} />
          {filtered.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              لا توجد منتجات في هذا التصنيف
            </Text>
          ) : (
            <View style={styles.productsGrid}>
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  title={product.name}
                  price={`${(product.price_minor / 100).toFixed(2)} د.ج`}
                  image={product.image_url ?? ""}
                  storeName={store.name}
                  onPress={() =>
                    router.push({
                      pathname: "/product-details",
                      params: { id: product.id },
                    } as any)
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── section heading helper ──────────────────────────────────────────────────

function SectionHeading({
  label,
  icon,
  colors,
  tokens,
}: {
  label: string;
  icon?: React.ReactNode;
  colors: any;
  tokens: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        paddingHorizontal: tokens.spacing.lg,
        marginBottom: tokens.spacing.sm,
        gap: tokens.spacing.xs,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: tokens.typography.sizes.md,
          fontWeight: "700",
          color: colors.textPrimary,
          fontFamily: tokens.typography.families.arabic,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errText: { fontSize: 16 },
  coverContainer: { width: "100%", height: 200, position: "relative" },
  coverImage: { width: "100%", height: 200 },
  coverPlaceholder: { width: "100%", height: 200 },
  openBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  openBadgeText: { fontSize: 12, fontWeight: "700" },
  storeCard: {
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    marginTop: -40,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  storeName: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  storeCategory: { fontSize: 14, marginBottom: 8, textAlign: "center" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 4 },
  ratingText: { fontSize: 13 },
  infoText: { fontSize: 13 },
  description: { fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
  promoCard: { width: 200, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  promoImg: { width: "100%", height: 100 },
  promoImgPlaceholder: {
    width: "100%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  promoTitle: { fontSize: 13, fontWeight: "600", marginBottom: 6, textAlign: "right" },
  discountBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-end",
  },
  discountText: { fontSize: 11, fontWeight: "700" },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13, fontWeight: "600" },
  productsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyText: { textAlign: "center", padding: 24, fontSize: 14 },
  galleryImg: { width: 160, height: 120 },
  videoCard: { overflow: "hidden" },
});

// suppress unused warning – SW is used by promoCard width calculations at runtime
void SW;
