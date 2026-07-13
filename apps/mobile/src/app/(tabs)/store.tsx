
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Store as StoreIcon, Image, Images, ShoppingBag, CirclePlus, BadgePercent, Clock3, Phone, MapPinned, Globe,
  PackageOpen, ChartColumn, Star, Camera, LogOut, SquarePen, BadgeInfo, Wallet, Eye, MessageCircle, Share2
} from 'lucide-react-native';

import StoreHeader from '../../components/profile/StoreHeader';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileRow from '../../components/profile/ProfileRow';
import ProfileButton from '../../components/profile/ProfileButton';
import StoreImageGallery from '../../components/profile/StoreImageGallery';
import StoreProductManagement from '../../components/profile/StoreProductManagement';
import StoreInformationCard from '../../components/profile/StoreInformationCard';

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
        <Text>ID du magasin manquant.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement du magasin...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>Erreur: {error}</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centered}>
        <Text>Magasin introuvable.</Text>
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
        <ProfileCard icon={<BadgePercent color="#007BFF" size={24} />} title="العروض">
          <ProfileButton label="إنشاء عرض" onPress={() => console.log('Create Offer')} />
          <ProfileButton label="تعديل عرض" onPress={() => console.log('Edit Offer')} />
          <ProfileButton label="حذف عرض" onPress={() => console.log('Delete Offer')} />
        </ProfileCard>
      )}

      {/* Working Hours */}
      <ProfileCard icon={<Clock3 color="#007BFF" size={24} />} title="أوقات العمل">
        <ProfileRow label="وقت الفتح" value={store.opens_at} />
        <ProfileRow label="وقت الغلق" value={store.closes_at} />
        <ProfileRow label="أيام العمل" value="كل الأيام" /> {/* Placeholder */}
        <ProfileRow label="الحالة" value={store.status === 'active' ? '🟢 مفتوح' : '🔴 مغلق'} />
      </ProfileCard>

      {/* Store Activity */}
      <ProfileCard icon={<ChartColumn color="#007BFF" size={24} />} title="نشاط المتجر">
        <ProfileRow label="عدد الطلبات" value="120" /> {/* Placeholder */}
        <ProfileRow label="عدد المنتجات" value="50" /> {/* Placeholder */}
        <ProfileRow label="عدد التقييمات" value="30" /> {/* Placeholder */}
        <ProfileRow label="متوسط التقييم" value="4.5" /> {/* Placeholder */}
      </ProfileCard>

      {/* Contact */}
      <ProfileCard icon={<MessageCircle color="#007BFF" size={24} />} title="التواصل">
        <ProfileButton icon={<Phone color="#666" size={20} />} label="اتصال" onPress={() => console.log('Call')} />
        <ProfileButton icon={<Phone color="#666" size={20} />} label="واتساب" onPress={() => console.log('WhatsApp')} />
        <ProfileButton icon={<Share2 color="#666" size={20} />} label="مشاركة المتجر" onPress={() => console.log('Share Store')} />
      </ProfileCard>

      {/* Logout */}
      {isMerchantView && (
        <View style={styles.logoutButtonContainer}>
          <ProfileButton icon={<LogOut color="#FF0000" size={20} />} label="تسجيل الخروج" onPress={handleLogout} isLast />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
});

export default StoreScreen;
