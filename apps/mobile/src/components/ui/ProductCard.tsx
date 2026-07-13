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
import { Card } from "./Card";
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
      style={[styles.container, style]}
      theme={theme}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: image || "https://via.placeholder.com/150" }} 
          style={[styles.image, { backgroundColor: colors.bgSurface }]}
          resizeMode="cover"
        />
        <TouchableOpacity 
          style={[styles.favoriteButton, { backgroundColor: colors.bgBase }]}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Typography variant="h3" numberOfLines={1} align="right" style={styles.title}>
          {title}
        </Typography>
        
        {storeName && (
          <Typography variant="caption" color="secondary" numberOfLines={1} align="right">
            {storeName}
          </Typography>
        )}
        
        <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Typography variant="h2" color="brand" align="right">
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
const ICON_BUTTON_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    padding: 0,
    marginRight: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.sm,
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
  },
  favoriteButton: {
    position: "absolute",
    top: TOKENS.spacing.sm,
    right: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.full,
    padding: TOKENS.spacing.xs,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    ...TOKENS.shadows.premium,
    shadowOpacity: 0.1,
  },
  content: {
    padding: TOKENS.spacing.md,
  },
  title: {
    marginBottom: TOKENS.spacing.xs,
  },
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: TOKENS.spacing.sm,
  },
  addButton: {
    minWidth: ICON_BUTTON_SIZE,
    minHeight: ICON_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  }
});
