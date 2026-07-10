import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  I18nManager,
  StatusBar,
  TextInput
} from "react-native";
import { 
  Typography, 
  Button, 
  Badge, 
  QuantitySelector,
  ProductCard,
  SectionHeader
} from "../components/ui";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const [theme] = useState<ThemeType>(DEFAULT_THEME);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  // Mock Data
  const product = {
    name: "طماطم طازجة - درجة أولى",
    price: "120 دج",
    originalPrice: "150 دج",
    discount: "20%",
    description: "طماطم طازجة من مزارع عين صفراء، تم اختيارها بعناية لضمان أفضل جودة ومذاق. مثالية للسلطات والطبخ اليومي.",
    images: [
      "https://via.placeholder.com/600x600/FF5252/FFFFFF?text=Tomato+1",
      "https://via.placeholder.com/600x600/FF8A80/FFFFFF?text=Tomato+2",
      "https://via.placeholder.com/600x600/D32F2F/FFFFFF?text=Tomato+3",
    ],
    ingredients: "طماطم طبيعية 100%، بدون مواد حافظة.",
    relatedProducts: [
      { id: "r1", title: "خيار طازج", price: "80 دج", image: "" },
      { id: "r2", title: "بصل أحمر", price: "60 دج", image: "" },
      { id: "r3", title: "فلفل حلو", price: "140 دج", image: "" },
    ]
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Floating Header */}
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="share-social-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <Image source={{ uri: product.images[activeImage] }} style={styles.mainImage} resizeMode="cover" />
          <View style={[styles.thumbnails, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {product.images.map((img, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => setActiveImage(index)}
                style={[
                  styles.thumbnailWrapper, 
                  activeImage === index && { borderColor: colors.primary, borderWidth: 2 }
                ]}
              >
                <Image source={{ uri: img }} style={styles.thumbnail} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="h1" style={styles.title}>{product.name}</Typography>
            <Badge label={product.discount} variant="accent" />
          </View>

          <View style={[styles.priceRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="display" color="brand">{product.price}</Typography>
            <Typography variant="body" color="disabled" style={styles.originalPrice}>
              {product.originalPrice}
            </Typography>
          </View>

          <View style={styles.divider} />

          <Typography variant="h3" style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
            الوصف
          </Typography>
          <Typography variant="body" color="secondary" style={[styles.description, { textAlign: isRTL ? "right" : "left" }]}>
            {product.description}
          </Typography>

          {product.ingredients && (
            <>
              <Typography variant="h3" style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
                المكونات
              </Typography>
              <Typography variant="body" color="secondary" style={[styles.description, { textAlign: isRTL ? "right" : "left" }]}>
                {product.ingredients}
              </Typography>
            </>
          )}

          <View style={styles.divider} />

          {/* Quantity and Notes */}
          <View style={[styles.quantityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="h3">الكمية</Typography>
            <QuantitySelector 
              quantity={quantity} 
              onIncrement={() => setQuantity(q => q + 1)} 
              onDecrement={() => setQuantity(q => Math.max(1, q - 1))}
              theme={theme}
            />
          </View>

          <Typography variant="h3" style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
            ملاحظات خاصة
          </Typography>
          <TextInput
            style={[
              styles.notesInput, 
              { 
                backgroundColor: colors.bgSurface, 
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                textAlign: isRTL ? "right" : "left",
                fontFamily: TOKENS.typography.families.arabic
              }
            ]}
            placeholder="مثال: طماطم صلبة للسلطة..."
            placeholderTextColor={colors.textDisabled}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Related Products */}
        <View style={styles.relatedSection}>
          <SectionHeader title="منتجات مشابهة" theme={theme} />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.horizontalScroll, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            {product.relatedProducts.map(item => (
              <ProductCard 
                key={item.id} 
                title={item.title} 
                price={item.price} 
                image={item.image}
                theme={theme}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={[styles.bottomAction, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle }]}>
        <View style={[styles.totalRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Typography variant="caption" color="secondary">الإجمالي</Typography>
          <Typography variant="h2" color="brand">{(120 * quantity)} دج</Typography>
        </View>
        <Button 
          title="إضافة إلى السلة" 
          onPress={() => {}} 
          style={styles.addToCartBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: TOKENS.spacing.lg,
    justifyContent: "space-between",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    ...TOKENS.shadows.premium,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  galleryContainer: {
    width: "100%",
    height: 350,
    backgroundColor: "#F5F5F5",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  thumbnails: {
    position: "absolute",
    bottom: TOKENS.spacing.md,
    left: 0,
    right: 0,
    justifyContent: "center",
    gap: TOKENS.spacing.sm,
  },
  thumbnailWrapper: {
    width: 50,
    height: 50,
    borderRadius: TOKENS.radius.sm,
    backgroundColor: "white",
    overflow: "hidden",
    ...TOKENS.shadows.premium,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  infoSection: {
    padding: TOKENS.spacing.lg,
  },
  titleRow: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: TOKENS.spacing.md,
  },
  title: {
    flex: 1,
  },
  priceRow: {
    alignItems: "baseline",
    gap: TOKENS.spacing.sm,
    marginTop: TOKENS.spacing.sm,
  },
  originalPrice: {
    textDecorationLine: "line-through",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: TOKENS.spacing.lg,
  },
  sectionTitle: {
    marginBottom: TOKENS.spacing.sm,
  },
  description: {
    lineHeight: 22,
    marginBottom: TOKENS.spacing.md,
  },
  quantityRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.lg,
  },
  notesInput: {
    height: 80,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    padding: TOKENS.spacing.md,
    textAlignVertical: "top",
  },
  relatedSection: {
    marginTop: TOKENS.spacing.xl,
  },
  horizontalScroll: {
    paddingHorizontal: TOKENS.spacing.lg,
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: TOKENS.spacing.lg,
    paddingBottom: 34,
    borderTopWidth: 1,
    ...TOKENS.shadows.premium,
  },
  totalRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.md,
  },
  addToCartBtn: {
    width: "100%",
  }
});
