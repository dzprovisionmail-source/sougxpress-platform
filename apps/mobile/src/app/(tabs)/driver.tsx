
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { Stack } from 'expo-router';
import {
  CircleUserRound, Camera, Bike, BadgeInfo, Phone, Mail, MapPinned, IdCard, FolderClosed,
  ShieldCheck, Package, PackageCheck, Hash, WalletCards, CircleDot, Clock3, Navigation,
  Star, Bell, LifeBuoy, SquarePen, LogOut
} from 'lucide-react-native';

import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileRow from '../../components/profile/ProfileRow';
import ProfileButton from '../../components/profile/ProfileButton';
import AvatarUploader from '../../components/profile/AvatarUploader';
import DriverStatusCard from '../../components/profile/DriverStatusCard';

import useDriver from '../../hooks/useDriver';
import { supabase } from '../../lib/supabase';
import { Driver } from '../../types/schema-03-core';

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
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement du profil du livreur...</Text>
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

  if (!driver) {
    return (
      <View style={styles.centered}>
        <Text>Profil du livreur introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'ملفي المهني' }} />

      <ProfileHeader
        avatarUrl={null} // Placeholder for driver avatar
        onUpload={handleAvatarUpload}
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
      <ProfileCard icon={<BadgeInfo color="#007BFF" size={24} />} title="بياناتي">
        <ProfileRow icon={<CircleUserRound color="#666" size={20} />} label="الاسم" value={driver.full_name} />
        <ProfileRow icon={<Phone color="#666" size={20} />} label="الهاتف" value={driver.phone} />
        <ProfileRow icon={<Mail color="#666" size={20} />} label="البريد الإلكتروني" value={driver.email || ''} /> {/* Assuming email exists */}
        <ProfileRow icon={<MapPinned color="#666" size={20} />} label="المدينة" value={driver.city || ''} /> {/* Assuming city exists */}
        <ProfileRow icon={<MapPinned color="#666" size={20} />} label="الحي" value={driver.neighborhood || ''} /> {/* Assuming neighborhood exists */}
        <ProfileButton label="تعديل" onPress={() => { /* Handle edit */ }} />
      </ProfileCard>

      {/* Vehicle Information */}
      <ProfileCard icon={<Bike color="#007BFF" size={24} />} title="مركبتي">
        <ProfileRow label="نوع المركبة" value={driver.vehicle_type} />
        <ProfileRow label="العلامة" value={driver.vehicle_make || ''} /> {/* Placeholder */}
        <ProfileRow label="اللون" value={driver.vehicle_color || ''} /> {/* Placeholder */}
        <ProfileRow label="رقم التسجيل" value={driver.license_plate || ''} /> {/* Placeholder */}
        <ProfileButton label="تعديل بيانات المركبة" onPress={() => { /* Handle edit vehicle data */ }} />
      </ProfileCard>

      {/* Documents */}
      <ProfileCard icon={<FolderClosed color="#007BFF" size={24} />} title="وثائقي">
        <ProfileRow label="بطاقة التعريف" value="مرفوعة" /> {/* Placeholder */}
        <ProfileRow label="رخصة السياقة" value="مرفوعة" /> {/* Placeholder */}
        <ProfileRow label="وثيقة التأمين" value="مرفوعة" /> {/* Placeholder */}
        <ProfileRow icon={<ShieldCheck color="#28A745" size={20} />} label="حالة التحقق" value="موثق" /> {/* Placeholder */}
      </ProfileCard>

      {/* Activity */}
      <ProfileCard icon={<PackageCheck color="#007BFF" size={24} />} title="نشاطي">
        <ProfileRow icon={<Package color="#666" size={20} />} label="الطلبات المنجزة" value="200" /> {/* Placeholder */}
        <ProfileRow icon={<Clock3 color="#666" size={20} />} label="ساعات النشاط" value="150 ساعة" /> {/* Placeholder */}
        <ProfileRow icon={<Star color="#FFA500" size={20} />} label="التقييم" value="4.8" /> {/* Placeholder */}
      </ProfileCard>

      {/* Settlement */}
      <ProfileCard icon={<WalletCards color="#007BFF" size={24} />} title="التسوية">
        <ProfileRow icon={<Hash color="#666" size={20} />} label="عداد الطلبات" value="32 / 50" /> {/* Placeholder */}
        <ProfileRow icon={<WalletCards color="#666" size={20} />} label="الرصيد المستحق" value="1500.00 د.ج" /> {/* Placeholder */}
        <ProfileRow icon={<PackageCheck color="#666" size={20} />} label="طلبات مكتملة" value="200" /> {/* Placeholder */}
        <ProfileRow icon={<Bell color="#666" size={20} />} label="إشعار التسوية" value="قيد الانتظار" /> {/* Placeholder */}
      </ProfileCard>

      {/* Help */}
      <ProfileCard icon={<LifeBuoy color="#007BFF" size={24} />} title="المساعدة">
        <ProfileButton label="تواصل مع الإدارة" onPress={() => { /* Contact admin */ }} />
        <ProfileButton label="الأسئلة الشائعة" onPress={() => { /* Navigate to FAQ */ }} />
        <ProfileButton label="سياسة الموصل" onPress={() => { /* Navigate to driver policy */ }} />
      </ProfileCard>

      {/* Logout */}
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

export default DriverScreen;
