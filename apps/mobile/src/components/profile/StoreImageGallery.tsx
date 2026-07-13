
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Images, Camera, CirclePlus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface StoreImageGalleryProps {
  storeId: string;
  images: string[]; // Array of image URLs
  isMerchantView: boolean;
  onImageUpload: (newImageUrl: string) => void;
  onImageDelete: (imageUrl: string) => void;
}

const StoreImageGallery: React.FC<StoreImageGalleryProps> = ({
  storeId,
  images,
  isMerchantView,
  onImageUpload,
  onImageDelete,
}) => {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de la permission d\'accéder à votre galerie pour choisir une photo.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // Allow multiple image selection
      quality: 1,
    });

    if (!result.canceled) {
      setUploading(true);
      for (const asset of result.assets) {
        await uploadImage(asset.uri);
      }
      setUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${storeId}-${Date.now()}.${fileExt}`;
      const filePath = `store_gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store_images') // Assuming a 'store_images' bucket
        .upload(filePath, blob, { contentType: blob.type });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('store_images').getPublicUrl(filePath);
      onImageUpload(publicUrlData.publicUrl);

    } catch (error: any) {
      Alert.alert('Erreur d\'upload', error.message);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    Alert.alert(
      'Supprimer l\'image',
      'Êtes-vous sûr de vouloir supprimer cette image ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              const fileName = imageUrl.split('/').pop();
              if (!fileName) throw new Error('Invalid image URL');
              const filePath = `store_gallery/${fileName}`;

              const { error } = await supabase.storage.from('store_images').remove([filePath]);

              if (error) {
                throw error;
              }
              onImageDelete(imageUrl);
            } catch (error: any) {
              Alert.alert('Erreur de suppression', error.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.imageWrapper}>
      <Image source={{ uri: item }} style={styles.galleryImage} />
      {isMerchantView && (
        <TouchableOpacity onPress={() => handleDeleteImage(item)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>X</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Images color="#007BFF" size={24} />
        <Text style={styles.title}>معرض الصور</Text>
        {isMerchantView && (
          <TouchableOpacity onPress={pickImage} style={styles.addButton} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <CirclePlus size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.galleryList}
      />
      {images.length === 0 && !uploading && (
        <Text style={styles.noImagesText}>لا توجد صور في المعرض.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#007BFF',
    borderRadius: 20,
    padding: 8,
  },
  galleryList: {
    marginTop: 10,
  },
  imageWrapper: {
    position: 'relative',
    marginHorizontal: 5,
  },
  galleryImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(255,0,0,0.7)',
    borderRadius: 15,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noImagesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
});

export default StoreImageGallery;
