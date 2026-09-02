import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'flat' | 'outlined' | 'neon' | 'neonBlue';
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'elevated',
}) => {
  const { colors, tokens } = useAppTheme();
  const Container = onPress ? TouchableOpacity : View;

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: colors.bgSurface,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        };
      case 'neon':
        return {
          backgroundColor: colors.bgElevated,
          borderColor: colors.primary + '60',
          borderWidth: 1.5,
          ...tokens.shadows.neon,
        };
      case 'neonBlue':
        return {
          backgroundColor: colors.bgElevated,
          borderColor: tokens.colors.brandSecondary + '60',
          borderWidth: 1.5,
          ...tokens.shadows.neonBlue,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          ...TOKENS.shadows.medium,
        };
    }
  };

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      style={[styles.baseCard, getVariantStyles(), style]}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  baseCard: {
        borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.md,
    marginVertical: TOKENS.spacing.sm,
    overflow: 'hidden',
  },
});

export default Card;
