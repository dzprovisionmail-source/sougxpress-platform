
import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { CircleUserRound } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { radius } from '@/design/radius';

interface AvatarProps {
  uri: string | null;
  size?: number;
  style?: ViewStyle;
}

const Avatar: React.FC<AvatarProps> = ({ uri, size = 80, style }) => {
  return (
    <View style={[
      styles.avatarContainer,
      { width: size, height: size, borderRadius: size / 2 },
      style,
    ]}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <CircleUserRound size={size * 0.8} color={colors.textSecondary} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    backgroundColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.avatar, // Use a large radius for perfect circle
  },
});

export default Avatar;
