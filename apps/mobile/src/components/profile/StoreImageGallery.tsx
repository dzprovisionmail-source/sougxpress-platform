
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Images, Upload, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { addStoreGalleryImage, deleteStoreGalleryImage } from '@/services/store.service';

interface StoreImageGalleryProps {
  storeId: string;
  images: string[];
  isMerchantView: boolean;
  onImageUpload: (newImageUrl: string, title?: string | null, caption?: string | null) => void;
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
  const [galleryImageUri, setGalleryImageUri] = useState<string | null>(null);
  const [galleryImageTitle, setGalleryImageTitle] = useState('');
  const [caption, setCaption] = useState('');

  const pickGalleryImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'يجب السماح بالوصول إلى المعرض لاختيار صورة.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setGalleryImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!galleryImageUri) {
      Alert.alert('خطأ', 'الرجاء اختيار صورة أولاً');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch(galleryImageUri);
      const blob = await response.blob();
      const fileExt = galleryImageUri.split('.').pop();
      const fileName = `${storeId}-${Date.now()}.${fileExt}`;
      const filePath = `store_gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store_images')
        .upload(filePath, blob, { contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('store_images').getPublicUrl(filePath);

      await addStoreGalleryImage(storeId, publicUrlData.publicUrl, galleryImageTitle.trim() || null, caption.trim() || null);
      onImageUpload(publicUrlData.publicUrl, galleryImageTitle.trim() || null, caption.trim() || null);
      setGalleryImageUri(null);
      setGalleryImageTitle('');
      setCaption('');
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setUploading(false);
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
      </View>

      {isMerchantView && (
        <>
          {/* Photo Selector */}
          {galleryImageUri ? (
            <View style={styles.imagePickerPreview}>
              <Image source={{ uri: galleryImageUri }} style={styles.imagePickerThumb} resizeMode="cover" />
              <TouchableOpacity
                onPress={() => setGalleryImageUri(null)}
                style={[styles.imagePickerRemove, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              >
                <X size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickGalleryImage}
              style={[styles.imagePickerButton, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
              disabled={uploading}
            >
              <Upload size={20} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginRight: 6, textAlign: 'right' }}>إضافة صورة</Text>
            </TouchableOpacity>
          )}

          {/* Title Input */}
          <View style={{ marginBottom: tokens.spacing.sm }}>
            <Text style={{ color: colors.textDisabled, fontSize: 12, textAlign: 'right', marginBottom: 2 }}>عنوان الصورة (اختياري)</Text>
            <TextInput
              value={galleryImageTitle}
              onChangeText={setGalleryImageTitle}
              placeholder="مثال: أثاث المطبخ"
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              style={{
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.sm,
                paddingHorizontal: 10,
                paddingVertical: 6,
                color: colors.textPrimary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
                backgroundColor: colors.bgElevated,
              }}
            />
          </View>

          {/* Caption Input */}
          <View style={{ marginBottom: tokens.spacing.sm }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'right' }}>وصف قصير (اختياري)</Text>
              <Text style={{ color: colors.textDisabled, fontSize: 10 }}>{caption.length}/50</Text>
            </View>
            <TextInput
              value={caption}
              onChangeText={(text) => setCaption(text.slice(0, 50))}
              placeholder="وصف قصير للصورة"
              placeholderTextColor={colors.textDisabled}
              maxLength={50}
              textAlign="right"
              style={{
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.sm,
                paddingHorizontal: 10,
                paddingVertical: 6,
                color: colors.textPrimary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
                backgroundColor: colors.bgElevated,
              }}
            />
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handleUpload}
            disabled={uploading || !galleryImageUri}
            style={[styles.uploadButton, { backgroundColor: colors.primary, opacity: uploading || !galleryImageUri ? 0.5 : 1 }]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.textOnBrand} />
            ) : (
              <Text style={{ color: colors.textOnBrand, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>رفع إلى المعرض</Text>
            )}
          </TouchableOpacity>
        </>
      )}

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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imagePickerButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  imagePickerPreview: {
    alignSelf: 'flex-end',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
  },
  imagePickerThumb: {
    width: '100%',
    height: '100%',
  },
  imagePickerRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 6,
    padding: 2,
  },
  uploadButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
