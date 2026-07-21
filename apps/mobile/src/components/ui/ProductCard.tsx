import type { StyleProp, ViewStyle } from "react-native";
import React from "react";
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  I18nManager 
} from "react-native";
import { Typography } from "./Typography";
import Card from "./Card";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface ProductCardProps {
  title: string;
  price: string;
  image: string;
  storeName?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  theme?: ThemeType;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  price,
  image,
  storeName,
  onPress,
  style,
  theme = DEFAULT_THEME
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  return (
    <Card 
      onPress={onPress} 
      style={[styles.container, style, { backgroundColor: colors.bgElevated }]}
    >
      <View style={styles.imageContainer}>
        {image ? (
          <Image 
            source={{ uri: image }} 
            style={[styles.image, { backgroundColor: colors.bgSurface }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderContainer, { backgroundColor: colors.bgElevated }]}>
            <Ionicons name="cube-outline" size={32} color={colors.textDisabled} />
          </View>
        )}
        <TouchableOpacity 
          style={[styles.favoriteButton, { backgroundColor: "rgba(255,255,255,0.9)" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Typography 
          variant="h3" 
          numberOfLines={1} 
          align="right" 
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {title}
        </Typography>
        
        {storeName && (
          <Typography 
            variant="caption" 
            color="secondary" 
            numberOfLines={1} 
            align="right"
            style={{ color: colors.textSecondary }}
          >
            {storeName}
          </Typography>
        )}
        
        <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Typography variant="h3" color="primary" align="right" style={{ fontWeight: "700" }}>
            {price}
          </Typography>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

const CARD_WIDTH = 160;
const IMAGE_HEIGHT = 120;
const ICON_BUTTON_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    padding: 0,
    marginRight: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.sm,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    padding: TOKENS.spacing.sm,
  },
  title: {
    marginBottom: 2,
    fontWeight: "600",
  },
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  addButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  }
});
