import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Button,
  Card,
  QuantitySelector,
} from "@/components/ui";
import { Trash2, ShoppingBag, ChevronRight, ChevronLeft } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { getCart, removeFromCart, updateCartItemQuantity, clearCart, CartItem } from "@/services/cart.service";
import { I18nManager } from "react-native";

export default function CustomerCartScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    const updatedCart = await updateCartItemQuantity(productId, quantity);
    setCartItems(updatedCart);
  };

  const handleRemoveItem = async (productId: string) => {
    Alert.alert(
      "حذف المنتج",
      "هل أنت متأكد أنك تريد حذف هذا المنتج من السلة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            const updatedCart = await removeFromCart(productId);
            setCartItems(updatedCart);
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price_minor * item.quantity), 0);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: colors.bgElevated }]}>
            <ShoppingBag color={colors.textDisabled} size={64} />
          </View>
          <Typography variant="h2" align="center" style={styles.emptyTitle}>سلة التسوق فارغة</Typography>
          <Typography variant="body" color="secondary" align="center" style={styles.emptySubtitle}>
            ابدأ بإضافة بعض المنتجات الرائعة إلى سلتك!
          </Typography>
          <Button
            title="ابدأ التسوق"
            onPress={() => router.push("/customer/home")}
            style={styles.emptyBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <View style={styles.header}>
        <Typography variant="h1" align="right" style={styles.headerTitle}>سلة التسوق</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cartItems.map((item) => (
          <Card key={item.product.id} style={styles.cartItem}>
            <View style={[styles.itemRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.bgElevated }]}>
                {item.product.image_url ? (
                  <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
                ) : (
                  <ShoppingBag color={colors.textDisabled} size={24} />
                )}
              </View>
              
              <View style={[styles.itemDetails, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <View style={[styles.itemHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Typography variant="h3" style={styles.productName} numberOfLines={1}>
                    {item.product.name}
                  </Typography>
                  <TouchableOpacity onPress={() => handleRemoveItem(item.product.id)}>
                    <Trash2 color={colors.error} size={18} />
                  </TouchableOpacity>
                </View>
                
                <Typography variant="body" color="primary" style={styles.price}>
                  {(item.product.price_minor / 100).toFixed(2)} د.ج
                </Typography>
                
                <View style={[styles.quantityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <QuantitySelector
                    quantity={item.quantity}
                    onIncrement={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                    onDecrement={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                  />
                  <Typography variant="h3" style={styles.itemTotal}>
                    {((item.product.price_minor * item.quantity) / 100).toFixed(2)} د.ج
                  </Typography>
                </View>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.bgSurface }]}>
        <View style={[styles.totalRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Typography variant="h2">الإجمالي:</Typography>
          <Typography variant="h1" color="primary">
            {(calculateTotal() / 100).toFixed(2)} د.ج
          </Typography>
        </View>
        <Button
          title="إتمام الطلب"
          onPress={() => router.push("/checkout")}
          style={styles.checkoutBtn}
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.md,
  },
  cartItem: {
    padding: TOKENS.spacing.md,
  },
  itemRow: {
    gap: TOKENS.spacing.md,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: TOKENS.radius.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  itemDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemHeader: {
    justifyContent: "space-between",
    width: "100%",
  },
  productName: {
    flex: 1,
  },
  price: {
    fontWeight: "600",
    marginVertical: 4,
  },
  quantityRow: {
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  itemTotal: {
    fontWeight: "700",
  },
  footer: {
    padding: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    gap: TOKENS.spacing.md,
  },
  totalRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkoutBtn: {
    width: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: TOKENS.spacing["2xl"],
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: TOKENS.spacing.xl,
  },
  emptyTitle: {
    marginBottom: TOKENS.spacing.sm,
  },
  emptySubtitle: {
    marginBottom: TOKENS.spacing["2xl"],
  },
  emptyBtn: {
    minWidth: 200,
  },
});
