
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BadgeInfo, Phone, MapPinned, Globe, SquarePen } from 'lucide-react-native';
import ProfileCard from './ProfileCard';
import ProfileRow from './ProfileRow';
import ProfileButton from './ProfileButton';

interface StoreInformationCardProps {
  storeName: string;
  storeDescription: string;
  phone: string;
  whatsapp: string;
  address: string;
  location: string;
  storeLink: string;
  isMerchantView: boolean;
  onEdit: () => void;
}

const StoreInformationCard: React.FC<StoreInformationCardProps> = ({
  storeName,
  storeDescription,
  phone,
  whatsapp,
  address,
  location,
  storeLink,
  isMerchantView,
  onEdit,
}) => {
  return (
    <ProfileCard icon={<BadgeInfo color="#007BFF" size={24} />} title="معلومات المتجر">
      <ProfileRow icon={<BadgeInfo color="#666" size={20} />} label="اسم المتجر" value={storeName} />
      <ProfileRow icon={<SquarePen color="#666" size={20} />} label="وصف المتجر" value={storeDescription} />
      <ProfileRow icon={<Phone color="#666" size={20} />} label="الهاتف" value={phone} />
      <ProfileRow icon={<Phone color="#666" size={20} />} label="واتساب" value={whatsapp} />
      <ProfileRow icon={<MapPinned color="#666" size={20} />} label="العنوان" value={address} />
      <ProfileRow icon={<Globe color="#666" size={20} />} label="الموقع" value={location} />
      <ProfileRow icon={<Globe color="#666" size={20} />} label="رابط المتجر" value={storeLink} />
      {isMerchantView && (
        <ProfileButton icon={<SquarePen color="#666" size={20} />} label="تعديل" onPress={onEdit} />
      )}
    </ProfileCard>
  );
};

const styles = StyleSheet.create({
  // No specific styles needed here as ProfileCard, ProfileRow, and ProfileButton handle styling
});

export default StoreInformationCard;
