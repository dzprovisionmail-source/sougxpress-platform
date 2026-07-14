
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Avatar from '../ui/Avatar';
import { colors } from '@/design/colors';
import { radius } from '@/design/radius';
import { spacing } from '@/design/spacing';

interface AvatarUploaderProps {
  avatarUrl: string | null;
  onUpload: (url: string) => void;
  size?: number;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ avatarUrl, onUpload, size = 80 }) => {
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

      const { error: uploadError } = await supabase.storage
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
    <TouchableOpacity onPress={pickImage} style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]} disabled={uploading}>
      <Avatar uri={avatarUrl} size={size} />
      {uploading && (
        <View style={[styles.activityIndicatorContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <View style={styles.cameraButton}>
        <Camera size={20} color={colors.white} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent, // Orange accent
    borderRadius: radius.small, // Adjust as needed
    padding: spacing.xs,
  },
  activityIndicatorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});

export default AvatarUploader;
