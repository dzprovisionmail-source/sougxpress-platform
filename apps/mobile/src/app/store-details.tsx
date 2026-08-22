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
import { Store as StoreIcon, Heart, MessageCircle, Star, Eye, ChevronRight, ChevronLeft } from "lucide-react-native";
import { getPromotionalViews, calculateViews } from "@/services/promotional-views.service";
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
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUserRole, setCurrentUserRole] = useState<string | undefined>(undefined);
  const [viewingMediaItem, setViewingMediaItem] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [startingChat, setStartingChat] = useState(false);
  const [promoViews, setPromoViews] = useState<number | null>(null);
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
      setLoadingGallery(true);
      setLoadingProducts(true);
      
      // Fetch store basic info
      const { data: storeData, error: storeErr } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();

      if (storeErr) throw storeErr;
      setStore(storeData);
      setLoading(false);

      // Fetch promotional views
      try {
        const promoData = await getPromotionalViews("store", id);
        if (promoData) {
          setPromoViews(promoData.currentViews);
        }
      } catch (e) {
        console.error("Error fetching promo views:", e);
      }

      // Fetch gallery (active images only)
      const { data: galleryData, error: galleryErr } = await supabase
        .from("store_gallery")
        .select("*")
        .eq("store_id", id)
        .eq("is_visible", true);

      if (galleryErr) console.error("Gallery fetch error:", galleryErr);
      setGallery(galleryData || []);
      setLoadingGallery(false);

      // Fetch products
      const { data: prodsData, error: prodsErr } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", id);

      if (prodsErr) throw prodsErr;
      setProducts(prodsData || []);
      setLoadingProducts(false);

      // Extract unique categories
      const catsSet = new Set<string>();
      (prodsData || []).forEach((p) => {
        if (p.category) catsSet.add(p.category);
      });
      setCategories(["الكل", ...Array.from(catsSet)]);
    } catch (err) {
      console.error("Error fetching store data:", err);
      setLoading(false);
      setLoadingGallery(false);
      setLoadingProducts(false);
    } finally {
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
          
          {/* Top Header Section with Side Buttons */}
          <View style={[styles.headerTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {/* Left Button: Favorite */}
            <View style={styles.sideActionContainer}>
              {currentUserId && (
                <TouchableOpacity
                  onPress={handleToggleStoreFavorite}
                  style={[styles.iconAction, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
                  activeOpacity={0.8}
                >
                  <Heart
                    size={22}
                    color={isFavorite ? colors.error : colors.textPrimary}
                    fill={isFavorite ? colors.error : "transparent"}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Center: Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                <Avatar
                  uri={store.logo_url}
                  name={store.name}
                  type="store"
                  size={90}
                  style={styles.avatarImage}
                />
              </View>
            </View>

            {/* Right Button: Quick Chat */}
            <View style={styles.sideActionContainer}>
              {currentUserId && currentUserId !== store.merchant_id && (
                <TouchableOpacity
                  onPress={handleStartChat}
                  style={[styles.iconAction, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}44` }]}
                  activeOpacity={0.8}
                >
                  {startingChat ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MessageCircle size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Featured Badge */}
          {store.is_featured === true ? (
            <View style={[styles.featuredBadge, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}44` }]}>
              <Star size={12} color={colors.primary} fill={colors.primary} />
              <Typography variant="caption" style={{ color: colors.primary, fontWeight: "800", fontSize: 11 }}>
                متجر مميز
              </Typography>
            </View>
          ) : null}

          <Typography variant="h2" align="center" style={styles.storeTitle}>
            {store.name}
          </Typography>

          <Typography variant="caption" color="secondary" align="center" style={styles.storeCategory}>
            {store.category || "سوبر ماركت"}
          </Typography>

          {/* Stats Row - Now at the top of info */}
          <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.statItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Rating rating={store.rating ?? 0} count={reviewCount ?? 0} size="sm" />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>التقييم</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{ (reviewCount || 0).toLocaleString("ar-DZ")}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>مراجعة</Text>
            </View>
            {promoViews !== null && (
              <View style={[styles.statItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{typeof promoViews === 'number' ? promoViews.toLocaleString("ar-DZ") : '0'}</Text>
                  <Eye size={14} color={colors.textSecondary} />
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>مشاهدة</Text>
              </View>
            )}
            <View style={[styles.statusItem, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Badge
                label={store.is_open !== false ? "مفتوح الآن" : "مغلق"}
                variant={store.is_open !== false ? "success" : "error"}
              />
            </View>
          </View>

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

        {/* Separate Media Section - Below Store Card Info */}
        <View style={[styles.separateMediaSection, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={styles.mediaTabs}>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => setMediaTab("photos")}
              style={[styles.mediaTabButton, mediaTab === "photos" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Typography variant="subtitle" style={{ fontSize: 14, color: mediaTab === "photos" ? colors.primary : colors.textSecondary }}>
                صور
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => setMediaTab("videos")}
              style={[styles.mediaTabButton, mediaTab === "videos" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Typography variant="subtitle" style={{ fontSize: 14, color: mediaTab === "videos" ? colors.primary : colors.textSecondary }}>
                فيديو
              </Typography>
            </TouchableOpacity>
          </View>

          {mediaTab === "photos" && (
            loadingGallery ? (
              <View style={{ height: 240, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : gallery.length > 0 ? (
              <View style={styles.galleryWrapper}>
                {/* Left Indicator Arrow */}
                <View style={[styles.galleryArrow, { left: -5 }]}>
                  <ChevronLeft size={20} color={colors.textSecondary} opacity={0.5} />
                </View>
                
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
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Right Indicator Arrow */}
                <View style={[styles.galleryArrow, { right: -5 }]}>
                  <ChevronRight size={20} color={colors.textSecondary} opacity={0.5} />
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center", paddingVertical: 20 }}>
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
          {loadingProducts ? (
            <View style={{ width: '100%', height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : filteredProducts.length > 0 ? (
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
    paddingHorizontal: TOKENS.spacing.sm,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  headerTopRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -45,
    paddingHorizontal: TOKENS.spacing.xs,
  },
  sideActionContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBorder: {
    padding: 3,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: TOKENS.radius.full,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    backgroundColor: '#fff',
  },
  avatarImage: {
    borderRadius: TOKENS.radius.full,
  },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    marginTop: 8,
  },
  storeTitle: {
    marginTop: 8,
    fontWeight: '900',
    fontSize: 22,
  },
  storeCategory: {
    marginTop: 0,
    opacity: 0.7,
    fontSize: 13,
  },
  separateMediaSection: {
    marginHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.md,
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
  },
  mediaTabs: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 16,
  },
  mediaTabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  galleryWrapper: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryArrow: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    top: '40%',
  },
  galleryScroll: {
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  galleryItem: {
    width: 240,
    alignItems: 'center',
  },
  galleryImage: {
    width: 240,
    height: 240,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1.5,
  },
  galleryTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: TOKENS.typography.families.arabic,
    textAlign: 'center',
    marginTop: 10,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  statItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: TOKENS.typography.families.arabic,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: TOKENS.typography.families.arabic,
    marginTop: -2,
  },
  statusItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainActionRow: {
    width: '100%',
    marginTop: 16,
  },
  chatButton: {
    width: '100%',
    height: 48,
  },
  videoPlaceholder: {
    width: '100%',
    height: 240,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
  },
  categoriesScroll: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.xs,
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
    marginTop: TOKENS.spacing.xs,
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
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  productCard: {
    transform: [{ scale: 0.82 }],
    margin: -15,
  },
});
