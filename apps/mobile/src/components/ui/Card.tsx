import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { TOKENS } from '../../constants/tokens';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'flat' | 'outlined';
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'elevated',
}) => {
  const { colors } = useAppTheme();
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
    borderRadius: TOKENS.radius.md,
    padding: TOKENS.spacing.md,
    marginVertical: TOKENS.spacing.xs,
    overflow: 'hidden',
  },
});

export default Card;
