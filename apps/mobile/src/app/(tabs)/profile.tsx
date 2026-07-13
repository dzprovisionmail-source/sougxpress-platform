
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { 
  BadgeInfo, Smartphone, Mail, Building2, MapPinned, House, Map, 
  Package, PackageOpen, PackageCheck, Heart, Store, ShoppingBag, Bike, 
  Bell, LifeBuoy, Shield, ShieldCheck, LogOut, Camera 
} from 'lucide-react-native';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileRow from '../../components/profile/ProfileRow';
import ProfileButton from '../../components/profile/ProfileButton';
import AvatarUploader from '../../components/profile/AvatarUploader';
import useProfile from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

const ProfileScreen = () => {
  const { profile, loading, error, updateProfile } = useProfile();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Erreur de déconnexion', error.message);
    } else {
      // Navigate to login or home screen
    }
  };

  const handleAvatarUpload = async (newAvatarUrl: string) => {
    if (profile) {
      await updateProfile({ ...profile, avatar_url: newAvatarUrl }); // Assuming avatar_url field exists in Customer
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Chargement du profil...</Text>
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

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'حسابي' }} />

      <ProfileHeader />

      {/* Informations personnelles */}
      <ProfileCard icon={<BadgeInfo color="#007BFF" size={24} />} title="معلوماتي">
        <ProfileRow icon={<Smartphone color="#666" size={20} />} label="رقم الهاتف" value={profile?.phone || ''} />
        <ProfileRow icon={<Mail color="#666" size={20} />} label="البريد الإلكتروني" value={profile?.email || ''} /> {/* Assuming email exists */}
        <ProfileRow icon={<Building2 color="#666" size={20} />} label="المدينة" value={profile?.city || ''} /> {/* Assuming city exists */}
        <ProfileRow icon={<MapPinned color="#666" size={20} />} label="الحي" value={profile?.neighborhood || ''} /> {/* Assuming neighborhood exists */}
        <ProfileRow icon={<House color="#666" size={20} />} label="العنوان" value={profile?.address || ''} /> {/* Assuming address exists */}
        <ProfileRow icon={<Map color="#666" size={20} />} label="الموقع" value="Voir sur la carte" />
        <ProfileButton label="تعديل" onPress={() => { /* Handle edit */ }} />
      </ProfileCard>

      {/* Mes commandes */}
      <ProfileCard icon={<Package color="#007BFF" size={24} />} title="طلباتي">
        <ProfileButton icon={<Package color="#666" size={20} />} label="الطلبات الحالية" onPress={() => { /* Navigate to current orders */ }} />
        <ProfileButton icon={<PackageOpen color="#666" size={20} />} label="الطلبات السابقة" onPress={() => { /* Navigate to past orders */ }} />
        <ProfileButton icon={<PackageCheck color="#666" size={20} />} label="الطلبات الملغاة" onPress={() => { /* Navigate to cancelled orders */ }} />
      </ProfileCard>

      {/* Favoris */}
      <ProfileCard icon={<Heart color="#007BFF" size={24} />} title="المفضلة">
        <ProfileButton icon={<Store color="#666" size={20} />} label="المتاجر" onPress={() => { /* Navigate to favorite stores */ }} />
        <ProfileButton icon={<ShoppingBag color="#666" size={20} />} label="المنتجات" onPress={() => { /* Navigate to favorite products */ }} />
        <ProfileButton icon={<Bike color="#666" size={20} />} label="الموصلون" onPress={() => { /* Navigate to favorite drivers */ }} />
      </ProfileCard>

      {/* Notifications */}
      <ProfileCard icon={<Bell color="#007BFF" size={24} />} title="الإشعارات">
        <ProfileButton icon={<Bell color="#666" size={20} />} label="إشعارات الطلبات" onPress={() => { /* Toggle order notifications */ }} />
        <ProfileButton icon={<Bell color="#666" size={20} />} label="العروض" onPress={() => { /* Toggle offers notifications */ }} />
        <ProfileButton icon={<Bell color="#666" size={20} />} label="أخبار المنصة" onPress={() => { /* Toggle platform news notifications */ }} />
      </ProfileCard>

      {/* Aide */}
      <ProfileCard icon={<LifeBuoy color="#007BFF" size={24} />} title="المساعدة">
        <ProfileButton icon={<LifeBuoy color="#666" size={20} />} label="تواصل معنا" onPress={() => { /* Contact support */ }} />
        <ProfileButton icon={<BadgeInfo color="#666" size={20} />} label="الأسئلة الشائعة" onPress={() => { /* Navigate to FAQ */ }} />
        <ProfileButton icon={<Shield color="#666" size={20} />} label="سياسة الخصوصية" onPress={() => { /* Navigate to privacy policy */ }} />
        <ProfileButton icon={<ShieldCheck color="#666" size={20} />} label="شروط الاستخدام" onPress={() => { /* Navigate to terms of use */ }} />
      </ProfileCard>

      {/* Sécurité */}
      <ProfileCard icon={<ShieldCheck color="#007BFF" size={24} />} title="الأمان">
        <ProfileButton icon={<Shield color="#666" size={20} />} label="تغيير كلمة المرور" onPress={() => { /* Change password */ }} />
        <ProfileButton icon={<ShieldCheck color="#666" size={20} />} label="حذف الحساب" onPress={() => { /* Delete account */ }} />
      </ProfileCard>

      {/* Déconnexion */}
      <View style={styles.logoutButtonContainer}>
        <ProfileButton icon={<LogOut color="#FF0000" size={20} />} label="تسجيل الخروج" onPress={handleLogout} isLast />
      </View>
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

export default ProfileScreen;
