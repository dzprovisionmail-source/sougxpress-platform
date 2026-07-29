import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Image } from 'react-native';
import { Store, ShoppingBag, Video as VideoIcon, ImageIcon, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface ImageFallbackProps {
  /** Optional image URL to try rendering first */
  uri?: string | null;
  /** Type of element needing fallback image */
  type?: 'cover' | 'logo' | 'product' | 'video' | 'gallery' | 'avatar';
  /** Title or name to derive initials/branding from */
  title?: string;
  /** Optional category name for relevant vector icon */
  category?: string;
  /** Custom width */
  width?: number | string;
  /** Custom height */
  height?: number | string;
  /** Border radius */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Aspect ratio option */
  aspectRatio?: number;
}

export const ImageFallback: React.FC<ImageFallbackProps> = ({
  uri,
  type = 'cover',
  title = '',
  category,
  width = '100%',
  height = '100%',
  borderRadius = TOKENS.radius.md,
  style,
  aspectRatio,
}) => {
  const { colors } = useAppTheme();
  const [hasError, setHasError] = React.useState(false);

  // Extract initial letters from title
  const getInitials = (text: string): string => {
    if (!text) return 'SX';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(title);

  // If URI is present and hasn't failed, render real Image
  if (uri && !hasError) {
    return (
      <View
        style={[
          styles.container,
          {
            width: width as any,
            height: height as any,
            borderRadius,
            backgroundColor: colors.bgSurface,
          },
          aspectRatio ? { aspectRatio } : null,
          style,
        ]}
      >
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius }]}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  // Choose appropriate fallback icon
  const renderFallbackIcon = () => {
    const iconSize = typeof height === 'number' ? Math.min(height * 0.35, 40) : 32;
    switch (type) {
      case 'product':
        return <ShoppingBag size={iconSize} color={colors.primary} />;
      case 'video':
        return <VideoIcon size={iconSize} color={colors.secondary} />;
      case 'logo':
      case 'avatar':
        return <Store size={iconSize} color={colors.primary} />;
      case 'gallery':
        return <ImageIcon size={iconSize} color={colors.primary} />;
      case 'cover':
      default:
        return <Sparkles size={iconSize} color={colors.primary} />;
    }
  };

  // Intentional Premium Gradient/Pattern Fallback
  return (
    <View
      style={[
        styles.fallbackContainer,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: `${colors.primary}12`, // 7% soft opacity tint
          borderColor: `${colors.primary}25`,
        },
        type === 'cover' && styles.coverPattern,
        aspectRatio ? { aspectRatio } : null,
        style,
      ]}
    >
      <View style={styles.centerContent}>
        {renderFallbackIcon()}
        {title ? (
          <Text
            numberOfLines={1}
            style={[
              styles.initialsText,
              {
                color: colors.primary,
                fontFamily: TOKENS.typography.families.arabic,
              },
            ]}
          >
            {initials}
          </Text>
        ) : null}
      </View>

      {/* Brand Watermark Pill */}
      <View style={[styles.brandPill, { backgroundColor: colors.bgElevated }]}>
        <Text style={[styles.brandPillText, { color: colors.textSecondary }]}>Soug-XPRESS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  coverPattern: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: TOKENS.spacing.xs,
  },
  initialsText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: '700',
    marginTop: 4,
  },
  brandPill: {
    position: 'absolute',
    bottom: TOKENS.spacing.xs,
    left: TOKENS.spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: TOKENS.radius.full,
    opacity: 0.85,
  },
  brandPillText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: TOKENS.typography.families.arabic,
  },
});

export default ImageFallback;
