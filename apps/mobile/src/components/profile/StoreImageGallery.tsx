
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Images, Camera, CirclePlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { addStoreGalleryImage, deleteStoreGalleryImage } from '@/services/store.service';

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
  const { colors, tokens } = useAppTheme();
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
      try {
        await addStoreGalleryImage(storeId, publicUrlData.publicUrl);
      } catch (dbErr: any) {
        Alert.alert('خطأ', `تم رفع الصورة لكن فشل حفظها في المعرض: ${dbErr.message}`);
      }

    } catch (error: any) {
      Alert.alert('Erreur d\'upload', error.message);
    }
  };

  const deleteStoreGalleryImageByUrl = async (currentStoreId: string, imageUrl: string) => {
    const { data } = await supabase
      .from('store_gallery')
      .select('id')
      .eq('store_id', currentStoreId)
      .eq('image_url', imageUrl)
      .maybeSingle();
    if (data?.id) await deleteStoreGalleryImage(data.id);
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
              await deleteStoreGalleryImageByUrl(storeId, imageUrl);
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
      <Image source={{ uri: item }} style={[styles.galleryImage, { borderRadius: tokens.radius.sm }]} />
      {isMerchantView && (
        <TouchableOpacity
          onPress={() => handleDeleteImage(item)}
          style={[styles.deleteButton, { backgroundColor: colors.error }]}
        >
          <Text style={{ color: colors.textOnBrand, fontSize: 12, fontWeight: 'bold' }}>X</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.lg },
      ]}
    >
      <View style={[styles.header, { marginBottom: tokens.spacing.sm }]}>
        <Images color={colors.primary} size={24} />
        <Text
          style={{
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.md,
            fontWeight: '700',
            color: colors.textPrimary,
            flex: 1,
            textAlign: 'right',
            marginRight: tokens.spacing.sm,
          }}
        >
          معرض الصور
        </Text>
        {isMerchantView && (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: tokens.radius.full }]}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.textOnBrand} />
            ) : (
              <CirclePlus size={20} color={colors.textOnBrand} />
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
        inverted
        style={styles.galleryList}
      />
      {images.length === 0 && !uploading && (
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            marginTop: tokens.spacing.sm,
          }}
        >
          لا توجد صور في المعرض.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 20,
    padding: 15,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
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
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    left: 5,
    borderRadius: 15,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StoreImageGallery;
