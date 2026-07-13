
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface ProfileButtonProps {
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean; // To handle the last button styling, e.g., logout
}

const ProfileButton: React.FC<ProfileButtonProps> = ({ icon, label, onPress, isLast }) => {
  return (
    <TouchableOpacity style={[styles.button, isLast && styles.lastButton]} onPress={onPress}>
      <View style={styles.buttonContent}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.label, isLast && styles.lastButtonLabel]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginVertical: 5,
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastButton: {
    backgroundColor: '#FFEEEE', // Light red for logout
  },
  buttonContent: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginLeft: 10, // Adjust for RTL
  },
  label: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right', // RTL
    flex: 1,
  },
  lastButtonLabel: {
    color: '#FF0000', // Red for logout
  },
});

export default ProfileButton;
