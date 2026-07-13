
import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors } from '../../design/colors';
import { radius } from '../../design/radius';
import { spacing } from '../../design/spacing';
import { shadows } from '../../design/shadows';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'elevated' | 'flat'; // Simplified variants
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'elevated',
}) => {
  const Container = onPress ? TouchableOpacity : View;

  const getVariantStyles = () => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: colors.card,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.card,
          ...shadows.medium,
        };
    }
  };

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      style={[
        styles.baseCard,
        getVariantStyles(),
        style
      ]}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: radius.medium,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
    overflow: 'hidden',
  },
});

export default Card;
