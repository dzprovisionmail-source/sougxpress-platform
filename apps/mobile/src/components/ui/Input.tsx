
import React from 'react';
import { TextInput, StyleSheet, View, Text, TextInputProps, I18nManager } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, style, ...rest }) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputErrorWrapper, { backgroundColor: colors.bgElevated, borderColor: error ? colors.error : colors.borderSubtle }]}>
        {icon && <View style={isRTL ? styles.iconContainerRTL : styles.iconContainerLTR}>{icon}</View>}
        <TextInput
          style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, style]}
          placeholderTextColor={colors.textDisabled}
          {...rest}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: colors.error, textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    ...typography.subtitle,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.small,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    height: 52,
  },
  inputErrorWrapper: {
    borderWidth: 1,
  },
  iconContainerRTL: {
    marginLeft: spacing.sm, // Space between icon and text in RTL
  },
  iconContainerLTR: {
    marginRight: spacing.sm, // Space between icon and text in LTR
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm,
    height: '100%',
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

export default Input;
