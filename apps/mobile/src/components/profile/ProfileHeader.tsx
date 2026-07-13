
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { CircleUserRound, Camera } from 'lucide-react-native';

const ProfileHeader = () => {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <CircleUserRound size={80} color="#000" /> {/* Placeholder for avatar */}
        <TouchableOpacity style={styles.cameraButton}>
          <Camera size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.name}>اسم المستخدم</Text>
      <Text style={styles.phoneNumber}>+966 50 123 4567</Text>
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>⭐ العضوية الذهبية</Text>
      </View>
      <Text style={styles.description}>أنت من أوائل مستخدمي Soug-XPRESS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFA500', // Orange accent
    borderRadius: 20,
    padding: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  badgeContainer: {
    backgroundColor: '#007BFF', // Blue primary
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  badgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default ProfileHeader;
