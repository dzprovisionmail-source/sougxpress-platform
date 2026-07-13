
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShoppingBag, Package, CirclePlus, SquarePen } from 'lucide-react-native';
import ProfileCard from './ProfileCard';
import ProfileButton from './ProfileButton';

interface StoreProductManagementProps {
  isMerchantView: boolean;
  onManageProducts: () => void;
  onAddProduct: () => void;
  onEditProduct: () => void;
  onDeleteProduct: () => void;
}

const StoreProductManagement: React.FC<StoreProductManagementProps> = ({
  isMerchantView,
  onManageProducts,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}) => {
  return (
    <ProfileCard icon={<ShoppingBag color="#007BFF" size={24} />} title="المنتجات">
      <ProfileButton icon={<Package color="#666" size={20} />} label="جميع المنتجات" onPress={onManageProducts} />
      {isMerchantView && (
        <>
          <ProfileButton icon={<CirclePlus color="#666" size={20} />} label="إضافة منتج" onPress={onAddProduct} />
          <ProfileButton icon={<SquarePen color="#666" size={20} />} label="تعديل منتج" onPress={onEditProduct} />
          <ProfileButton icon={<SquarePen color="#666" size={20} />} label="حذف منتج" onPress={onDeleteProduct} />
        </>
      )}
      <ProfileButton label="إدارة المنتجات" onPress={onManageProducts} />
    </ProfileCard>
  );
};

const styles = StyleSheet.create({
  // No specific styles needed here as ProfileCard and ProfileButton handle styling
});

export default StoreProductManagement;
