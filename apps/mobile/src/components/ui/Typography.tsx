import React from 'react';
import { Text, TextProps, TextStyle, StyleProp, I18nManager } from 'react-native';
import { TOKENS } from '@/constants/tokens';
import { useAppTheme } from '@/contexts/ThemeContext';

export interface TypographyProps extends TextProps {
  children: React.ReactNode;
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'button' | 'title' | 'subtitle';
  color?: 'primary' | 'secondary' | 'disabled' | 'brand' | 'error' | 'success' | 'white';
  align?: 'left' | 'center' | 'right' | 'auto';
  fontFamily?: 'arabic' | 'secondary' | 'mono';
  style?: StyleProp<TextStyle>;
  numberOfLines?: TextProps['numberOfLines'];
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  align = 'auto',
  fontFamily = 'arabic',
  style,
  numberOfLines,
  ...rest
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'display':
        return { fontSize: TOKENS.typography.sizes['2xl'], fontWeight: '900' };
      case 'h1':
        return { fontSize: TOKENS.typography.sizes.xl, fontWeight: '800' };
      case 'h2':
      case 'title':
        return { fontSize: TOKENS.typography.sizes.lg, fontWeight: '700' };
      case 'h3':
      case 'subtitle':
        return { fontSize: TOKENS.typography.sizes.md, fontWeight: '600' };
      case 'caption':
        return { fontSize: TOKENS.typography.sizes.xs, fontWeight: '400' };
      case 'button':
        return { fontSize: TOKENS.typography.sizes.base, fontWeight: '700' };
      case 'body':
      default:
        return { fontSize: TOKENS.typography.sizes.base, fontWeight: '400' };
    }
  };

  const getColorStyle = (): string => {
    switch (color) {
      case 'secondary':
        return colors.textSecondary;
      case 'disabled':
        return colors.textDisabled;
      case 'brand':
        return colors.primary;
      case 'error':
        return colors.error;
      case 'success':
        return colors.success;
      case 'white':
        return colors.textInverse;
      case 'primary':
      default:
        return colors.textPrimary;
    }
  };

  const getFontFamily = (): string => {
    switch (fontFamily) {
      case 'secondary':
        return TOKENS.typography.families.secondary;
      case 'mono':
        return TOKENS.typography.families.mono;
      case 'arabic':
      default:
        return TOKENS.typography.families.arabic;
    }
  };

  const variantStyle = getVariantStyle();

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: getFontFamily(),
          color: getColorStyle(),
          textAlign: align === 'auto' ? (isRTL ? 'right' : 'left') : align,
          lineHeight: TOKENS.typography.lineHeights.arabic * (variantStyle.fontSize || 16),
        },
        variantStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

export default Typography;
