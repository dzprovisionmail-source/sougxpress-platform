import React from "react";
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  I18nManager,
  ViewStyle
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  onVoicePress?: () => void;
  style?: ViewStyle;
  theme?: ThemeType;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "ابحث عن منتجات أو متاجر...",
  onFilterPress,
  onVoicePress,
  style,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
      style
    ]}>
      <Ionicons 
        name="search-outline" 
        size={20} 
        color={colors.textSecondary} 
        style={styles.searchIcon} 
      />
      
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        textAlign={isRTL ? "right" : "left"}
        style={[
          styles.input,
          { color: colors.textPrimary, fontFamily: TOKENS.typography.families.arabic }
        ]}
      />

      <View style={styles.actionButtons}>
        {onVoicePress && (
          <TouchableOpacity onPress={onVoicePress} style={styles.iconButton}>
            <Ionicons name="mic-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
        
        {onFilterPress && (
          <TouchableOpacity onPress={onFilterPress} style={styles.iconButton}>
            <Ionicons name="options-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.md,
    width: "100%",
  },
  searchIcon: {
    marginHorizontal: TOKENS.spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.base,
    height: "100%",
    paddingHorizontal: TOKENS.spacing.sm,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: TOKENS.spacing.xs,
    marginLeft: TOKENS.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
