import React, { useState, useEffect } from "react";
import { StyleSheet } from 'react-native';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  I18nManager,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Typography,
  Button,
  Price,
  Rating,
  Avatar,
  ImageFallback,
  QuantitySelector,
  Header,
  Badge,
} from "@/components/ui";
import { Store as StoreIcon, Heart, Share2, ShoppingBag } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [product, setProduct] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [specialNotes, setSpecialNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          stores (
            id,
            name,
            logo_url,
            category,
            status,
            is_open
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
      if (data?.stores) {
        setStore(data.stores);
      }
    } catch (err) {
      console.error("Error fetching product details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("مطلوب تسجيل الدخول", "يرجى تسجيل الدخول لإضافة منتجات إلى السلة", [
          { text: "إلغاء", style: "cancel" },
          { text: "تسجيل الدخول", onPress: () => router.push("/login") },
        ]);
        return;
      }

      // Check for active cart
      let { data: cart } = await supabase
        .from("carts")
        .select("id, store_id")
        .eq("customer_id", user.id)
        .maybeSingle();

      if (!cart) {
        const { data: newCart, error: cartErr } = await supabase
          .from("carts")
          .insert({ customer_id: user.id, store_id: store?.id })
          .select()
          .single();
        if (cartErr) throw cartErr;
        cart = newCart;
      }

      // Add item to cart_items
      const { error: itemErr } = await supabase.from("cart_items").insert({
        cart_id: cart.id,
        product_id: product.id,
        quantity,
        special_instructions: specialNotes,
      });

      if (itemErr) throw itemErr;

      Alert.alert("تمت الإضافة", "تمت إضافة المنتج بنجاح إلى سلة التسوق", [
        { text: "متابعة التسوق", style: "cancel" },
        { text: "عرض السلة", onPress: () => router.push("/customer/cart") },
      ]);
    } catch (err: any) {
      console.error("Cart error:", err);
      Alert.alert("خطأ", "تعذّر إضافة المنتج إلى السلة");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading || !product) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const priceMajor = (product.price_minor || 0) / 100;
  const totalPrice = priceMajor * quantity;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header
        title={product.name}
        rightElement={
          <TouchableOpacity activeOpacity={0.8} onPress={() => setIsFavorite(!isFavorite)} style={{ padding: 4 }}>
            <Heart size={22} color={isFavorite ? colors.error : colors.textPrimary} fill={isFavorite ? colors.error : "transparent"} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Image Gallery Fallback */}
        <View style={styles.imageGalleryWrapper}>
          <ImageFallback
            uri={product.image_url}
            type="product"
            title={product.name}
            category={product.category}
            height={260}
            borderRadius={TOKENS.radius.lg}
          />
        </View>

        {/* Product Header & Title */}
        <View style={styles.sectionCard}>
          <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Typography variant="h1" align="right" style={{ flex: 1 }}>
              {product.name}
            </Typography>
            <Badge
              text={product.is_available !== false ? "متوفر" : "غير متوفر"}
              variant={product.is_available !== false ? "success" : "error"}
            />
          </View>

          {/* Price Component */}
          <View style={[styles.priceWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Price amount={priceMajor} size="xl" variant="brand" />
            {product.unit && (
              <Typography variant="body" color="secondary" style={{ marginRight: 6 }}>
                / {product.unit}
              </Typography>
            )}
          </View>

          {/* Description */}
          {product.description ? (
            <Typography variant="body" color="secondary" align="right" style={styles.descriptionText}>
              {product.description}
            </Typography>
          ) : null}
        </View>

        {/* Store Card Link */}
        {store && (
          <TouchableOpacity activeOpacity={0.8}
            onPress={() => router.push({ pathname: "/store-details", params: { id: store.id } })}
            style={[
              styles.storeCardLink,
              { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={[styles.storeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Avatar uri={store.logo_url} name={store.name} type="store" size="md" />
              <View style={styles.storeTextCol}>
                <Typography variant="h3" align="right">{store.name}</Typography>
                <Typography variant="caption" color="secondary" align="right">
                  {store.category || "متجر في عين صفراء"}
                </Typography>
              </View>
              <Badge text="تصفح المتجر" variant="primary" />
            </View>
          </TouchableOpacity>
        )}

        {/* Quantity Selector */}
        <View style={styles.sectionCard}>
          <Typography variant="h3" align="right" style={{ marginBottom: TOKENS.spacing.md }}>
            الكمية المطلوبة
          </Typography>
          <View style={[styles.quantityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <QuantitySelector
              quantity={quantity}
              onIncrement={() => setQuantity((q) => q + 1)}
              onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            />
            <Typography variant="h2" color="primary">
              إجمالي: {totalPrice.toFixed(0)} د.ج
            </Typography>
          </View>
        </View>

        {/* Special Instructions */}
        <View style={styles.sectionCard}>
          <Typography variant="h3" align="right" style={{ marginBottom: TOKENS.spacing.xs }}>
            ملاحظات خاصة للطلب (اختياري)
          </Typography>
          <TextInput
            value={specialNotes}
            onChangeText={setSpecialNotes}
            placeholder="مثال: بدون سكر، تغليف هدايا، تسليم عند المدخل..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            textAlign={isRTL ? "right" : "left"}
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                fontFamily: TOKENS.typography.families.arabic,
              },
            ]}
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom Add to Cart CTA */}
      <View
        style={[
          styles.stickyBottom,
          {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.borderSubtle,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={styles.priceColumn}>
          <Typography variant="caption" color="secondary">السعر الإجمالي</Typography>
          <Price amount={totalPrice} size="lg" variant="brand" />
        </View>

        <View style={styles.ctaButtonWrapper}>
          <Button
            title="إضافة إلى السلة"
            onPress={handleAddToCart}
            variant="primary"
            size="lg"
            loading={addingToCart}
            disabled={product.is_available === false}
            icon={<ShoppingBag size={20} color={colors.textOnBrand} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    paddingBottom: 100,
  },
  imageGalleryWrapper: {
    marginBottom: TOKENS.spacing.lg,
  },
  sectionCard: {
    marginBottom: TOKENS.spacing.lg,
  },
  rowBetween: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceWrapper: {
    alignItems: "baseline",
    marginTop: TOKENS.spacing.xs,
    marginBottom: TOKENS.spacing.sm,
  },
  descriptionText: {
    lineHeight: 22,
    marginTop: TOKENS.spacing.xs,
  },
  storeCardLink: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.lg,
  },
  storeRow: {
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  storeTextCol: {
    flex: 1,
  },
  quantityRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: TOKENS.radius.md,
    padding: TOKENS.spacing.md,
    height: 80,
    textAlignVertical: "top",
  },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: TOKENS.spacing.lg,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
    ...TOKENS.shadows.medium,
  },
  priceColumn: {
    justifyContent: "center",
  },
  ctaButtonWrapper: {
    flex: 1,
    maxWidth: 220,
  },
});
