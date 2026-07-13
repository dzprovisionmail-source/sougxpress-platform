import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ShoppingBag, MessageSquareText } from 'lucide-react-native';

import { Button, Card, ListItem } from '../design/components';
import AddressCard from '../components/checkout/AddressCard';
import OrderSummary from '../components/checkout/OrderSummary';
import PaymentMethod from '../components/checkout/PaymentMethod';

import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';
import { iconSizes } from '../design/icons';
import { radius } from '../design/radius';

import useCheckout from '../hooks/useCheckout';

const CheckoutScreen = () => {
  const router = useRouter();
  const {
    loading,
    error,
    selectedAddress,
    addresses,
    notes,
    setNotes,
    handleConfirmOrder,
    cartItems,
    subtotal,
    deliveryFee,
    total,
  } = useCheckout();

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const onConfirm = async () => {
    const result = await handleConfirmOrder();
    if (result.success) {
      setCreatedOrderId(result.orderId || null);
      setOrderSuccess(true);
    } else if (error) {
      Alert.alert('خطأ', error);
    }
  };

  if (orderSuccess) {
    return (
      <View style={styles.successContainer}>
        <Stack.Screen options={{ title: 'تم الطلب', headerLeft: () => null }} />
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>تم إرسال طلبك بنجاح</Text>
          <Text style={styles.successSubtitle}>جار انتظار موافقة التاجر</Text>
          
          <Button
            title="عرض الطلب"
            onPress={() => router.push(`/order-details?id=${createdOrderId}`)}
            variant="primary"
            style={styles.successButton}
          />
          <Button
            title="العودة للرئيسية"
            onPress={() => router.push('/home')}
            variant="outline"
            style={styles.successButton}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.fullContainer}>
        <Stack.Screen options={{ title: 'إتمام الطلب' }} />
        
        <ScrollView style={styles.container}>
          {/* Address Section */}
          <AddressCard
            address={selectedAddress}
            onEdit={() => { /* Navigate to address selection/creation */ }}
          />

          {/* Store Info (Assuming all items from same store) */}
          {cartItems.length > 0 && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏪 اسم المتجر</Text>
                <Text style={styles.storeName}>{cartItems[0].product.store_id}</Text>
              </View>
            </Card>
          )}

          {/* Cart Items Summary */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🛒 المنتجات</Text>
            {cartItems.map((item, index) => (
              <View key={item.product.id} style={styles.itemRow}>
                <Text style={styles.itemTotal}>{`${((item.product.price_minor * item.quantity) / 100).toFixed(2)} د.ج`}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemQuantity}>{`📦 الكمية: ${item.quantity}`}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* Order Notes */}
          <Card style={styles.sectionCard}>
            <View style={styles.notesHeader}>
              <MessageSquareText size={iconSizes.small} color={colors.primary} />
              <Text style={styles.sectionTitle}>ملاحظات الطلب</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="مثال: بدون بصل، اتصل قبل الوصول..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              textAlign="right"
            />
          </Card>

          {/* Payment Method */}
          <PaymentMethod />

          {/* Order Summary */}
          <OrderSummary
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
          />

          <View style={{ height: spacing.huge }} />
        </ScrollView>

        <View style={styles.bottomAction}>
          <Button
            title="✅ تأكيد الطلب"
            onPress={onConfirm}
            variant="primary"
            loading={loading}
            style={styles.confirmButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  container: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  storeName: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemName: {
    ...typography.body,
    color: colors.text,
  },
  itemQuantity: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  itemTotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
  },
  notesHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.small,
    padding: spacing.md,
    height: 80,
    textAlignVertical: 'top',
    color: colors.text,
    ...typography.body,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...colors.shadows.small,
  },
  confirmButton: {
    width: '100%',
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.huge,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.huge,
    textAlign: 'center',
  },
  successButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
});

export default CheckoutScreen;
