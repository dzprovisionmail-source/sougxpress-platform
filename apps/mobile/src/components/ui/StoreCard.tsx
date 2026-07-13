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

interface StoreCardProps {
  id: string;
  name: string;
  category: string;
  rating: string;
  deliveryTime?: string;
  coverImage?: string;
  isOpen?: boolean;
  isFeatured?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  theme?: ThemeType;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  id,
  name,
  category,
  rating,
  deliveryTime = "20-30 دقيقة",
  coverImage,
  isOpen = true,
  isFeatured = false,
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
      {/* Cover Image Container */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: coverImage || "https://via.placeholder.com/300x200" }} 
          style={[styles.image, { backgroundColor: colors.bgSurface }]}
          resizeMode="cover"
        />
        
        {/* Gradient Overlay */}
        <View 
          style={[
            styles.overlay, 
            { backgroundColor: "rgba(0, 0, 0, 0.3)" }
          ]} 
        />
        
        {/* Badges Container */}
        <View style={[styles.badgesContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {/* Open/Closed Badge */}
          <View 
            style={[
              styles.badge,
              { 
                backgroundColor: isOpen ? colors.success : colors.error,
                marginRight: isRTL ? 0 : TOKENS.spacing.sm,
                marginLeft: isRTL ? TOKENS.spacing.sm : 0,
              }
            ]}
          >
            <Typography 
              variant="caption" 
              align="center"
              style={{ color: colors.textOnBrand, fontWeight: "600" }}
            >
              {isOpen ? "مفتوح" : "مغلق"}
            </Typography>
          </View>
          
          {/* Featured Badge */}
          {isFeatured && (
            <View 
              style={[
                styles.badge,
                { backgroundColor: colors.primary }
              ]}
            >
              <Typography 
                variant="caption" 
                align="center"
                style={{ color: colors.textOnBrand, fontWeight: "600" }}
              >
                مميز
              </Typography>
            </View>
          )}
        </View>
      </View>
      
      {/* Content Container */}
      <View style={styles.content}>
        {/* Store Name */}
        <Typography 
          variant="h3" 
          numberOfLines={1} 
          align="right"
          style={styles.storeName}
        >
          {name}
        </Typography>
        
        {/* Category */}
        <Typography 
          variant="caption" 
          color="secondary" 
          numberOfLines={1}
          align="right"
          style={styles.category}
        >
          {category}
        </Typography>
        
        {/* Footer Row: Rating + Delivery Time */}
        <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {/* Rating */}
          <View style={[styles.ratingContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Ionicons 
              name="star" 
              size={14} 
              color={colors.primary}
              style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
            />
            <Typography 
              variant="caption" 
              align="right"
              style={{ fontWeight: "600", color: colors.textPrimary }}
            >
              {rating}
            </Typography>
          </View>
          
          {/* Delivery Time */}
          <View style={[styles.deliveryContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Ionicons 
              name="time-outline" 
              size={14} 
              color={colors.textSecondary}
              style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
            />
            <Typography 
              variant="caption" 
              color="secondary"
              align="right"
            >
              {deliveryTime}
            </Typography>
          </View>
        </View>
      </View>
    </Card>
  );
};

const CARD_WIDTH = 280;
const IMAGE_HEIGHT = 160;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    padding: 0,
    marginRight: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
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
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
  },
  badgesContainer: {
    position: "absolute",
    top: TOKENS.spacing.md,
    right: TOKENS.spacing.md,
    left: "auto",
    gap: TOKENS.spacing.sm,
  },
  badge: {
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.sm,
  },
  content: {
    padding: TOKENS.spacing.md,
  },
  storeName: {
    marginBottom: TOKENS.spacing.xs,
  },
  category: {
    marginBottom: TOKENS.spacing.sm,
  },
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: TOKENS.spacing.sm,
    gap: TOKENS.spacing.md,
  },
  ratingContainer: {
    alignItems: "center",
    gap: 4,
  },
  deliveryContainer: {
    alignItems: "center",
    gap: 4,
  },
});
