
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Store as StoreIcon, Images, ShoppingBag, CirclePlus, BadgePercent, Clock3, Phone, MapPinned, Globe,
  PackageOpen, ChartColumn, Star, LogOut, SquarePen, BadgeInfo, MessageCircle, Share2
} from 'lucide-react-native';

import StoreHeader from '../../components/profile/StoreHeader';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileRow from '../../components/profile/ProfileRow';
import StoreImageGallery from '../../components/profile/StoreImageGallery';
import StoreProductManagement from '../../components/profile/StoreProductManagement';
import StoreInformationCard from '../../components/profile/StoreInformationCard';

import { Button } from '../../design/components';
import { colors } from '../../design/colors';
import { spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { iconSizes } from '../../design/icons';

import useStore from '../../hooks/useStore';
import { supabase } from '../../lib/supabase';
import { Store } from '../../types/schema-03-core';

const StoreScreen = () => {
  const { id } = useLocalSearchParams(); // Get store ID from URL params
  const storeId = typeof id === 'string' ? id : undefined;

  const [isMerchantView, setIsMerchantView] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // In a real app, you'd check if the user is the owner of this storeId
        // For now, we'll assume if a storeId is present, and it matches a merchant's ID, it's a merchant view.
        // This is a simplification; proper authorization would be needed.
        if (storeId && user.id === storeId) { // Simplified check: assuming storeId is merchantId for now
          setIsMerchantView(true);
        }
      }
    };
    checkUser();
  }, [storeId]);

  const { store, galleryImages, loading, error, updateStore, handleImageUpload, handleImageDelete } = useStore(storeId || '');

  if (!storeId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>ID du magasin manquant.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du magasin...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Erreur: {error}</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Magasin introuvable.</Text>
      </View>
    );
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Erreur de déconnexion', error.message);
    } else {
      // Navigate to login or home screen
    }
  };

  const handleUpdateStoreInfo = (updates: Partial<Store>) => {
    updateStore(updates);
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'متجري' }} />

      <StoreHeader
        storeName={store.name}
        category={store.category}
        rating={4.5} // Placeholder for rating
        isOpen={store.status === 'active'} // Simplified status
        storeLogoUrl={null} // Placeholder for logo URL
        coverImageUrl={null} // Placeholder for cover image URL
        onLogoUpload={(url) => console.log('Logo uploaded:', url)}
        onCoverUpload={(url) => console.log('Cover uploaded:', url)}
        isMerchantView={isMerchantView}
      />

      {/* Store Information */}
      <StoreInformationCard
        storeName={store.name}
        storeDescription="" // Placeholder for description
        phone="" // Placeholder for phone
        whatsapp="" // Placeholder for whatsapp
        address="" // Placeholder for address
        location="" // Placeholder for location
        storeLink="" // Placeholder for store link
        isMerchantView={isMerchantView}
        onEdit={() => console.log('Edit Store Info')}
      />

      {/* Image Gallery */}
      <StoreImageGallery
        storeId={store.id}
        images={galleryImages}
        isMerchantView={isMerchantView}
        onImageUpload={handleImageUpload}
        onImageDelete={handleImageDelete}
      />

      {/* Product Management */}
      <StoreProductManagement
        isMerchantView={isMerchantView}
        onManageProducts={() => console.log('Manage Products')}
        onAddProduct={() => console.log('Add Product')}
        onEditProduct={() => console.log('Edit Product')}
        onDeleteProduct={() => console.log('Delete Product')}
      />

      {/* Offers */}
      {isMerchantView && (
        <ProfileCard icon={<BadgePercent color={colors.primary} size={iconSizes.default} />} title="العروض">
          <Button title="إنشاء عرض" onPress={() => console.log('Create Offer')} variant="ghost" />
          <Button title="تعديل عرض" onPress={() => console.log('Edit Offer')} variant="ghost" />
          <Button title="حذف عرض" onPress={() => console.log('Delete Offer')} variant="ghost" />
        </ProfileCard>
      )}

      {/* Working Hours */}
      <ProfileCard icon={<Clock3 color={colors.primary} size={iconSizes.default} />} title="أوقات العمل">
        <ProfileRow label="وقت الفتح" value={store.opens_at} />
        <ProfileRow label="وقت الغلق" value={store.closes_at} />
        <ProfileRow label="أيام العمل" value="كل الأيام" /> {/* Placeholder */}
        <ProfileRow label="الحالة" value={store.status === 'active' ? '🟢 مفتوح' : '🔴 مغلق'} />
      </ProfileCard>

      {/* Store Activity */}
      <ProfileCard icon={<ChartColumn color={colors.primary} size={iconSizes.default} />} title="نشاط المتجر">
        <ProfileRow label="عدد الطلبات" value="120" /> {/* Placeholder */}
        <ProfileRow label="عدد المنتجات" value="50" /> {/* Placeholder */}
        <ProfileRow label="عدد التقييمات" value="30" /> {/* Placeholder */}
        <ProfileRow label="متوسط التقييم" value="4.5" /> {/* Placeholder */}
      </ProfileCard>

      {/* Contact */}
      <ProfileCard icon={<MessageCircle color={colors.primary} size={iconSizes.default} />} title="التواصل">
        <Button icon={<Phone color={colors.textSecondary} size={iconSizes.small} />} title="اتصال" onPress={() => console.log('Call')} variant="ghost" />
        <Button icon={<Phone color={colors.textSecondary} size={iconSizes.small} />} title="واتساب" onPress={() => console.log('WhatsApp')} variant="ghost" />
        <Button icon={<Share2 color={colors.textSecondary} size={iconSizes.small} />} title="مشاركة المتجر" onPress={() => console.log('Share Store')} variant="ghost" />
      </ProfileCard>

      {/* Logout */}
      {isMerchantView && (
        <View style={styles.logoutButtonContainer}>
          <Button icon={<LogOut color={colors.error} size={iconSizes.default} />} title="تسجيل الخروج" onPress={handleLogout} variant="danger" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.md,
  },
  logoutButtonContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
});

export default StoreScreen;
