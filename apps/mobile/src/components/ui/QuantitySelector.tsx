import React from "react";
import { View, StyleSheet, TouchableOpacity, I18nManager } from "react-native";
import { Typography } from "./Typography";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface QuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  theme?: ThemeType;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onIncrement,
  onDecrement,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle, flexDirection: isRTL ? "row-reverse" : "row" }
    ]}>
      <TouchableOpacity 
        onPress={onDecrement} 
        style={styles.button}
        disabled={quantity <= 1}
      >
        <Ionicons name="remove" size={20} color={quantity <= 1 ? colors.textDisabled : colors.primary} />
      </TouchableOpacity>
      
      <View style={styles.valueContainer}>
        <Typography variant="h3">{quantity}</Typography>
      </View>
      
      <TouchableOpacity onPress={onIncrement} style={styles.button}>
        <Ionicons name="add" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    alignItems: "center",
    width: 120,
    justifyContent: "space-between",
  },
  button: {
    width: 40,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  valueContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  }
});
