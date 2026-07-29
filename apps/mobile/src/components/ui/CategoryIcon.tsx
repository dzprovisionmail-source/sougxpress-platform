import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import {
  Utensils,
  ShoppingBag,
  Carrot,
  Wheat,
  Pill,
  Coffee,
  Smartphone,
  Shirt,
  Sparkles,
  Tag,
  Bike,
  Store,
  Heart,
  Wallet,
  Bell,
  Search,
  SlidersHorizontal,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  LucideIcon
} from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export type CategoryKey =
  | 'restaurant'
  | 'supermarket'
  | 'vegetables'
  | 'bakery'
  | 'pharmacy'
  | 'coffee'
  | 'electronics'
  | 'clothing'
  | 'beauty'
  | 'deals'
  | 'delivery'
  | 'orders'
  | 'favorites'
  | 'wallet'
  | 'notifications'
  | 'default';

export interface CategoryIconProps {
  category?: string;
  categoryKey?: CategoryKey;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'filled' | 'outlined' | 'subtle' | 'plain';
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

const CATEGORY_MAP: Record<string, LucideIcon> = {
  // Arabic labels
  'مطاعم': Utensils,
  'مطعم': Utensils,
  'وجبات سريعة': Utensils,
  'بقالة': ShoppingBag,
  'سوبرماركت': ShoppingBag,
  'مواد غذائية': ShoppingBag,
  'خضار وفواكه': Carrot,
  'خضروات': Carrot,
  'مخبزة': Wheat,
  'حلويات': Wheat,
  'مخبوزات': Wheat,
  'صيدلية': Pill,
  'أدوية': Pill,
  'مقهى': Coffee,
  'كافيه': Coffee,
  'مشروبات': Coffee,
  'إلكترونيات': Smartphone,
  'هواتف': Smartphone,
  'أجهزة': Smartphone,
  'ملابس': Shirt,
  'أزياء': Shirt,
  'موضة': Shirt,
  'تجميل': Sparkles,
  'عناية شخصية': Sparkles,
  'عروض': Tag,
  'خصومات': Tag,
  'توصيل': Bike,
  'طلباتي': Utensils,
  'المفضلة': Heart,
  'محفظة': Wallet,
  'إشعارات': Bell,

  // English keys
  'restaurant': Utensils,
  'supermarket': ShoppingBag,
  'grocery': ShoppingBag,
  'vegetables': Carrot,
  'fruit': Carrot,
  'bakery': Wheat,
  'pharmacy': Pill,
  'coffee': Coffee,
  'electronics': Smartphone,
  'clothing': Shirt,
  'beauty': Sparkles,
  'deals': Tag,
  'delivery': Bike,
  'favorites': Heart,
  'wallet': Wallet,
  'notifications': Bell,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category = '',
  categoryKey,
  size = 'md',
  variant = 'subtle',
  color,
  backgroundColor,
  style,
}) => {
  const { colors } = useAppTheme();

  // Determine icon size
  const getIconSize = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 14;
      case 'sm': return 18;
      case 'md': return 22;
      case 'lg': return 28;
      case 'xl': return 36;
      default: return 22;
    }
  };

  const numericSize = getIconSize();
  const containerSize = numericSize * 1.85;

  // Resolve Lucide Icon component
  const lookupKey = categoryKey || category.trim().toLowerCase();
  const IconComponent = CATEGORY_MAP[lookupKey] || CATEGORY_MAP[category.trim()] || Store;

  // Icon Color
  const iconColor = color || (variant === 'filled' ? colors.textOnBrand : colors.primary);

  // Background Color
  const getBgColor = (): string => {
    if (backgroundColor) return backgroundColor;
    switch (variant) {
      case 'filled':
        return colors.primary;
      case 'subtle':
        return `${colors.primary}18`; // 10% opacity tint
      case 'outlined':
        return 'transparent';
      case 'plain':
      default:
        return 'transparent';
    }
  };

  return (
    <View
      style={[
        styles.base,
        variant !== 'plain' && {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: getBgColor(),
        },
        variant === 'outlined' && {
          borderWidth: 1.5,
          borderColor: colors.primary,
        },
        style,
      ]}
    >
      <IconComponent size={numericSize} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryIcon;
