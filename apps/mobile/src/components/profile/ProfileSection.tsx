
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, children }) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={[styles.sectionContainer, { marginHorizontal: tokens.spacing.lg }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.bgElevated, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, shadowColor: colors.textPrimary, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'right', // RTL
  },
  sectionContent: {
    overflow: 'hidden',
  },
});

export default ProfileSection;
