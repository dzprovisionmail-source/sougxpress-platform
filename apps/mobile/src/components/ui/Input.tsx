
import React from 'react';
import { TextInput, StyleSheet, View, Text, TextInputProps, I18nManager } from 'react-native';
import { colors } from '../../design/colors';
import { spacing } from '../../design/spacing';
import { radius } from '../../design/radius';
import { typography } from '../../design/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, style, ...rest }) => {
  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputErrorWrapper]}>
        {icon && <View style={isRTL ? styles.iconContainerRTL : styles.iconContainerLTR}>{icon}</View>}
        <TextInput
          style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }, style]}
          placeholderTextColor={colors.textSecondary}
          {...rest}
        />
      </View>
      {error && <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text>}
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.sm,
    height: 52,
  },
  inputErrorWrapper: {
    borderColor: colors.error,
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
    color: colors.text,
    paddingVertical: spacing.sm,
    height: '100%',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

export default Input;
