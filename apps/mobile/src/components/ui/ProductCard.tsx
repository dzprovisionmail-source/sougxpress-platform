import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  I18nManager,
} from 'react-native';
import { Plus, ShoppingCart, Heart } from 'lucide-react-native';
import { Card } from './Card';
import { Price } from './Price';
import { Rating } from './Rating';
import { ImageFallback } from './ImageFallback';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface ProductCardProps {
  id?: string;
  name?: string;
  price?: number;
  product?: any;
  originalPrice?: number;
  image?: string | null;
  unit?: string;
  category?: string;
  storeName?: string;
  rating?: number | string;
  inStock?: boolean;
  isFavorite?: boolean;
  onAddToCart?: (product?: any) => void;
  onToggleFavorite?: () => void;
  onPress?: (id?: string) => void;
  variant?: 'grid' | 'store-grid' | 'horizontal' | 'compact';
  style?: StyleProp<ViewStyle>;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  product,
  originalPrice,
  image,
  unit,
  category,
  storeName,
  rating,
  inStock = true,
  isFavorite = false,
  onAddToCart,
  onToggleFavorite,
  onPress,
  variant = 'grid',
  style,
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const actualId = id || product?.id || '';
  const actualName = name || product?.name || '';
  const actualPrice = price ?? (product?.price_minor ? product.price_minor / 100 : product?.price ?? 0);
  const actualImage = image || product?.image_url || product?.image || null;
  const actualInStock = inStock && (product?.is_available !== false);
  const isStoreGrid = variant === 'store-grid';

  const handlePress = () => {
    if (onPress) {
      onPress(actualId);
    }
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product || { id: actualId, name: actualName, price: actualPrice });
    }
  };

  if (variant === 'horizontal') {
    return (
      <Card onPress={handlePress} style={[styles.horizontalCard, style]}>
        <View style={styles.horizontalImageWrapper}>
          <ImageFallback
            uri={actualImage}
            type="product"
            title={actualName}
            category={category}
            width={90}
            height={90}
            borderRadius={TOKENS.radius.md}
          />
        </View>

        <View style={styles.horizontalDetails}>
          <Text
            numberOfLines={1}
            style={[
              styles.productTitle,
              {
                color: colors.textPrimary,
                fontFamily: TOKENS.typography.families.arabic,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
            ]}
          >
            {actualName}
          </Text>

          {storeName ? (
            <Text
              numberOfLines={1}
              style={[
                styles.storeSubtitle,
                {
                color: colors.textSecondary,
                fontFamily: TOKENS.typography.families.arabic,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
              ]}
            >
              {storeName}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <Price amount={actualPrice} originalAmount={originalPrice} size="sm" variant="brand" />
            {unit && (
              <Text style={[styles.unitText, { color: colors.textDisabled }]}> / {unit}</Text>
            )}
          </View>
        </View>

        {onAddToCart && actualInStock && (
          <TouchableOpacity
            onPress={handleAddToCart}
            accessibilityRole="button"
            accessibilityLabel="إضافة المنتج إلى السلة"
            style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Plus size={18} color={colors.textOnBrand} />
          </TouchableOpacity>
        )}
      </Card>
    );
  }

  // Standard Grid Variant
  return (
    <Card
      onPress={handlePress}
      style={[isStoreGrid ? styles.storeGridCard : styles.gridCard, style]}
    >
      {/* Top Image + Favorite Overlay */}
      <View style={[styles.imageContainer, isStoreGrid && styles.storeImageContainer]}>
        <ImageFallback
          uri={actualImage}
          type="product"
          title={actualName}
          category={category}
          width="100%"
          height={isStoreGrid ? '100%' : 132}
          aspectRatio={isStoreGrid ? 1 : undefined}
          borderRadius={TOKENS.radius.sm}
        />

        {/* Favorite Button */}
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "إزالة المنتج من المفضلة" : "إضافة المنتج إلى المفضلة"}
            style={[styles.favoriteBtn, { backgroundColor: colors.bgElevated }]}
            activeOpacity={0.8}
          >
            <Heart
              size={16}
              color={isFavorite ? colors.error : colors.textSecondary}
              fill={isFavorite ? colors.error : 'transparent'}
            />
          </TouchableOpacity>
        )}

        {/* Out of Stock Overlay */}
        {!actualInStock && (
          <View style={[styles.outOfStockBadge, { backgroundColor: colors.textDisabled }]}>
            <Text style={[styles.outOfStockText, { color: colors.textOnBrand }]}>نفذت الكمية</Text>
          </View>
        )}
      </View>

      {/* Body Content */}
      <View style={[styles.content, isStoreGrid && styles.storeGridContent]}>
        <Text
          numberOfLines={2}
          style={[
            styles.productTitleGrid,
            { color: colors.textPrimary, fontFamily: TOKENS.typography.families.arabic },
          ]}
        >
          {actualName}
        </Text>

        {rating ? (
          <View style={{ marginTop: 2 }}>
            <Rating rating={rating} size="sm" />
          </View>
        ) : null}

        {/* Price & Add Action */}
        <View style={styles.footerRow}>
          <Price amount={actualPrice} originalAmount={originalPrice} size="sm" variant="brand" />

          {onAddToCart && actualInStock ? (
            <TouchableOpacity
              onPress={handleAddToCart}
              accessibilityRole="button"
              accessibilityLabel="إضافة المنتج إلى السلة"
              style={[styles.addCircle, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Plus size={18} color={colors.textOnBrand} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    width: '100%',
    padding: TOKENS.spacing.sm,
    marginVertical: TOKENS.spacing.sm,
  },
  storeGridCard: {
    width: '100%',
    padding: TOKENS.spacing.xs,
    marginVertical: 2,
  },
  imageContainer: {
    width: '100%',
    height: 132,
    borderRadius: TOKENS.radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  storeImageContainer: {
    height: undefined,
    aspectRatio: 1,
  },
  favoriteBtn: {
    position: 'absolute',
    top: TOKENS.spacing.sm,
    [I18nManager.isRTL ? 'right' : 'left']: TOKENS.spacing.sm,
    width: TOKENS.touchTarget.minWidth,
    height: TOKENS.touchTarget.minHeight,
    borderRadius: TOKENS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.small,
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingVertical: 4,
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: TOKENS.typography.families.arabic,
  },
  content: {
    paddingTop: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.xs,
    justifyContent: 'space-between',
  },
  storeGridContent: {
    paddingTop: TOKENS.spacing.xs,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  productTitleGrid: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  footerRow: {
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: TOKENS.spacing.xs,
  },
  addCircle: {
    width: TOKENS.touchTarget.minWidth,
    height: TOKENS.touchTarget.minHeight,
    borderRadius: TOKENS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.neon,
  },

  // Horizontal Variant
  horizontalCard: {
    flexDirection: 'row',
    direction: 'rtl',
    padding: TOKENS.spacing.sm,
    alignItems: 'center',
    marginVertical: TOKENS.spacing.xs,
  },
  horizontalImageWrapper: {
    width: 90,
    height: 90,
  },
  horizontalDetails: {
    flex: 1,
    paddingHorizontal: TOKENS.spacing.md,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: TOKENS.typography.sizes.base,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  storeSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  priceRow: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'baseline',
    marginTop: 6,
  },
  unitText: {
    fontSize: 11,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  quickAddBtn: {
    width: TOKENS.touchTarget.minWidth,
    height: TOKENS.touchTarget.minHeight,
    borderRadius: TOKENS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.neon,
  },
});

export default ProductCard;
