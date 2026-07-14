
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ListItem from '../ui/ListItem';
import { colors } from '@/design/colors';
import { typography } from '@/design/typography';

interface ProfileRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => {
  return (
    <ListItem
      icon={icon}
      title={label}
      value={value}
      showChevron={false} // ProfileRow doesn't typically have a chevron
      isLast={false} // This will be handled by the parent component if needed
    />
  );
};

const styles = StyleSheet.create({
  // No specific styles needed here as ListItem handles styling
});

export default ProfileRow;
