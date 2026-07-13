
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Trash2, Plus, Minus } from 'lucide-react-native';
import { colors } from '../../design/colors';
import { spacing } from '../../design/spacing';
import { radius } from '../../design/radius';
import { typography } from '../../design/typography';
import { CartItem as CartItemType } from '../../services/cart.service';
import { IconButton } from '../../design/components';

interface CartItemProps {
  item: CartItemType;
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onRemove, onUpdateQuantity }) => {
  const productImage = item.product.image_url || 'https://via.placeholder.com/80'; // Assuming product has an image_url

  return (
    <View style={styles.card}>
      <Image source={{ uri: productImage }} style={styles.productImage} />
      <View style={styles.infoContainer}>
        <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
        <Text style={styles.productPrice}>{`${(item.product.price_minor / 100).toFixed(2)} د.ج`}</Text>
        <View style={styles.quantityContainer}>
          <IconButton icon={<Plus size={iconSizes.small} color={colors.primary} />} onPress={() => onUpdateQuantity(item.product.id, item.quantity + 1)} />
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <IconButton icon={<Minus size={iconSizes.small} color={colors.primary} />} onPress={() => onUpdateQuantity(item.product.id, item.quantity - 1)} disabled={item.quantity <= 1} />
        </View>
      </View>
      <IconButton icon={<Trash2 size={iconSizes.default} color={colors.error} />} onPress={() => onRemove(item.product.id)} style={styles.removeButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: radius.small,
    marginLeft: spacing.md, // Adjust for RTL
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.md,
    alignItems: 'flex-end', // RTL
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
  quantityContainer: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantityText: {
    ...typography.body,
    color: colors.text,
    marginHorizontal: spacing.sm,
  },
  removeButton: {
    // Specific styles for remove button if needed
  },
});

export default CartItem;
