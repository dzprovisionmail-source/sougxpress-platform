
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CircleUserRound } from 'lucide-react-native';
import { supabase } from '../../../src/lib/supabase';

interface AvatarUploaderProps {
  avatarUrl: string | null;
  onUpload: (url: string) => void;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ avatarUrl, onUpload }) => {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de la permission d\'accéder à votre galerie pour choisir une photo.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      uploadAvatar(uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: blob.type });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      onUpload(publicUrlData.publicUrl);

    } catch (error: any) {
      Alert.alert('Erreur d\'upload', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} disabled={uploading}>
      {avatarUrl && !uploading ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <CircleUserRound size={80} color="#CCC" />
      )}
      {uploading && (
        <View style={styles.activityIndicatorContainer}>
          <ActivityIndicator size="small" color="#007BFF" />
        </View>
      )}
      <View style={styles.cameraButton}>
        <Camera size={20} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFA500', // Orange accent
    borderRadius: 20,
    padding: 8,
  },
  activityIndicatorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});

export default AvatarUploader;
