import React from "react";
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  I18nManager
} from "react-native";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  style?: ViewStyle;
  inputStyle?: TextStyle;
  theme?: "dark" | "light" | "ivory";
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = "default",
  style,
  inputStyle,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputWrapper, 
        { 
          backgroundColor: colors.bgSurface, 
          borderColor: error ? colors.error : colors.borderSubtle 
        }
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          textAlign={isRTL ? "right" : "left"}
          style={[
            styles.input,
            { color: colors.textPrimary, fontFamily: TOKENS.typography.families.arabic },
            inputStyle
          ]}
        />
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error, textAlign: isRTL ? "right" : "left" }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: TOKENS.spacing.md,
    width: "100%",
  },
  label: {
    fontSize: TOKENS.typography.sizes.sm,
    marginBottom: TOKENS.spacing.xs,
    fontWeight: "500",
  },
  inputWrapper: {
    height: 52,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    paddingHorizontal: TOKENS.spacing.md,
    justifyContent: "center",
  },
  input: {
    fontSize: TOKENS.typography.sizes.base,
    height: "100%",
  },
  errorText: {
    fontSize: TOKENS.typography.sizes.xs,
    marginTop: TOKENS.spacing.xs,
  },
});
