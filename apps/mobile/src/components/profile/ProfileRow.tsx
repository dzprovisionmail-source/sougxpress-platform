
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProfileRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => {
  return (
    <View style={styles.row}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  iconContainer: {
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right', // RTL
  },
  value: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
    textAlign: 'left', // RTL
  },
});

export default ProfileRow;
