
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ShoppingBag, CirclePlus, SquarePen, Trash2, Eye, EyeOff, X } from 'lucide-react-native';
import ProfileCard from './ProfileCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Product } from '@/types/schema-03-core';

interface ProductFormValues {
  name: string;
  description: string;
  price: string; // major units, e.g. "1200.00"
  stock_quantity: string;
}

interface StoreProductManagementProps {
  isMerchantView: boolean;
  products: Product[];
  loading?: boolean;
  onAddProduct: (input: {
    name: string;
    description?: string | null;
    price_minor: number;
    stock_quantity?: number | null;
  }) => Promise<boolean>;
  onEditProduct: (
    productId: string,
    updates: { name: string; description?: string | null; price_minor: number; stock_quantity?: number | null }
  ) => Promise<boolean>;
  onDeleteProduct: (productId: string) => Promise<boolean>;
  onToggleVisibility: (productId: string, visible: boolean) => Promise<boolean>;
}

const EMPTY_FORM: ProductFormValues = { name: '', description: '', price: '', stock_quantity: '' };

const formatPrice = (minor: number) => `${(minor / 100).toFixed(2)} د.ج`;

const StoreProductManagement: React.FC<StoreProductManagementProps> = ({
  isMerchantView,
  products,
  loading,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleVisibility,
}) => {
  const { colors, tokens } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: (product.price_minor / 100).toString(),
      stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المنتج');
      return;
    }
    const priceValue = parseFloat(form.price);
    if (isNaN(priceValue) || priceValue < 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return;
    }

    const stockValue = form.stock_quantity.trim() === '' ? null : parseInt(form.stock_quantity, 10);
    const priceMinor = Math.round(priceValue * 100);

    setSubmitting(true);
    const success = editingProduct
      ? await onEditProduct(editingProduct.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price_minor: priceMinor,
          stock_quantity: stockValue,
        })
      : await onAddProduct({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price_minor: priceMinor,
          stock_quantity: stockValue,
        });
    setSubmitting(false);

    if (success) {
      closeModal();
    } else {
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ المنتج، حاول مرة أخرى.');
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert('حذف المنتج', `هل تريد حذف "${product.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const success = await onDeleteProduct(product.id);
          if (!success) {
            Alert.alert('خطأ', 'تعذر حذف المنتج.');
          }
        },
      },
    ]);
  };

  const handleToggleVisibility = async (product: Product) => {
    const nextVisible = product.status !== 'active';
    const success = await onToggleVisibility(product.id, nextVisible);
    if (!success) {
      Alert.alert('خطأ', 'تعذر تحديث حالة ظهور المنتج.');
    }
  };

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [products]
  );

  return (
    <ProfileCard icon={<ShoppingBag color={colors.primary} size={24} />} title="المنتجات">
      {isMerchantView && (
        <TouchableOpacity
          onPress={openAddModal}
          style={[
            styles.addRow,
            {
              borderColor: colors.primary,
              borderRadius: tokens.radius.sm,
              paddingVertical: tokens.spacing.sm,
              marginBottom: tokens.spacing.sm,
            },
          ]}
        >
          <CirclePlus color={colors.primary} size={20} />
          <Text
            style={{
              color: colors.primary,
              fontFamily: tokens.typography.families.arabic,
              fontWeight: '600',
              marginRight: tokens.spacing.sm,
            }}
          >
            إضافة منتج
          </Text>
        </TouchableOpacity>
      )}

      {!loading && sortedProducts.length === 0 && (
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            textAlign: 'center',
            paddingVertical: tokens.spacing.md,
          }}
        >
          لا توجد منتجات بعد.
        </Text>
      )}

      {sortedProducts.map((product) => {
        const isVisible = product.status === 'active';
        return (
          <View
            key={product.id}
            style={[
              styles.productRow,
              {
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.sm,
                paddingVertical: tokens.spacing.sm,
                paddingHorizontal: tokens.spacing.sm,
                marginBottom: tokens.spacing.sm,
                opacity: isVisible ? 1 : 0.6,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: tokens.typography.families.arabic,
                  fontWeight: '700',
                  textAlign: 'right',
                }}
              >
                {product.name}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: tokens.typography.families.arabic,
                  fontSize: tokens.typography.sizes.sm,
                  textAlign: 'right',
                  marginTop: 2,
                }}
              >
                {`${formatPrice(product.price_minor)} · ${
                  product.stock_quantity != null ? `المخزون: ${product.stock_quantity}` : 'المخزون غير محدد'
                }`}
              </Text>
            </View>

            <View style={styles.productActions}>
              {isMerchantView && (
                <>
                  <TouchableOpacity onPress={() => handleToggleVisibility(product)} style={styles.iconButton}>
                    {isVisible ? (
                      <Eye color={colors.success} size={20} />
                    ) : (
                      <EyeOff color={colors.textDisabled} size={20} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEditModal(product)} style={styles.iconButton}>
                    <SquarePen color={colors.info} size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(product)} style={styles.iconButton}>
                    <Trash2 color={colors.error} size={20} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        );
      })}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.bgElevated, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg },
            ]}
          >
            <View style={[styles.modalHeader, { marginBottom: tokens.spacing.md }]}>
              <TouchableOpacity onPress={closeModal}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: tokens.typography.families.arabic,
                  fontSize: tokens.typography.sizes.md,
                  fontWeight: '700',
                }}
              >
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج'}
              </Text>
            </View>

            <ScrollView>
              <Text
                style={[
                  styles.label,
                  { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic },
                ]}
              >
                اسم المنتج
              </Text>
              <TextInput
                value={form.name}
                onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
                style={[
                  styles.input,
                  {
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                    borderRadius: tokens.radius.sm,
                    fontFamily: tokens.typography.families.arabic,
                  },
                ]}
                placeholder="مثال: عصير برتقال طبيعي"
                placeholderTextColor={colors.textDisabled}
                textAlign="right"
              />

              <Text
                style={[
                  styles.label,
                  { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic },
                ]}
              >
                الوصف
              </Text>
              <TextInput
                value={form.description}
                onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                    borderRadius: tokens.radius.sm,
                    fontFamily: tokens.typography.families.arabic,
                  },
                ]}
                placeholder="وصف مختصر للمنتج"
                placeholderTextColor={colors.textDisabled}
                textAlign="right"
                multiline
              />

              <Text
                style={[
                  styles.label,
                  { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic },
                ]}
              >
                السعر (د.ج)
              </Text>
              <TextInput
                value={form.price}
                onChangeText={(text) => setForm((prev) => ({ ...prev, price: text }))}
                style={[
                  styles.input,
                  {
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                    borderRadius: tokens.radius.sm,
                    fontFamily: tokens.typography.families.arabic,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textDisabled}
                textAlign="right"
                keyboardType="decimal-pad"
              />

              <Text
                style={[
                  styles.label,
                  { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic },
                ]}
              >
                الكمية المتوفرة
              </Text>
              <TextInput
                value={form.stock_quantity}
                onChangeText={(text) => setForm((prev) => ({ ...prev, stock_quantity: text }))}
                style={[
                  styles.input,
                  {
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                    borderRadius: tokens.radius.sm,
                    fontFamily: tokens.typography.families.arabic,
                  },
                ]}
                placeholder="اتركه فارغاً إذا غير محدد"
                placeholderTextColor={colors.textDisabled}
                textAlign="right"
                keyboardType="number-pad"
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: tokens.radius.md,
                    paddingVertical: tokens.spacing.md,
                    marginTop: tokens.spacing.lg,
                    opacity: submitting ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textOnBrand,
                    fontFamily: tokens.typography.families.arabic,
                    fontWeight: '700',
                    fontSize: tokens.typography.sizes.base,
                  }}
                >
                  {submitting ? 'جاري الحفظ...' : editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ProfileCard>
  );
};

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  productRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
  },
  productActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitButton: {
    alignItems: 'center',
  },
});

export default StoreProductManagement;
