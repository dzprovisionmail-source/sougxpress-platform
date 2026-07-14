
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { typography } from '@/design/typography';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';

interface ProfileCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ icon, title, children }) => {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardContent}>
        {children}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    // Overrides or additional styles for ProfileCard specific layout
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
    color: colors.text,
    marginRight: spacing.sm, // Adjust for RTL
  },
  cardContent: {
    // Styles for content inside the card
  },
});

export default ProfileCard;
