import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import {
  ShoppingBag,
  Search,
  Heart,
  Package,
  Bell,
  Store,
  Inbox
} from 'lucide-react-native';
import { Button } from './Button';
import { useAppTheme } from '../../contexts/ThemeContext';
import { TOKENS } from '../../constants/tokens';

export type EmptyStateType =
  | 'no-data'
  | 'no-search'
  | 'empty-cart'
  | 'empty-favorites'
  | 'no-orders'
  | 'no-notifications'
  | 'no-stores';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  actionTitle,
  onAction,
  style,
  icon,
}) => {
  const { colors } = useAppTheme();

  // Preset Configurations
  const getPreset = () => {
    switch (type) {
      case 'empty-cart':
        return {
          icon: <ShoppingBag size={48} color={colors.primary} />,
          title: title || 'سلة التسوق فارغة',
          description: description || 'لم تقم بـ إضافة أي منتجات إلى السلة بعد. تصفح المتاجر واكتشف منتجات Ain Sefra!',
          actionTitle: actionTitle || 'تصفح السوق',
        };
      case 'no-search':
        return {
          icon: <Search size={48} color={colors.primary} />,
          title: title || 'لم يتم العثور على نتائج',
          description: description || 'تأكد من كتابة اسم المنتج أو المتجر بشكل صحيح، أو ابحث في فئات أخرى.',
          actionTitle: actionTitle || 'مسح البحث',
        };
      case 'empty-favorites':
        return {
          icon: <Heart size={48} color={colors.primary} />,
          title: title || 'لا توجد مفضلات محفوظة',
          description: description || 'احفظ المتاجر والمنتجات التي تحبها للوصول إليها بسرعة في أي وقت.',
          actionTitle: actionTitle || 'استكشاف المتاجر',
        };
      case 'no-orders':
        return {
          icon: <Package size={48} color={colors.primary} />,
          title: title || 'لا توجد طلبات حالية',
          description: description || 'جميع طلباتك المكتملة والحالية ستظهر هنا لمتابعة حالة التوصيل.',
          actionTitle: actionTitle || 'اطلب الآن',
        };
      case 'no-notifications':
        return {
          icon: <Bell size={48} color={colors.primary} />,
          title: title || 'لا توجد إشعارات جديدة',
          description: description || 'سوف تنبهك Soug-XPRESS فور وجود تحديثات على طلباتك أو العروض الجديدة.',
          actionTitle: actionTitle,
        };
      case 'no-stores':
        return {
          icon: <Store size={48} color={colors.primary} />,
          title: title || 'لا توجد متاجر متاح حالياً',
          description: description || 'يرجى التحقق لاحقاً أو تغيير المنطقة الجغرافية في عين صفراء.',
          actionTitle: actionTitle || 'تحديث القائمة',
        };
      case 'no-data':
      default:
        return {
          icon: <Inbox size={48} color={colors.primary} />,
          title: title || 'لا توجد بيانات للعرض',
          description: description || 'لا تتوفر أي عناصر في هذه القائمة حالياً.',
          actionTitle: actionTitle,
        };
    }
  };

  const preset = getPreset();
  const displayIcon = icon || preset.icon;

  return (
    <View style={[styles.container, style]}>
      {/* Icon Badge */}
      <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
        {displayIcon}
      </View>

      {/* Title */}
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            fontFamily: TOKENS.typography.families.arabic,
          },
        ]}
      >
        {preset.title}
      </Text>

      {/* Description */}
      {preset.description ? (
        <Text
          style={[
            styles.description,
            {
              color: colors.textSecondary,
              fontFamily: TOKENS.typography.families.arabic,
            },
          ]}
        >
          {preset.description}
        </Text>
      ) : null}

      {/* Action Button */}
      {preset.actionTitle && onAction ? (
        <View style={styles.actionContainer}>
          <Button
            title={preset.actionTitle}
            onPress={onAction}
            variant="primary"
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: TOKENS.spacing['3xl'],
    paddingHorizontal: TOKENS.spacing.xl,
    width: '100%',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.lg,
  },
  title: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  description: {
    fontSize: TOKENS.typography.sizes.sm,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: TOKENS.spacing.xl,
  },
  actionContainer: {
    minWidth: 160,
  },
});

export default EmptyState;
