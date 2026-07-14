import React from 'react';
import { StyleSheet } from 'react-native';
import ListItem from '../ui/ListItem';

interface ProfileRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => {
  return (
    <ListItem
      icon={icon}
      title={label}
      value={value}
      showChevron={false}
      isLast={false}
    />
  );
};

export default ProfileRow;
