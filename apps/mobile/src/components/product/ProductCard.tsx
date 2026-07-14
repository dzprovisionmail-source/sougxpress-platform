
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { shadows } from '@/design/shadows';
import { Product } from '@/types/schema-03-core';
import { Button } from '@/components/ui';

interface ProductCardProps {
  product: Product;
  onPress: (productId: string) => void;
  onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, onAddToCart }) => {
  const handlePress = () => {
    onPress(product.id);
  };

  const handleAddToCart = () => {
    onAddToCart(product);
  };

  // Placeholder for product image. In a real app, this would come from product.images[0].url.
  const productImage = 'https://via.placeholder.com/100';

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image source={{ uri: productImage }} style={styles.productImage} />
      <View style={styles.infoContainer}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productPrice}>{`${(product.price_minor / 100).toFixed(2)} د.ج`}</Text>
        <Button
          title="إضافة إلى السلة"
          onPress={handleAddToCart}
          variant="primary"
          icon={<ShoppingCart size={typography.button.fontSize} color={colors.white} />}
          style={styles.addToCartButton}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
    ...shadows.small,
    overflow: 'hidden',
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    padding: spacing.sm,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: radius.small,
    marginLeft: spacing.md, // Adjust for RTL
  },
  infoContainer: {
    flex: 1,
    alignItems: 'flex-end', // RTL
    paddingRight: spacing.sm,
  },
  productName: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'right', // RTL
  },
  productPrice: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'right', // RTL
  },
  addToCartButton: {
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});

export default ProductCard;
