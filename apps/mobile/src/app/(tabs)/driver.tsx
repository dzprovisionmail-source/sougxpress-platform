
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { Stack } from 'expo-router';
import {
  CircleUserRound, Camera, Bike, BadgeInfo, Phone, Mail, MapPinned, IdCard, FolderClosed,
  ShieldCheck, Package, PackageCheck, Hash, WalletCards, CircleDot, Clock3, Navigation,
  Star, Bell, LifeBuoy, SquarePen, LogOut
} from 'lucide-react-native';

import ProfileHeader from '@/components/profile/ProfileHeader';
import DriverStatusCard from '@/components/profile/DriverStatusCard';

import { Button, Card, ListItem } from '@/components/ui'; // Use the new design system components
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';

import useDriver from '@/hooks/useDriver';
import { supabase } from '@/lib/supabase';
import { Driver } from '@/types/schema-03-core';

const DriverScreen = () => {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    checkUser();
  }, []);

  const { driver, loading, error, updateDriver } = useDriver(currentUserId || '');

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Erreur de déconnexion', error.message);
    } else {
      // Navigate to login or home screen
    }
  };

  const handleAvatarUpload = async (newAvatarUrl: string) => {
    if (driver) {
      await updateDriver({ ...driver, avatar_url: newAvatarUrl }); // Assuming avatar_url field exists in Driver
    }
  };

  const handleToggleOnlineStatus = async (value: boolean) => {
    if (driver) {
      await updateDriver({ ...driver, availability: value ? 'online' : 'offline' });
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du profil du livreur...</Text>
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

  if (!driver) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Profil du livreur introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'ملفي المهني' }} />

      <ProfileHeader
        avatarUrl={driver.avatar_url || null}
        onAvatarUpload={handleAvatarUpload}
        name={driver.full_name}
        phoneNumber={driver.phone}
        badgeText="🚲 موصل Soug-XPRESS"
        description="مرحباً بك في Soug-XPRESS"
      />

      {/* Top Status Card */}
      <DriverStatusCard
        driverName={driver.full_name}
        isOnline={driver.availability === 'online'}
        onToggleOnlineStatus={handleToggleOnlineStatus}
        todayOrders={10} // Placeholder
        weekOrders={50} // Placeholder
        totalOrders={200} // Placeholder
        dueAmount={1500.00} // Placeholder
        pendingSettlementOrders={32} // Placeholder
        settlementTarget={50} // Placeholder
      />

      {/* Personal Information */}
      <Card>
        <ListItem icon={<BadgeInfo color={colors.primary} size={iconSizes.default} />} title="بياناتي" />
        <ListItem icon={<CircleUserRound color={colors.textSecondary} size={iconSizes.small} />} title="الاسم" value={driver.full_name} />
        <ListItem icon={<Phone color={colors.textSecondary} size={iconSizes.small} />} title="الهاتف" value={driver.phone} />
        <ListItem icon={<Mail color={colors.textSecondary} size={iconSizes.small} />} title="البريد الإلكتروني" value={driver.email || ''} />
        <ListItem icon={<MapPinned color={colors.textSecondary} size={iconSizes.small} />} title="المدينة" value={driver.city || ''} />
        <ListItem icon={<MapPinned color={colors.textSecondary} size={iconSizes.small} />} title="الحي" value={driver.neighborhood || ''} />
        <Button title="تعديل" onPress={() => { /* Handle edit */ }} variant="outline" />
      </Card>

      {/* Vehicle Information */}
      <Card>
        <ListItem icon={<Bike color={colors.primary} size={iconSizes.default} />} title="مركبتي" />
        <ListItem title="نوع المركبة" value={driver.vehicle_type} />
        <ListItem title="العلامة" value={driver.vehicle_make || ''} />
        <ListItem title="اللون" value={driver.vehicle_color || ''} />
        <ListItem title="رقم التسجيل" value={driver.license_plate || ''} />
        <Button title="تعديل بيانات المركبة" onPress={() => { /* Handle edit vehicle data */ }} variant="outline" />
      </Card>

      {/* Documents */}
      <Card>
        <ListItem icon={<FolderClosed color={colors.primary} size={iconSizes.default} />} title="وثائقي" />
        <ListItem title="بطاقة التعريف" value="مرفوعة" />
        <ListItem title="رخصة السياقة" value="مرفوعة" />
        <ListItem title="وثيقة التأمين" value="مرفوعة" />
        <ListItem icon={<ShieldCheck color={colors.success} size={iconSizes.small} />} title="حالة التحقق" value="موثق" />
      </Card>

      {/* Activity */}
      <Card>
        <ListItem icon={<PackageCheck color={colors.primary} size={iconSizes.default} />} title="نشاطي" />
        <ListItem icon={<Package color={colors.textSecondary} size={iconSizes.small} />} title="الطلبات المنجزة" value="200" />
        <ListItem icon={<Clock3 color={colors.textSecondary} size={iconSizes.small} />} title="ساعات النشاط" value="150 ساعة" />
        <ListItem icon={<Star color={colors.accent} size={iconSizes.small} />} title="التقييم" value="4.8" />
      </Card>

      {/* Settlement */}
      <Card>
        <ListItem icon={<WalletCards color={colors.primary} size={iconSizes.default} />} title="التسوية" />
        <ListItem icon={<Hash color={colors.textSecondary} size={iconSizes.small} />} title="عداد الطلبات" value="32 / 50" />
        <ListItem icon={<WalletCards color={colors.textSecondary} size={iconSizes.small} />} title="الرصيد المستحق" value="1500.00 د.ج" />
        <ListItem icon={<PackageCheck color={colors.textSecondary} size={iconSizes.small} />} title="طلبات مكتملة" value="200" />
        <ListItem icon={<Bell color={colors.textSecondary} size={iconSizes.small} />} title="إشعار التسوية" value="قيد الانتظار" />
      </Card>

      {/* Help */}
      <Card>
        <ListItem icon={<LifeBuoy color={colors.primary} size={iconSizes.default} />} title="المساعدة" />
        <Button title="تواصل مع الإدارة" onPress={() => { /* Contact admin */ }} variant="ghost" />
        <Button title="الأسئلة الشائعة" onPress={() => { /* Navigate to FAQ */ }} variant="ghost" />
        <Button title="سياسة الموصل" onPress={() => { /* Navigate to driver policy */ }} variant="ghost" />
      </Card>

      {/* Logout */}
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

export default DriverScreen;
