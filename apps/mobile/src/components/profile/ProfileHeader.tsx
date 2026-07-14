
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'lucide-react-native';
import AvatarUploader from './AvatarUploader';
import { colors } from '@/design/colors';
import { typography } from '@/design/typography';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';

interface ProfileHeaderProps {
  avatarUrl?: string | null;
  onAvatarUpload?: (url: string) => void;
  name: string;
  phoneNumber: string;
  badgeText: string;
  description: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  avatarUrl,
  onAvatarUpload,
  name,
  phoneNumber,
  badgeText,
  description,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {onAvatarUpload ? (
          <AvatarUploader avatarUrl={avatarUrl} onUpload={onAvatarUpload} size={80} />
        ) : (
          <AvatarUploader avatarUrl={avatarUrl} onUpload={() => {}} size={80} /> // Non-editable view
        )}
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.phoneNumber}>{phoneNumber}</Text>
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>{badgeText}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomLeftRadius: radius.medium,
    borderBottomRightRadius: radius.medium,
    ...colors.shadows.medium,
  },
  avatarContainer: {
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  phoneNumber: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  badgeContainer: {
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.white,
    ...typography.subtitle,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ProfileHeader;
