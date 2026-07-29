import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, I18nManager } from 'react-native';
import { Star } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface RatingProps {
  /** Numeric rating score e.g. 4.8 or string "4.5" */
  rating: number | string;
  /** Optional review or rating count e.g. 85 */
  count?: number | string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show star rating as a filled pill badge */
  showBadge?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Rating: React.FC<RatingProps> = ({
  rating,
  count,
  size = 'md',
  showBadge = false,
  style,
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const numRating = typeof rating === 'number' ? rating : parseFloat(rating) || 0;
  const formattedRating = numRating > 0 ? numRating.toFixed(1) : 'جديد';

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { iconSize: 12, fontSize: TOKENS.typography.sizes.xs, countSize: 10 };
      case 'lg':
        return { iconSize: 18, fontSize: TOKENS.typography.sizes.base, countSize: 13 };
      case 'md':
      default:
        return { iconSize: 14, fontSize: TOKENS.typography.sizes.sm, countSize: 11 };
    }
  };

  const config = getSizeConfig();

  if (showBadge) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: `${colors.primary}1A`, // 10% opacity
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
          style,
        ]}
      >
        <Star size={config.iconSize} color={colors.primary} fill={colors.primary} />
        <Text
          style={[
            styles.badgeText,
            {
              fontSize: config.fontSize,
              color: colors.textPrimary,
              fontFamily: TOKENS.typography.families.arabic,
            },
          ]}
        >
          {formattedRating}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
      <Star size={config.iconSize} color="#FFC107" fill="#FFC107" />
      <Text
        style={[
          styles.ratingText,
          {
            fontSize: config.fontSize,
            color: colors.textPrimary,
            fontFamily: TOKENS.typography.families.arabic,
          },
        ]}
      >
        {formattedRating}
      </Text>
      {count !== undefined && count !== null && (
        <Text
          style={[
            styles.countText,
            {
              fontSize: config.countSize,
              color: colors.textSecondary,
              fontFamily: TOKENS.typography.families.arabic,
            },
          ]}
        >
          ({count})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontWeight: '700',
  },
  countText: {
    fontWeight: '400',
  },
  badge: {
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 3,
    borderRadius: TOKENS.radius.full,
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '700',
  },
});

export default Rating;
