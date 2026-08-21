import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, Alert } from 'react-native';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  RefreshControl,
  Image,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MediaViewerModal from "@/components/MediaViewerModal";
import {
  Typography,
  Header,
  ProductCard,
  SearchBar,
  EmptyState,
  ImageFallback,
  Avatar,
  Rating,
  Badge,
  Button,
} from "@/components/ui";
import { Store as StoreIcon, Heart, MessageCircle, Star, Eye } from "lucide-react-native";
import { toggleFavorite, checkIfFavorite, getFavoriteIds } from "@/services/favorite.service";
import { getOrCreateConversation } from "@/services/chat.service";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getNumericMetric = (...values: unknown[]): number | null => {
  const value = values.find(
    (candidate): candidate is number =>
      typeof candidate === "number" && Number.isFinite(candidate),
  );
  return value ?? null;
};

export default function StoreDetailsScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ id: string }>();
  const rawId = rawParams.id;
  const id = rawId && UUID_REGEX.test(rawId) ? rawId : undefined;
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [mediaTab, setMediaTab] = useState<"photos" | "videos">("photos");
  const [categories, setCategories] = useState<string[]>(["الكل"]);
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUserRole, setCurrentUserRole] = useState<string | undefined>(undefined);
  const [viewingMediaItem, setViewingMediaItem] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [startingChat, setStartingChat] = useState(false);
  const reviewCount = getNumericMetric(store?.review_count);
  const viewCount = getNumericMetric(store?.view_count, store?.views_count, store?.views);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setCurrentUserRole(profileData?.role ?? undefined);
        
        // Fetch favorites
        checkIfStoreFavorite();
        fetchFavoriteProducts();
      }
    };
    checkAuth();
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchStoreData();
  }, [id]);

  const checkIfStoreFavorite = async () => {
    if (id) {
      const fav = await checkIfFavorite('store', id);
      setIsFavorite(fav);
    }
  };

  const fetchFavoriteProducts = async () => {
    const ids = await getFavoriteIds('product');
    setFavoriteProductIds(ids);
  };

  const handleToggleStoreFavorite = async () => {
    if (id) {
      const { isFavorite: nextFav, error } = await toggleFavorite('store', id);
      if (!error) setIsFavorite(nextFav);
    }
  };

  const handleStartChat = async () => {
    if (!currentUserId) {
      Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لبدء محادثة");
      return;
    }

    if (!store?.merchant_id) {
      Alert.alert("خطأ", "تعذر العثور على مالك المتجر");
      return;
    }

    if (currentUserId === store.merchant_id) {
      Alert.alert("تنبيه", "أنت مالك هذا المتجر");
      return;
    }

    try {
      setStartingChat(true);
      // Determine relationship type based on current user role
      const relationshipType = currentUserRole === "driver" ? "merchant_courier" : "customer_merchant";
      
      const { data: conversationId, error } = await getOrCreateConversation(
        store.merchant_id,
        relationshipType
      );
      
      if (error) {
        console.error("Chat error:", error);
        Alert.alert("خطأ", "لا توجد علاقة تجارية مؤهلة لبدء محادثة (يجب أن يكون المتجر في المفضلة أو لديك طلب نشط معه)");
        return;
      }
      
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      Alert.alert("خطأ", "فشل بدء المحادثة");
    } finally {
      setStartingChat(false);
    }
  };

  const handleToggleProductFavorite = async (productId: string) => {
    const { isFavorite: nextFav, error } = await toggleFavorite('product', productId);
    if (!error) {
      setFavoriteProductIds(prev => 
        nextFav ? [...prev, productId] : prev.filter(pid => pid !== productId)
      );
    }
  };

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      // Fetch store
      const { data: storeData, error: storeErr } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();

      if (storeErr) throw storeErr;
      setStore(storeData);

      // Fetch products
      const { data: prodsData, error: prodsErr } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", id);

       if (prodsErr) throw prodsErr;
      setProducts(prodsData || []);

      // Fetch gallery (active images only)
      const { data: galleryData, error: galleryErr } = await supabase
        .from("store_gallery")
        .select("*")
        .eq("store_id", id)
        .eq("is_visible", true);

      if (galleryErr) console.error("Gallery fetch error:", galleryErr);
      setGallery(galleryData || []);

      // Extract unique categories
      const catsSet = new Set<string>();
      (prodsData || []).forEach((p) => {
        if (p.category) catsSet.add(p.category);
      });
      setCategories(["الكل", ...Array.from(catsSet)]);
    } catch (err) {
      console.error("Error fetching store data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStoreData();
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "الكل" || p.category === selectedCategory;
      const matchesQuery =
        !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  if (!id) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <Header title="معرف غير صالح" />
        <EmptyState type="no-stores" description="معرف المتجر غير صالح أو مفقود" />
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <Header title="المتجر غير موجود" />
        <EmptyState type="no-stores" description="تعذّر العثور على المتجر المطلوب" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header title={store.name} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Cover Header */}
        <View style={styles.coverWrapper}>
          <ImageFallback
            uri={store.cover_url}
            type="cover"
            title={store.name}
            category={store.category}
            width="100%"
             height={220}
            borderRadius={TOKENS.radius.md}
          />
        </View>

        {/* Merchant / Founder Management Banner */}
        {currentUserId && (currentUserRole === 'founder' || currentUserRole === 'admin' || (currentUserRole === 'merchant' && store.merchant_id === currentUserId)) && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              marginHorizontal: TOKENS.spacing.md,
              marginBottom: TOKENS.spacing.md,
              padding: TOKENS.spacing.md,
              borderRadius: TOKENS.radius.md,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => router.push('/merchant/store')}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
              <StoreIcon color="#fff" size={20} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginRight: 8, fontFamily: TOKENS.typography.families.arabic }}>
                ⚙️ لوحة إدارة هذا المتجر
              </Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 12, opacity: 0.9, fontFamily: TOKENS.typography.families.arabic }}>إدارة المنتجات والصور ←</Text>
          </TouchableOpacity>
        )}

        {/* Store Card Header Info */}
        <View style={[styles.storeCardInfo, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={styles.avatarRow}>
            <Avatar
              uri={store.logo_url}
              name={store.name}
              type="store"
              size={96}
              style={styles.avatarImage}
            />
          </View>

          <View style={[styles.quickActionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {currentUserId && (
              <TouchableOpacity
                onPress={handleToggleStoreFavorite}
                style={[styles.iconAction, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="إضافة المتجر إلى المفضلة"
              >
                <Heart
                  size={22}
                  color={isFavorite ? colors.error : colors.textPrimary}
                  fill={isFavorite ? colors.error : "transparent"}
                />
              </TouchableOpacity>
            )}
            {currentUserId && currentUserId !== store.merchant_id && (
              <TouchableOpacity
                onPress={handleStartChat}
                style={[styles.iconAction, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}55` }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="بدء محادثة مع المتجر"
              >
                {startingChat ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MessageCircle size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {store.is_featured === true ? (
            <View style={[styles.featuredBadge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}66` }]}>
              <Star size={14} color={colors.primary} fill={colors.primary} />
              <Typography variant="caption" style={{ color: colors.primary, fontWeight: "800" }}>
                متجر مميز
              </Typography>
            </View>
          ) : null}

          <Typography variant="h1" align="center" style={styles.storeTitle}>
            {store.name}
          </Typography>

          <Typography variant="caption" color="secondary" align="center" style={styles.storeCategory}>
            {store.category || "متجر في عين صفراء"}
          </Typography>

          <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.statItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Rating rating={store.rating ?? 0} count={reviewCount ?? undefined} size="sm" />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>التقييم</Text>
            </View>
            {reviewCount !== null ? (
              <View style={[styles.statItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{reviewCount.toLocaleString("ar-DZ")}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>مراجعة</Text>
              </View>
            ) : null}
            {viewCount !== null ? (
              <View style={[styles.statItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.statIconRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Eye size={14} color={colors.textSecondary} />
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{viewCount.toLocaleString("ar-DZ")}</Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>مشاهدة</Text>
              </View>
            ) : null}
            <View style={[styles.statusItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Badge
                label={store.is_open !== false ? "مفتوح الآن" : "مغلق"}
                variant={store.is_open !== false ? "success" : "error"}
              />
            </View>
          </View>

          {store.description ? (
            <Typography variant="body" color="secondary" align="center" style={styles.storeDesc}>
              {store.description}
            </Typography>
          ) : null}

          {/* Main Action Buttons */}
          <View style={styles.mainActionRow}>
            <Button
              title="دردشة مع المتجر"
              variant="outline"
              loading={startingChat}
              icon={<MessageCircle size={18} color={colors.primary} />}
              onPress={handleStartChat}
              style={styles.chatButton}
            />
          </View>
        </View>

        {/* Media Section: Photos / Videos Tabs (above products) */}
        <View style={styles.mediaSection}>
          <View style={styles.mediaHeadingRow}>
            <Typography variant="h2" style={{ color: colors.textPrimary }}>
              معرض المتجر
            </Typography>
            {gallery.length > 0 ? (
              <Text style={[styles.mediaCount, { color: colors.textSecondary }]}>
                {gallery.length.toLocaleString("ar-DZ")} صور
              </Text>
            ) : null}
          </View>
          <View style={styles.mediaTabs}>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => setMediaTab("photos")}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderBottomWidth: mediaTab === "photos" ? 2 : 1,
                borderBottomColor: mediaTab === "photos" ? colors.primary : colors.borderSubtle,
              }}
            >
              <Typography
                variant="subtitle"
                style={{
                  fontWeight: mediaTab === "photos" ? "700" : "500",
                  color: mediaTab === "photos" ? colors.primary : colors.textSecondary,
                }}
              >
                صور
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => setMediaTab("videos")}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderBottomWidth: mediaTab === "videos" ? 2 : 1,
                borderBottomColor: mediaTab === "videos" ? colors.primary : colors.borderSubtle,
              }}
            >
              <Typography
                variant="subtitle"
                style={{
                  fontWeight: mediaTab === "videos" ? "700" : "500",
                  color: mediaTab === "videos" ? colors.primary : colors.textSecondary,
                }}
              >
                فيديو
              </Typography>
            </TouchableOpacity>
          </View>

          {/* Photos Tab Content */}
          {mediaTab === "photos" && (
            gallery.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.galleryScroll, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                {gallery.map((img) => (
                  <TouchableOpacity activeOpacity={0.8} key={img.id} onPress={() => setViewingMediaItem(img)} style={styles.galleryItem}>
                    <Image
                      source={{ uri: img.image_url }}
                      style={[styles.galleryImage, { borderColor: colors.borderSubtle }]}
                      resizeMode="cover"
                    />
                    {img.title ? (
                      <Text style={[styles.galleryTitle, { color: colors.textPrimary }]}>{img.title}</Text>
                    ) : null}
                    {img.caption ? (
                      <Text style={[styles.galleryCaption, { color: colors.textSecondary }]}>{img.caption}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center", padding: 16 }}>
                لا توجد صور في المعرض.
              </Text>
            )
          )}

          {/* Videos Tab Content */}
          {mediaTab === "videos" && (
            <View style={[styles.videoPlaceholder, { borderColor: colors.borderSubtle, backgroundColor: colors.bgElevated }]}>

              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center" }}>
                لا توجد فيديوهات متاحة حالياً
              </Text>
            </View>
          )}
        </View>

        {/* Search Bar in Store */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`ابحث في منتجات ${store.name}...`}
          />
        </View>

        {/* Categories Bar */}
        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.categoriesScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryChip,
                  { backgroundColor: selectedCategory === cat ? colors.primary : colors.bgElevated },
                  { borderColor: colors.borderSubtle, borderWidth: 1 }
                ]}
              >
                <Typography
                  variant="caption"
                  style={{ color: selectedCategory === cat ? "#fff" : colors.textPrimary }}
                >
                  {cat}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Products Grid */}
        <View style={styles.productsSectionHeader}>
          <Typography variant="h2" style={{ color: colors.textPrimary }}>
            منتجات المتجر
          </Typography>
          <Text style={[styles.productsCount, { color: colors.textSecondary }]}>
            {filteredProducts.length.toLocaleString("ar-DZ")} منتج
          </Text>
        </View>
        <View style={styles.productsGrid}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <View key={product.id} style={styles.productCardWrapper}>
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={product.price_minor / 100}
                  image={product.image_url}
                  isFavorite={favoriteProductIds.includes(product.id)}
                  onToggleFavorite={() => handleToggleProductFavorite(product.id)}
                  onPress={() => router.push({ pathname: "/product-details", params: { id: product.id } })}
                  style={styles.productCard}
                />
              </View>
            ))
          ) : (
            <EmptyState
              type="no-data"
              title={searchQuery ? "لا توجد منتجات مطابقة" : "لا توجد منتجات في هذا القسم"}
              description={searchQuery ? "جرّب كلمة بحث أخرى." : "سيظهر محتوى المتجر هنا عند توفر المنتجات."}
            />
          )}
        </View>
      </ScrollView>

      {/* Media Viewer */}
      {viewingMediaItem && (
        <MediaViewerModal
          visible={!!viewingMediaItem}
          mediaItem={viewingMediaItem}
          store={store}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setViewingMediaItem(null)}
        />
      )}
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
  scrollContent: {
    paddingBottom: TOKENS.spacing.xl,
  },
  coverWrapper: {
    paddingHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  storeCardInfo: {
    marginHorizontal: TOKENS.spacing.md,
    paddingHorizontal: TOKENS.spacing.md,
    paddingTop: TOKENS.spacing.sm,
    paddingBottom: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatarRow: {
    marginTop: -TOKENS.spacing.xl - TOKENS.spacing.md,
    marginBottom: 2,
    padding: 4,
    borderWidth: 4,
    borderColor: '#fff',
    borderRadius: TOKENS.radius.full,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
  },
  avatarImage: {
    borderRadius: TOKENS.radius.full,
  },
  quickActionsRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: TOKENS.spacing.sm,
    marginTop: 2,
    marginBottom: TOKENS.spacing.xs,
  },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  storeTitle: {
    marginTop: 4,
  },
  storeCategory: {
    marginTop: 0,
  },
  statsRow: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: TOKENS.spacing.xs,
    marginTop: TOKENS.spacing.sm,
  },
  statItem: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: TOKENS.spacing.xs,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: TOKENS.typography.sizes.base,
    fontWeight: '800',
    fontFamily: TOKENS.typography.families.arabic,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    fontFamily: TOKENS.typography.families.arabic,
    lineHeight: 18,
  },
  statIconRow: {
    alignItems: 'center',
    gap: 4,
  },
  statusItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeDesc: {
    marginTop: TOKENS.spacing.sm,
    lineHeight: 21,
    paddingHorizontal: TOKENS.spacing.xs,
  },
  mainActionRow: {
    width: '100%',
    marginTop: TOKENS.spacing.sm,
  },
  chatButton: {
    width: '100%',
  },
  mediaSection: {
    marginTop: TOKENS.spacing.lg,
    paddingHorizontal: TOKENS.spacing.md,
  },
  mediaHeadingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: TOKENS.spacing.xs,
  },
  mediaCount: {
    fontSize: TOKENS.typography.sizes.xs,
    fontFamily: TOKENS.typography.families.secondary,
  },
  mediaTabs: {
    flexDirection: 'row-reverse',
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.sm,
  },
  galleryScroll: {
    gap: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.xs,
  },
  galleryItem: {
    width: 164,
    alignItems: 'center',
  },
  galleryImage: {
    width: 164,
    height: 164,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
  },
  galleryTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: '700',
    fontFamily: TOKENS.typography.families.arabic,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: TOKENS.spacing.xs,
  },
  galleryCaption: {
    fontSize: TOKENS.typography.sizes.xs,
    fontFamily: TOKENS.typography.families.secondary,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 2,
  },
  videoPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.lg,
  },
  categoriesScroll: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.full,
    marginHorizontal: 4,
  },
  productsSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
  },
  productsCount: {
    fontSize: TOKENS.typography.sizes.xs,
    fontFamily: TOKENS.typography.families.secondary,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.xs,
  },
  productCardWrapper: {
    width: '50%',
    paddingHorizontal: 3,
  },
  productCard: {
    padding: 2,
    marginVertical: 3,
  },
});
