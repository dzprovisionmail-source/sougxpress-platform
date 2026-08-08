
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
import { Button } from '@/components/ui';

import useProfile from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';

import { useAppTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';

const ProfileScreen = () => {
  const { profile, loading, error, updateProfile } = useProfile();
  const { colors } = useAppTheme();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('خطأ في تسجيل الخروج', error.message);
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جاري تحميل الملف الشخصي...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.error }]}>خطأ: {error}</Text>
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

      {/* معلوماتي */}
      <ProfileCard icon={<BadgeInfo color={colors.primary} size={iconSizes.default} />} title="معلوماتي">
        <ProfileRow icon={<Smartphone color={colors.textSecondary} size={iconSizes.small} />} label="رقم الهاتف" value={profile?.phone || ''} />
        <ProfileRow icon={<Mail color={colors.textSecondary} size={iconSizes.small} />} label="البريد الإلكتروني" value={profile?.email || ''} />
        <ProfileRow icon={<Building2 color={colors.textSecondary} size={iconSizes.small} />} label="المدينة" value={profile?.city || ''} />
        <ProfileRow icon={<MapPinned color={colors.textSecondary} size={iconSizes.small} />} label="الحي" value={profile?.neighborhood || ''} />
        <ProfileRow icon={<House color={colors.textSecondary} size={iconSizes.small} />} label="العنوان" value={profile?.address || ''} />
        <ProfileRow icon={<Map color={colors.textSecondary} size={iconSizes.small} />} label="الموقع" value="عرض على الخريطة" />
        <Button title="تعديل" onPress={() => { /* Handle edit */ }} variant="outline" />
      </ProfileCard>

      {/* طلباتي */}
      <ProfileCard icon={<Package color={colors.primary} size={iconSizes.default} />} title="طلباتي">
        <Button icon={<Package color={colors.textSecondary} size={iconSizes.small} />} title="الطلبات الحالية" onPress={() => { /* Navigate to current orders */ }} variant="ghost" />
        <Button icon={<PackageOpen color={colors.textSecondary} size={iconSizes.small} />} title="الطلبات السابقة" onPress={() => { /* Navigate to past orders */ }} variant="ghost" />
        <Button icon={<PackageCheck color={colors.textSecondary} size={iconSizes.small} />} title="الطلبات الملغاة" onPress={() => { /* Navigate to cancelled orders */ }} variant="ghost" />
      </ProfileCard>

      {/* المفضلة */}
      <ProfileCard icon={<Heart color={colors.primary} size={iconSizes.default} />} title="المفضلة">
        <Button icon={<Store color={colors.textSecondary} size={iconSizes.small} />} title="المتاجر" onPress={() => { /* Navigate to favorite stores */ }} variant="ghost" />
        <Button icon={<ShoppingBag color={colors.textSecondary} size={iconSizes.small} />} title="المنتجات" onPress={() => { /* Navigate to favorite products */ }} variant="ghost" />
        <Button icon={<Bike color={colors.textSecondary} size={iconSizes.small} />} title="الموصلون" onPress={() => { /* Navigate to favorite drivers */ }} variant="ghost" />
      </ProfileCard>

      {/* الإشعارات */}
      <ProfileCard icon={<Bell color={colors.primary} size={iconSizes.default} />} title="الإشعارات">
        <Button icon={<Bell color={colors.textSecondary} size={iconSizes.small} />} title="إشعارات الطلبات" onPress={() => { /* Toggle order notifications */ }} variant="ghost" />
        <Button icon={<Bell color={colors.textSecondary} size={iconSizes.small} />} title="العروض" onPress={() => { /* Toggle offers notifications */ }} variant="ghost" />
        <Button icon={<Bell color={colors.textSecondary} size={iconSizes.small} />} title="أخبار المنصة" onPress={() => { /* Toggle platform news notifications */ }} variant="ghost" />
      </ProfileCard>

      {/* المساعدة */}
      <ProfileCard icon={<LifeBuoy color={colors.primary} size={iconSizes.default} />} title="المساعدة">
        <Button icon={<LifeBuoy color={colors.textSecondary} size={iconSizes.small} />} title="تواصل معنا" onPress={() => { /* Contact support */ }} variant="ghost" />
        <Button icon={<BadgeInfo color={colors.textSecondary} size={iconSizes.small} />} title="الأسئلة الشائعة" onPress={() => { /* Navigate to FAQ */ }} variant="ghost" />
        <Button icon={<Shield color={colors.textSecondary} size={iconSizes.small} />} title="سياسة الخصوصية" onPress={() => { /* Navigate to privacy policy */ }} variant="ghost" />
        <Button icon={<ShieldCheck color={colors.textSecondary} size={iconSizes.small} />} title="شروط الاستخدام" onPress={() => { /* Navigate to terms of use */ }} variant="ghost" />
      </ProfileCard>

      {/* الأمان */}
      <ProfileCard icon={<ShieldCheck color={colors.primary} size={iconSizes.default} />} title="الأمان">
        <Button icon={<Shield color={colors.textSecondary} size={iconSizes.small} />} title="تغيير كلمة المرور" onPress={() => { /* Change password */ }} variant="ghost" />
        <Button icon={<ShieldCheck color={colors.textSecondary} size={iconSizes.small} />} title="حذف الحساب" onPress={() => { /* Delete account */ }} variant="ghost" />
      </ProfileCard>

      {/* تسجيل الخروج */}
      <View style={styles.logoutButtonContainer}>
        <Button icon={<LogOut color={colors.error} size={iconSizes.default} />} title="تسجيل الخروج" onPress={handleLogout} variant="danger" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  logoutButtonContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
});

export default ProfileScreen;
