import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp, I18nManager } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface PriceProps {
  /** Amount in major currency units (e.g., 1500 DZD) OR minor units if isMinor=true */
  amount: number;
  /** Optional original price for showing discount comparison */
  originalAmount?: number;
  /** Whether the passed amount is in minor units (e.g. cents/centimes, dividing by 100) */
  isMinor?: boolean;
  /** Currency symbol, default: "د.ج" */
  currency?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show discount badge e.g. "-15%" */
  showDiscountBadge?: boolean;
  /** Accent variant */
  variant?: 'primary' | 'secondary' | 'brand';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Price: React.FC<PriceProps> = ({
  amount,
  originalAmount,
  isMinor = false,
  currency = 'د.ج',
  size = 'md',
  showDiscountBadge = true,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  // Format amount safely
  const formatValue = (val: number) => {
    const majorVal = isMinor ? val / 100 : val;
    return majorVal.toLocaleString('ar-DZ', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  };

  const formattedCurrent = formatValue(amount);
  const formattedOriginal = originalAmount !== undefined ? formatValue(originalAmount) : null;

  // Calculate discount percentage
  const currentMajor = isMinor ? amount / 100 : amount;
  const originalMajor = originalAmount !== undefined ? (isMinor ? originalAmount / 100 : originalAmount) : 0;
  const hasDiscount = originalMajor > currentMajor;
  const discountPercent = hasDiscount
    ? Math.round(((originalMajor - currentMajor) / originalMajor) * 100)
    : 0;

  // Size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { fontSize: TOKENS.typography.sizes.sm, currencySize: 11, originalSize: 11 };
      case 'lg':
        return { fontSize: TOKENS.typography.sizes.xl, currencySize: 14, originalSize: 13 };
      case 'xl':
        return { fontSize: TOKENS.typography.sizes['2xl'], currencySize: 16, originalSize: 14 };
      case 'md':
      default:
        return { fontSize: TOKENS.typography.sizes.md, currencySize: 12, originalSize: 12 };
    }
  };

  const dimensions = getSizeStyles();

  // Price color
  const getTextColor = () => {
    switch (variant) {
      case 'brand':
        return colors.primary;
      case 'secondary':
        return colors.textSecondary;
      case 'primary':
      default:
        return colors.textPrimary;
    }
  };

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
      {/* Current Price */}
      <View style={[styles.priceGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text
          style={[
            styles.amountText,
            {
              fontSize: dimensions.fontSize,
              color: getTextColor(),
              fontFamily: TOKENS.typography.families.arabic,
            },
            textStyle,
          ]}
        >
          {formattedCurrent}
        </Text>
        <Text
          style={[
            styles.currencyText,
            {
              fontSize: dimensions.currencySize,
              color: colors.textSecondary,
              fontFamily: TOKENS.typography.families.arabic,
              marginHorizontal: 2,
            },
          ]}
        >
          {currency}
        </Text>
      </View>

      {/* Original Strikethrough Price */}
      {hasDiscount && formattedOriginal && (
        <Text
          style={[
            styles.originalText,
            {
              fontSize: dimensions.originalSize,
              color: colors.textDisabled,
              fontFamily: TOKENS.typography.families.arabic,
              marginHorizontal: 6,
            },
          ]}
        >
          {formattedOriginal} {currency}
        </Text>
      )}

      {/* Discount Badge */}
      {hasDiscount && showDiscountBadge && discountPercent > 0 && (
        <View style={[styles.discountBadge, { backgroundColor: `${colors.error}18` }]}>
          <Text style={[styles.discountText, { color: colors.error }]}>
            -{discountPercent}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  priceGroup: {
    alignItems: 'baseline',
  },
  amountText: {
    fontWeight: '800',
  },
  currencyText: {
    fontWeight: '500',
  },
  originalText: {
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: TOKENS.radius.xs,
    marginStart: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: TOKENS.typography.families.arabic,
  },
});

export default Price;
