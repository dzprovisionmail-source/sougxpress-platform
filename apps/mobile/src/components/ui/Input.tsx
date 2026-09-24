import React from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  TextInputProps,
  I18nManager,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  style,
  containerStyle,
  placeholderTextColor,
  ...rest
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const defaultPlaceholderColor = placeholderTextColor || colors.placeholder;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
              fontFamily: TOKENS.typography.families.arabic,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.bgElevated,
            borderColor: error ? colors.error : colors.borderSubtle,
          },
          error ? styles.inputErrorWrapper : null,
        ]}
      >
        {icon && (
          <View style={isRTL ? styles.iconContainerRTL : styles.iconContainerLTR}>
            {icon}
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
              fontFamily: TOKENS.typography.families.arabic,
            },
            Platform.OS === 'web' && styles.webInput,
            style,
          ]}
          placeholderTextColor={defaultPlaceholderColor}
          {...rest}
          autoComplete={Platform.OS === 'web' ? 'off' : rest.autoComplete}
        />
      </View>
      {error && (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.error,
              textAlign: isRTL ? 'right' : 'left',
              fontFamily: TOKENS.typography.families.secondary,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: TOKENS.spacing.md,
    width: '100%',
  },
  label: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: '600',
    marginBottom: TOKENS.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    paddingHorizontal: TOKENS.spacing.md,
    minHeight: TOKENS.touchTarget.minHeight,
    height: 48,
  },
  inputErrorWrapper: {
    borderWidth: 1.5,
  },
  iconContainerRTL: {
    marginEnd: TOKENS.spacing.sm,
  },
  iconContainerLTR: {
    marginStart: TOKENS.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.base,
    paddingVertical: TOKENS.spacing.sm,
    height: '100%',
  },
  webInput: {
    outlineWidth: 0,
  },
  errorText: {
    fontSize: TOKENS.typography.sizes.xs,
    marginTop: TOKENS.spacing.xs,
  },
});

export default Input;
