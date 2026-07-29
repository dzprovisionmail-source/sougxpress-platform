import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  I18nManager,
} from 'react-native';
import { Clock, MapPin, Tag } from 'lucide-react-native';
import { Card } from './Card';
import { Rating } from './Rating';
import { ImageFallback } from './ImageFallback';
import { CategoryIcon } from './CategoryIcon';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface StoreCardProps {
  id?: string;
  name?: string;
  store?: any;
  category?: string;
  coverImage?: string | null;
  logoImage?: string | null;
  rating?: number | string;
  reviewCount?: number | string;
  deliveryTime?: string;
  deliveryFee?: number | string;
  isOpen?: boolean;
  isFeatured?: boolean;
  address?: string;
  onPress?: (id?: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  id,
  name,
  store,
  category = 'متجر',
  coverImage,
  logoImage,
  rating = 4.8,
  reviewCount,
  deliveryTime = '20-35 دقيقة',
  deliveryFee = '200 د.ج',
  isOpen,
  isFeatured = false,
  address,
  onPress,
  style,
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const actualId = id || store?.id || '';
  const actualName = name || store?.name || '';
  const actualCategory = category !== 'متجر' ? category : (store?.category || 'متجر');
  const actualCover = coverImage || store?.cover_url || store?.coverImage || null;
  const actualLogo = logoImage || store?.logo_url || store?.logoImage || null;
  const actualRating = rating !== 4.8 ? rating : (store?.rating || 4.8);
  const actualIsOpen = isOpen ?? store?.is_open ?? (store?.status === 'active');
  const actualIsFeatured = isFeatured || store?.is_featured || false;
  const actualAddress = address || store?.address_line1 || store?.city || '';

  const handlePress = () => {
    if (onPress) {
      onPress(actualId);
    }
  };

  return (
    <Card onPress={handlePress} style={[styles.card, style]}>
      {/* Cover Image with Fallback */}
      <View style={styles.coverWrapper}>
        <ImageFallback
          uri={actualCover}
          type="cover"
          title={actualName}
          category={actualCategory}
          width="100%"
          height={140}
          borderRadius={0}
        />

        {/* Status Badges Header */}
        <View style={[styles.badgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: actualIsOpen ? colors.success : colors.error },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: colors.textOnBrand }]}>
              {actualIsOpen ? 'مفتوح' : 'مغلق'}
            </Text>
          </View>

          {actualIsFeatured && (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.statusBadgeText, { color: colors.textOnBrand }]}>مميز</Text>
            </View>
          )}
        </View>

        {/* Floating Store Logo */}
        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
              right: isRTL ? TOKENS.spacing.md : undefined,
              left: isRTL ? undefined : TOKENS.spacing.md,
            },
          ]}
        >
          <ImageFallback
            uri={actualLogo}
            type="logo"
            title={actualName}
            category={actualCategory}
            width={48}
            height={48}
            borderRadius={24}
          />
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            numberOfLines={1}
            style={[
              styles.storeName,
              { color: colors.textPrimary, fontFamily: TOKENS.typography.families.arabic },
            ]}
          >
            {actualName}
          </Text>
          <Rating rating={actualRating} count={reviewCount} size="sm" showBadge />
        </View>

        {/* Category & Address */}
        <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <CategoryIcon category={actualCategory} size="xs" variant="plain" />
          <Text
            style={[
              styles.categoryText,
              { color: colors.textSecondary, fontFamily: TOKENS.typography.families.arabic },
            ]}
          >
            {actualCategory}
          </Text>
          {actualAddress ? (
            <Text
              numberOfLines={1}
              style={[
                styles.addressText,
                { color: colors.textDisabled, fontFamily: TOKENS.typography.families.arabic },
              ]}
            >
              • {actualAddress}
            </Text>
          ) : null}
        </View>

        {/* Delivery Details Footer */}
        <View style={[styles.footerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.infoPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Clock size={13} color={colors.textSecondary} />
            <Text style={[styles.infoPillText, { color: colors.textSecondary }]}>
              {deliveryTime}
            </Text>
          </View>

          <View style={[styles.infoPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Tag size={13} color={colors.primary} />
            <Text style={[styles.infoPillText, { color: colors.primary, fontWeight: '700' }]}>
              التوصيل: {typeof deliveryFee === 'number' ? `${deliveryFee} د.ج` : deliveryFee}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginVertical: TOKENS.spacing.xs,
    overflow: 'hidden',
  },
  coverWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  badgesRow: {
    position: 'absolute',
    top: TOKENS.spacing.sm,
    right: TOKENS.spacing.sm,
    gap: TOKENS.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: TOKENS.radius.xs,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: TOKENS.typography.families.arabic,
  },
  logoContainer: {
    position: 'absolute',
    bottom: -18,
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.small,
  },
  content: {
    paddingTop: TOKENS.spacing.lg,
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.md,
  },
  titleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: TOKENS.spacing.sm,
  },
  categoryText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: '600',
  },
  addressText: {
    fontSize: TOKENS.typography.sizes.xs,
    flex: 1,
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  infoPill: {
    alignItems: 'center',
    gap: 4,
  },
  infoPillText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontFamily: TOKENS.typography.families.arabic,
  },
});

export default StoreCard;
