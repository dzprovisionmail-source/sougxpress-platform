import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, Alert, Image, ActivityIndicator,
} from 'react-native';
import {
  ShoppingBag, CirclePlus, SquarePen, Trash2, Eye, EyeOff, X, ImagePlus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import ProfileCard from './ProfileCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { SimpleSelect } from '@/components/ui';
import { Product } from '@/types/schema-03-core';

// ─── constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'خضروات', label: 'خضروات' },
  { value: 'فواكه',  label: 'فواكه'  },
  { value: 'لحوم',   label: 'لحوم'   },
  { value: 'مخبوزات', label: 'مخبوزات' },
  { value: 'ألبان',  label: 'ألبان'  },
  { value: 'مشروبات', label: 'مشروبات' },
  { value: 'تجميل',  label: 'تجميل'  },
  { value: 'ملابس',  label: 'ملابس'  },
  { value: 'إلكترونيات', label: 'إلكترونيات' },
  { value: 'عام',    label: 'عام (أخرى)' },
];

// ─── types ────────────────────────────────────────────────────────────────────

interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  category: string;
  imageUri: string | null;
  existingImageUrl: string | null;
}

interface StoreProductManagementProps {
  isMerchantView: boolean;
  storeId: string;
  products: Product[];
  loading?: boolean;
  onAddProduct: (input: {
    name: string;
    description?: string | null;
    price_minor: number;
    stock_quantity?: number | null;
    category: string;
    image_url?: string | null;
  }) => Promise<boolean>;
  onEditProduct: (
    productId: string,
    updates: {
      name: string;
      description?: string | null;
      price_minor: number;
      stock_quantity?: number | null;
      category: string;
      image_url?: string | null;
    }
  ) => Promise<boolean>;
  onDeleteProduct: (productId: string) => Promise<boolean>;
  onToggleVisibility: (productId: string, visible: boolean) => Promise<boolean>;
}

const EMPTY_FORM: ProductFormValues = {
  name: '', description: '', price: '', stock_quantity: '',
  category: 'عام', imageUri: null, existingImageUrl: null,
};

const formatPrice = (minor: number) => `${(minor / 100).toFixed(2)} د.ج`;

// ─── component ────────────────────────────────────────────────────────────────

const StoreProductManagement: React.FC<StoreProductManagementProps> = ({
  isMerchantView, storeId, products, loading,
  onAddProduct, onEditProduct, onDeleteProduct, onToggleVisibility,
}) => {
  const { colors, tokens } = useAppTheme();
  const [modalVisible, setModalVisible]  = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const openAddModal = () => { setEditingProduct(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: (product.price_minor / 100).toString(),
      stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : '',
      category: product.category || 'عام',
      imageUri: null,
      existingImageUrl: product.image_url ?? null,
    });
    setModalVisible(true);
  };
  const closeModal = () => { setModalVisible(false); setEditingProduct(null); setForm(EMPTY_FORM); };
  const patch = <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // ── image picker ──────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'يجب السماح بالوصول إلى المعرض لرفع صور المنتج.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) patch('imageUri', result.assets[0].uri);
  };

  const uploadImage = async (uri: string, productId: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() ?? 'jpg';
      const path = `products/${storeId}/${productId}.${ext}`;
      const { error } = await supabase.storage
        .from('store_images')
        .upload(path, blob, { contentType: blob.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store_images').getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error('[product] uploadImage:', err);
      return null;
    }
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('خطأ', 'يرجى إدخال اسم المنتج'); return; }
    const priceValue = parseFloat(form.price);
    if (isNaN(priceValue) || priceValue < 0) { Alert.alert('خطأ', 'يرجى إدخال سعر صحيح'); return; }

    const stockValue = form.stock_quantity.trim() === '' ? null : parseInt(form.stock_quantity, 10);
    const priceMinor = Math.round(priceValue * 100);

    setSubmitting(true);
    let imageUrl: string | null = form.existingImageUrl;

    if (form.imageUri) {
      setUploadingImage(true);
      const tmpId = editingProduct?.id ?? `new_${Date.now()}`;
      imageUrl = await uploadImage(form.imageUri, tmpId);
      setUploadingImage(false);
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_minor: priceMinor,
      stock_quantity: stockValue,
      category: form.category || 'عام',
      image_url: imageUrl,
    };

    const success = editingProduct
      ? await onEditProduct(editingProduct.id, payload)
      : await onAddProduct(payload);

    setSubmitting(false);
    if (success) { closeModal(); }
    else { Alert.alert('خطأ', 'حدث خطأ أثناء حفظ المنتج، حاول مرة أخرى.'); }
  };

  const handleDelete = (product: Product) => {
    Alert.alert('حذف المنتج', `هل تريد حذف "${product.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const success = await onDeleteProduct(product.id);
        if (!success) Alert.alert('خطأ', 'تعذر حذف المنتج.');
      }},
    ]);
  };

  const handleToggleVisibility = async (product: Product) => {
    const nextVisible = product.status !== 'active';
    const success = await onToggleVisibility(product.id, nextVisible);
    if (!success) Alert.alert('خطأ', 'تعذر تحديث حالة ظهور المنتج.');
  };

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [products]
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <ProfileCard icon={<ShoppingBag color={colors.primary} size={24} />} title="المنتجات">
      {isMerchantView && (
        <TouchableOpacity
          onPress={openAddModal}
          style={[styles.addRow, {
            borderColor: colors.primary, borderRadius: tokens.radius.sm,
            paddingVertical: tokens.spacing.sm, marginBottom: tokens.spacing.sm,
          }]}
        >
          <CirclePlus color={colors.primary} size={20} />
          <Text style={{ color: colors.primary, fontFamily: tokens.typography.families.arabic,
            fontWeight: '600', marginRight: tokens.spacing.sm }}>
            إضافة منتج
          </Text>
        </TouchableOpacity>
      )}

      {!loading && sortedProducts.length === 0 && (
        <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic,
          textAlign: 'center', paddingVertical: tokens.spacing.md }}>
          لا توجد منتجات بعد.
        </Text>
      )}

      {sortedProducts.map((product) => {
        const isVisible = product.status === 'active';
        return (
          <View key={product.id} style={[styles.productRow, {
            borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm,
            paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.sm,
            marginBottom: tokens.spacing.sm, opacity: isVisible ? 1 : 0.6,
          }]}>
            {/* Thumbnail */}
            {product.image_url ? (
              <Image source={{ uri: product.image_url }}
                style={{ width: 44, height: 44, borderRadius: tokens.radius.sm, marginLeft: tokens.spacing.sm }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: tokens.radius.sm,
                backgroundColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
                marginLeft: tokens.spacing.sm }}>
                <ShoppingBag color={colors.textDisabled} size={18} />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic,
                fontWeight: '700', textAlign: 'right' }}>
                {product.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm, textAlign: 'right', marginTop: 2 }}>
                {`${formatPrice(product.price_minor)} · ${product.category}${
                  product.stock_quantity != null ? ` · المخزون: ${product.stock_quantity}` : ''
                }`}
              </Text>
            </View>

            {isMerchantView && (
              <View style={styles.productActions}>
                <TouchableOpacity onPress={() => handleToggleVisibility(product)} style={styles.iconButton}>
                  {isVisible ? <Eye color={colors.success} size={20} /> : <EyeOff color={colors.textDisabled} size={20} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditModal(product)} style={styles.iconButton}>
                  <SquarePen color={colors.info} size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(product)} style={styles.iconButton}>
                  <Trash2 color={colors.error} size={20} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* ── Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, {
            backgroundColor: colors.bgElevated, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg,
          }]}>
            <View style={[styles.modalHeader, { marginBottom: tokens.spacing.md }]}>
              <TouchableOpacity onPress={closeModal}><X color={colors.textSecondary} size={22} /></TouchableOpacity>
              <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.md, fontWeight: '700' }}>
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج'}
              </Text>
            </View>

            <ScrollView>
              {/* Image picker */}
              <Text style={fieldLabel(colors, tokens)}>صورة المنتج</Text>
              <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, { borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm }]}>
                {uploadingImage ? (
                  <ActivityIndicator color={colors.primary} />
                ) : form.imageUri || form.existingImageUrl ? (
                  <Image source={{ uri: form.imageUri ?? form.existingImageUrl! }}
                    style={{ width: '100%', height: 140, borderRadius: tokens.radius.sm }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: tokens.spacing.lg }}>
                    <ImagePlus color={colors.textSecondary} size={28} />
                    <Text style={{ color: colors.textDisabled, fontFamily: tokens.typography.families.arabic,
                      marginTop: tokens.spacing.xs, fontSize: tokens.typography.sizes.sm }}>
                      اضغط لإضافة صورة
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Name */}
              <Text style={fieldLabel(colors, tokens)}>اسم المنتج *</Text>
              <TextInput value={form.name} onChangeText={t => patch('name', t)}
                style={inputStyle(colors, tokens)} placeholder="مثال: عصير برتقال طبيعي"
                placeholderTextColor={colors.textDisabled} textAlign="right" />

              {/* Category */}
              <Text style={fieldLabel(colors, tokens)}>التصنيف *</Text>
              <SimpleSelect options={CATEGORIES} value={form.category}
                onChange={v => patch('category', v)} placeholder="اختر تصنيف المنتج" />

              {/* Description */}
              <Text style={fieldLabel(colors, tokens)}>الوصف</Text>
              <TextInput value={form.description} onChangeText={t => patch('description', t)}
                style={[inputStyle(colors, tokens), styles.textArea]}
                placeholder="وصف مختصر للمنتج" placeholderTextColor={colors.textDisabled}
                textAlign="right" multiline />

              {/* Price */}
              <Text style={fieldLabel(colors, tokens)}>السعر (د.ج) *</Text>
              <TextInput value={form.price} onChangeText={t => patch('price', t)}
                style={inputStyle(colors, tokens)} placeholder="0.00"
                placeholderTextColor={colors.textDisabled} textAlign="right" keyboardType="decimal-pad" />

              {/* Stock */}
              <Text style={fieldLabel(colors, tokens)}>الكمية المتوفرة</Text>
              <TextInput value={form.stock_quantity} onChangeText={t => patch('stock_quantity', t)}
                style={inputStyle(colors, tokens)} placeholder="اتركه فارغاً إذا غير محدد"
                placeholderTextColor={colors.textDisabled} textAlign="right" keyboardType="number-pad" />

              <TouchableOpacity onPress={handleSubmit} disabled={submitting}
                style={[styles.submitButton, {
                  backgroundColor: colors.primary, borderRadius: tokens.radius.md,
                  paddingVertical: tokens.spacing.md, marginTop: tokens.spacing.lg,
                  opacity: submitting ? 0.6 : 1,
                }]}>
                <Text style={{ color: colors.textOnBrand, fontFamily: tokens.typography.families.arabic,
                  fontWeight: '700', fontSize: tokens.typography.sizes.base }}>
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

// ─── style helpers ────────────────────────────────────────────────────────────

const fieldLabel = (colors: any, tokens: any) => ({
  color: colors.textSecondary,
  fontFamily: tokens.typography.families.arabic,
  fontSize: 13,
  textAlign: 'right' as const,
  marginBottom: 6,
  marginTop: 12,
});

const inputStyle = (colors: any, tokens: any) => ({
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  borderRadius: tokens.radius.sm,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: colors.textPrimary,
  fontFamily: tokens.typography.families.arabic,
});

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  productRow: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1 },
  productActions: { flexDirection: 'row-reverse', alignItems: 'center' },
  iconButton: { marginLeft: 10 },
  imagePicker: { borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 4 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: { maxHeight: '92%' },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  submitButton: { alignItems: 'center' },
});

export default StoreProductManagement;
