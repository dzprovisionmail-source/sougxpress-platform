import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { User, Store as StoreIcon } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  type?: 'user' | 'store';
  isOnline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 'md',
  type = 'user',
  isOnline,
  style,
}) => {
  const { colors } = useAppTheme();
  const [hasError, setHasError] = useState(false);

  const getDimension = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 28;
      case 'sm': return 36;
      case 'md': return 44; // Minimum 44px touch friendly
      case 'lg': return 56;
      case 'xl': return 80;
      default: return 44;
    }
  };

  const dimension = getDimension();
  const borderRadius = dimension / 2;

  // Extract initials
  const getInitials = (str: string): string => {
    if (!str) return '';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <View style={[styles.wrapper, { width: dimension, height: dimension }, style]}>
      {uri && !hasError ? (
        <Image
          source={{ uri }}
          style={{ width: dimension, height: dimension, borderRadius }}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dimension,
              height: dimension,
              borderRadius,
              backgroundColor: `${colors.primary}20`,
              borderColor: `${colors.primary}40`,
            },
          ]}
        >
          {initials ? (
            <Text
              style={[
                styles.initialsText,
                {
                  fontSize: dimension * 0.38,
                  color: colors.primary,
                  fontFamily: TOKENS.typography.families.arabic,
                },
              ]}
            >
              {initials}
            </Text>
          ) : type === 'store' ? (
            <StoreIcon size={dimension * 0.45} color={colors.primary} />
          ) : (
            <User size={dimension * 0.45} color={colors.primary} />
          )}
        </View>
      )}

      {/* Online indicator badge */}
      {isOnline !== undefined && (
        <View
          style={[
            styles.onlineBadge,
            {
              width: Math.max(dimension * 0.28, 10),
              height: Math.max(dimension * 0.28, 10),
              borderRadius: Math.max(dimension * 0.28, 10) / 2,
              backgroundColor: isOnline ? colors.success : colors.textDisabled,
              borderColor: colors.bgBase,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initialsText: {
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});

export default Avatar;
