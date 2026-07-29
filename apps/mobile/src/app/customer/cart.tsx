import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Typography,
  Button,
  Card,
  Price,
  QuantitySelector,
  EmptyState,
  Header,
  ImageFallback,
  Dialog,
} from "@/components/ui";
import { Trash2, ArrowLeft, ArrowRight, ShoppingBag, ShieldCheck } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getCart,
  removeFromCart,
  updateCartItemQuantity,
  CartItem,
} from "@/services/cart.service";

export default function CustomerCartScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const items = await getCart();
      setCartItems(items);
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItemToRemove(productId);
      return;
    }
    const updatedCart = await updateCartItemQuantity(productId, quantity);
    setCartItems(updatedCart);
  };

  const confirmRemoveItem = async () => {
    if (!itemToRemove) return;
    const updatedCart = await removeFromCart(itemToRemove);
    setCartItems(updatedCart);
    setItemToRemove(null);
  };

  const calculateSubtotalMinor = () => {
    return cartItems.reduce(
      (sum, item) => sum + (item.product.price_minor || 0) * item.quantity,
      0
    );
  };

  const deliveryFeeMinor = cartItems.length > 0 ? 20000 : 0; // 200 DZD
  const subtotalMinor = calculateSubtotalMinor();
  const totalMinor = subtotalMinor + deliveryFeeMinor;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
        <Header title="سلة التسوق" />
        <EmptyState
          type="empty-cart"
          onAction={() => router.push("/customer/home")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header title={`سلة التسوق (${cartItems.length})`} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cart Items List */}
        {cartItems.map((item) => {
          const itemTotalMinor = (item.product.price_minor || 0) * item.quantity;
          return (
            <Card key={item.product.id} style={styles.cartCard}>
              <View style={[styles.itemRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {/* Product Image */}
                <ImageFallback
                  uri={item.product.image_url}
                  type="product"
                  title={item.product.name}
                  width={80}
                  height={80}
                  borderRadius={TOKENS.radius.md}
                />

                {/* Details */}
                <View style={styles.itemDetails}>
                  <View style={[styles.itemHeaderRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Typography variant="h3" align="right" numberOfLines={1} style={{ flex: 1 }}>
                      {item.product.name}
                    </Typography>

                    <TouchableOpacity
                      onPress={() => setItemToRemove(item.product.id)}
                      style={styles.trashBtn}
                    >
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <Price amount={item.product.price_minor || 0} isMinor size="sm" variant="brand" />

                  <View style={[styles.quantityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <QuantitySelector
                      quantity={item.quantity}
                      onIncrement={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                      onDecrement={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                    />
                    <Price amount={itemTotalMinor} isMinor size="md" />
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Order Cost Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <Typography variant="h3" align="right" style={{ marginBottom: TOKENS.spacing.md }}>
            ملخص الطلب
          </Typography>

          <View style={[styles.summaryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="body" color="secondary">مجموع المنتجات</Typography>
            <Price amount={subtotalMinor} isMinor size="sm" />
          </View>

          <View style={[styles.summaryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="body" color="secondary">رسوم التوصيل (عين صفراء)</Typography>
            <Price amount={deliveryFeeMinor} isMinor size="sm" />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={[styles.summaryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="h2">المبلغ الإجمالي</Typography>
            <Price amount={totalMinor} isMinor size="lg" variant="brand" />
          </View>
        </View>

        {/* Safety Note */}
        <View style={[styles.safetyNote, { backgroundColor: `${colors.success}12` }]}>
          <ShieldCheck size={18} color={colors.success} />
          <Typography variant="caption" style={{ color: colors.success, flex: 1 }}>
            الدفع نقداً عند الاستلام أو عبر بريدي موب عند وصول السائق.
          </Typography>
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer CTA */}
      <View style={[styles.footer, { backgroundColor: colors.bgElevated, borderTopColor: colors.borderSubtle }]}>
        <View style={[styles.footerTotalRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View>
            <Typography variant="caption" color="secondary">المبلغ الكلي</Typography>
            <Price amount={totalMinor} isMinor size="xl" variant="brand" />
          </View>

          <View style={{ flex: 1, maxWidth: 200 }}>
            <Button
              title="متابعة الشراء"
              onPress={() => router.push("/checkout")}
              variant="primary"
              size="lg"
              icon={isRTL ? <ArrowLeft size={20} color={colors.textOnBrand} /> : <ArrowRight size={20} color={colors.textOnBrand} />}
            />
          </View>
        </View>
      </View>

      {/* Remove Confirmation Dialog */}
      <Dialog
        visible={!!itemToRemove}
        onClose={() => setItemToRemove(null)}
        title="حذف المنتج من السلة"
        description="هل أنت متأكد من رغبتك في إزالة هذا المنتج من سلة التسوق؟"
        confirmTitle="حذف"
        cancelTitle="إلغاء"
        type="danger"
        onConfirm={confirmRemoveItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 110,
    gap: TOKENS.spacing.md,
  },
  cartCard: {
    padding: TOKENS.spacing.md,
  },
  itemRow: {
    gap: TOKENS.spacing.md,
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemHeaderRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  trashBtn: {
    padding: 4,
  },
  quantityRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: TOKENS.spacing.sm,
  },
  summaryCard: {
    padding: TOKENS.spacing.lg,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    marginTop: TOKENS.spacing.sm,
  },
  summaryRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: TOKENS.spacing.md,
  },
  safetyNote: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    gap: TOKENS.spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: TOKENS.spacing.lg,
    borderTopWidth: 1,
    ...TOKENS.shadows.medium,
  },
  footerTotalRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});
