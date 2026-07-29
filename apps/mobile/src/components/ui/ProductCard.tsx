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
  variant?: 'grid' | 'horizontal' | 'compact';
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
              { color: colors.textPrimary, fontFamily: TOKENS.typography.families.arabic },
            ]}
          >
            {actualName}
          </Text>

          {storeName ? (
            <Text
              numberOfLines={1}
              style={[
                styles.storeSubtitle,
                { color: colors.textSecondary, fontFamily: TOKENS.typography.families.arabic },
              ]}
            >
              {storeName}
            </Text>
          ) : null}

          <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Price amount={actualPrice} originalAmount={originalPrice} size="sm" variant="brand" />
            {unit && (
              <Text style={[styles.unitText, { color: colors.textDisabled }]}> / {unit}</Text>
            )}
          </View>
        </View>

        {onAddToCart && actualInStock && (
          <TouchableOpacity
            onPress={handleAddToCart}
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
    <Card onPress={handlePress} style={[styles.gridCard, style]}>
      {/* Top Image + Favorite Overlay */}
      <View style={styles.imageContainer}>
        <ImageFallback
          uri={actualImage}
          type="product"
          title={actualName}
          category={category}
          width="100%"
          height={125}
          borderRadius={TOKENS.radius.sm}
        />

        {/* Favorite Button */}
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
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
      <View style={styles.content}>
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
        <View style={[styles.footerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Price amount={actualPrice} originalAmount={originalPrice} size="sm" variant="brand" />

          {onAddToCart && actualInStock ? (
            <TouchableOpacity
              onPress={handleAddToCart}
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
    padding: TOKENS.spacing.xs,
    marginVertical: TOKENS.spacing.xs,
  },
  imageContainer: {
    width: '100%',
    height: 125,
    borderRadius: TOKENS.radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    padding: TOKENS.spacing.xs,
    justifyContent: 'space-between',
  },
  productTitleGrid: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36,
  },
  footerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: TOKENS.spacing.xs,
  },
  addCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Horizontal Variant
  horizontalCard: {
    flexDirection: 'row-reverse',
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
  },
  storeSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    marginTop: 2,
  },
  priceRow: {
    alignItems: 'baseline',
    marginTop: 6,
  },
  unitText: {
    fontSize: 11,
  },
  quickAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProductCard;
