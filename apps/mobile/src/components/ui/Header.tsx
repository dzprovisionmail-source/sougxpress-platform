
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftContent,
  rightContent,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }, style]}>
      {leftContent && <View style={styles.leftContent}>{leftContent}</View>}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }, titleStyle]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }, subtitleStyle]}>{subtitle}</Text>}
      </View>
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse', // RTL support
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  leftContent: {
    // Styles for content on the left (e.g., back button)
  },
  rightContent: {
    // Styles for content on the right (e.g., action buttons)
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-end', // RTL support
    marginHorizontal: spacing.md,
  },
  title: {
    ...typography.heading,
  },
  subtitle: {
    ...typography.body,
  },
});

export default Header;
