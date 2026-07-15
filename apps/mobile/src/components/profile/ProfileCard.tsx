
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ProfileCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ icon, title, children }) => {
  const { colors, tokens } = useAppTheme();

  return (
    <Card style={[styles.card, { padding: tokens.spacing.md }]}>
      <View style={[styles.cardHeader, { marginBottom: tokens.spacing.sm }]}>
        {icon}
        <Text
          style={{
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.md,
            fontWeight: '700',
            color: colors.textPrimary,
            marginRight: tokens.spacing.sm,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={styles.cardContent}>{children}</View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {},
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  cardContent: {},
});

export default ProfileCard;
