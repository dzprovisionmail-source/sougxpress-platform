
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import {
  BadgeInfo, Smartphone, Mail, Building2, MapPinned, House, Map,
  Package, PackageOpen, PackageCheck, Heart, Store, ShoppingBag, Bike,
  Bell, LifeBuoy, Shield, ShieldCheck, LogOut, CircleUserRound
} from 'lucide-react-native';

import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileRow from '@/components/profile/ProfileRow';
import { Button } from '@/components/ui'; // Use the new Button component

import useProfile from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';

import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';

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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
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

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'حسابي' }} />

      <ProfileHeader
        avatarUrl={profile?.avatar_url || null}
        onAvatarUpload={handleAvatarUpload}
        name={profile?.full_name || 'اسم المستخدم'}
        phoneNumber={profile?.phone || '+966 50 123 4567'}
        badgeText="⭐ العضوية الذهبية"
        description="أنت من أوائل مستخدمي Soug-XPRESS"
      />

      {/* Informations personnelles */}
      <ProfileCard icon={<BadgeInfo color={colors.primary} size={iconSizes.default} />} title="معلوماتي">
        <ProfileRow icon={<Smartphone color={colors.textSecondary} size={iconSizes.small} />} label="رقم الهاتف" value={profile?.phone || ''} />
        <ProfileRow icon={<Mail color={colors.textSecondary} size={iconSizes.small} />} label="البريد الإلكتروني" value={profile?.email || ''} />
        <ProfileRow icon={<Building2 color={colors.textSecondary} size={iconSizes.small} />} label="المدينة" value={profile?.city || ''} />
        <ProfileRow icon={<MapPinned color={colors.textSecondary} size={iconSizes.small} />} label="الحي" value={profile?.neighborhood || ''} />
        <ProfileRow icon={<House color={colors.textSecondary} size={iconSizes.small} />} label="العنوان" value={profile?.address || ''} />
        <ProfileRow icon={<Map color={colors.textSecondary} size={iconSizes.small} />} label="الموقع" value="Voir sur la carte" />
        <Button title="تعديل" onPress={() => { /* Handle edit */ }} variant="outline" />
      </ProfileCard>

      {/* Mes commandes */}
      <ProfileCard icon={<Package color={colors.primary} size={iconSizes.default} />} title="طلباتي">
        <Button icon={<Package color={colors.textSecondary} size={iconSizes.small} />} title="الطلبات الحالية" onPress={() => { /* Navigate to current orders */ }} variant="ghost" />
        <Button icon={<PackageOpen color={colors.textSecondary} size={iconSizes.small} />} title="الطلبات السابقة" onPress={() => { /* Navigate to past orders */ }} variant="ghost" />
        <Button icon={<PackageCheck color={colors.textSecondary} size={iconSizes.small} />} title="الطلبات الملغاة" onPress={() => { /* Navigate to cancelled orders */ }} variant="ghost" />
      </ProfileCard>

      {/* Favoris */}
      <ProfileCard icon={<Heart color={colors.primary} size={iconSizes.default} />} title="المفضلة">
        <Button icon={<Store color={colors.textSecondary} size={iconSizes.small} />} title="المتاجر" onPress={() => { /* Navigate to favorite stores */ }} variant="ghost" />
        <Button icon={<ShoppingBag color={colors.textSecondary} size={iconSizes.small} />} title="المنتجات" onPress={() => { /* Navigate to favorite products */ }} variant="ghost" />
        <Button icon={<Bike color={colors.textSecondary} size={iconSizes.small} />} title="الموصلون" onPress={() => { /* Navigate to favorite drivers */ }} variant="ghost" />
      </ProfileCard>

      {/* Notifications */}
      <ProfileCard icon={<Bell color={colors.primary} size={iconSizes.default} />} title="الإشعارات">
        <Button icon={<Bell color={colors.textSecondary} size={iconSizes.small} />} title="إشعارات الطلبات" onPress={() => { /* Toggle order notifications */ }} variant="ghost" />
        <Button icon={<Bell color={colors.textSecondary} size={iconSizes.small} />} title="العروض" onPress={() => { /* Toggle offers notifications */ }} variant="ghost" />
        <Button icon={<Bell color={colors.textSecondary} size={iconSizes.small} />} title="أخبار المنصة" onPress={() => { /* Toggle platform news notifications */ }} variant="ghost" />
      </ProfileCard>

      {/* Aide */}
      <ProfileCard icon={<LifeBuoy color={colors.primary} size={iconSizes.default} />} title="المساعدة">
        <Button icon={<LifeBuoy color={colors.textSecondary} size={iconSizes.small} />} title="تواصل معنا" onPress={() => { /* Contact support */ }} variant="ghost" />
        <Button icon={<BadgeInfo color={colors.textSecondary} size={iconSizes.small} />} title="الأسئلة الشائعة" onPress={() => { /* Navigate to FAQ */ }} variant="ghost" />
        <Button icon={<Shield color={colors.textSecondary} size={iconSizes.small} />} title="سياسة الخصوصية" onPress={() => { /* Navigate to privacy policy */ }} variant="ghost" />
        <Button icon={<ShieldCheck color={colors.textSecondary} size={iconSizes.small} />} title="شروط الاستخدام" onPress={() => { /* Navigate to terms of use */ }} variant="ghost" />
      </ProfileCard>

      {/* Sécurité */}
      <ProfileCard icon={<ShieldCheck color={colors.primary} size={iconSizes.default} />} title="الأمان">
        <Button icon={<Shield color={colors.textSecondary} size={iconSizes.small} />} title="تغيير كلمة المرور" onPress={() => { /* Change password */ }} variant="ghost" />
        <Button icon={<ShieldCheck color={colors.textSecondary} size={iconSizes.small} />} title="حذف الحساب" onPress={() => { /* Delete account */ }} variant="ghost" />
      </ProfileCard>

      {/* Déconnexion */}
      <View style={styles.logoutButtonContainer}>
        <Button icon={<LogOut color={colors.error} size={iconSizes.default} />} title="تسجيل الخروج" onPress={handleLogout} variant="danger" />
      </View>
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

export default ProfileScreen;
