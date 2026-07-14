import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, I18nManager } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ShoppingBag, MessageSquareText, CheckCircle2 } from 'lucide-react-native';

import { Typography, Button, Card, ListItem } from '@/components/ui';
import AddressCard from '@/components/checkout/AddressCard';
import OrderSummary from '@/components/checkout/OrderSummary';
import PaymentMethod from '@/components/checkout/PaymentMethod';

import { TOKENS } from '@/constants/tokens';
import { getThemeColors, DEFAULT_THEME } from '@/constants/theme';

import useCheckout from '@/hooks/useCheckout';

const CheckoutScreen = () => {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  
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
      <SafeAreaView style={[styles.successContainer, { backgroundColor: colors.bgBase }]}>
        <Stack.Screen options={{ title: 'تم الطلب', headerLeft: () => null }} />
        <View style={styles.successContent}>
          <CheckCircle2 size={80} color={colors.success} />
          <Typography variant="h1" align="center" style={styles.successTitle}>تم إرسال طلبك بنجاح</Typography>
          <Typography variant="body" color="secondary" align="center" style={styles.successSubtitle}>
            جار انتظار موافقة التاجر. يمكنك متابعة حالة طلبك من قائمة طلباتي.
          </Typography>
          
          <Button
            title="عرض الطلب"
            onPress={() => router.push({ pathname: "/customer/orders" })}
            style={styles.successButton}
          />
          <Button
            title="العودة للرئيسية"
            onPress={() => router.push('/customer/home')}
            variant="outline"
            style={styles.successButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen options={{ title: 'إتمام الطلب' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.fullContainer}>
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Typography variant="h1" align="right" style={styles.headerTitle}>إتمام الطلب</Typography>
            </View>

            {/* Address Section */}
            <AddressCard
              address={selectedAddress}
              onEdit={() => { router.push("/customer/addresses") }}
            />

            {/* Store Info */}
            {cartItems.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Typography variant="h3">🏪 المتجر</Typography>
                  <Typography variant="body" color="primary" style={{ fontWeight: 'bold' }}>
                    {cartItems[0].product.stores?.name || "متجر محلي"}
                  </Typography>
                </View>
              </Card>
            )}

            {/* Cart Items Summary */}
            <Card style={styles.sectionCard}>
              <Typography variant="h3" align="right" style={styles.sectionTitle}>🛒 المنتجات</Typography>
              {cartItems.map((item) => (
                <View key={item.product.id} style={[styles.itemRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.itemInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                    <Typography variant="body">{item.product.name}</Typography>
                    <Typography variant="caption" color="secondary">{`الكمية: ${item.quantity}`}</Typography>
                  </View>
                  <Typography variant="body" style={{ fontWeight: 'bold' }}>
                    {`${((item.product.price_minor * item.quantity) / 100).toFixed(2)} د.ج`}
                  </Typography>
                </View>
              ))}
            </Card>

            {/* Order Notes */}
            <Card style={styles.sectionCard}>
              <View style={[styles.notesHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <MessageSquareText size={18} color={colors.primary} />
                <Typography variant="h3">ملاحظات الطلب</Typography>
              </View>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.bgBase, color: colors.textPrimary }]}
                placeholder="مثال: بدون بصل، اتصل قبل الوصول..."
                placeholderTextColor={colors.textDisabled}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                textAlign={isRTL ? "right" : "left"}
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

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={[styles.bottomAction, { backgroundColor: colors.bgSurface }]}>
            <Button
              title="تأكيد الطلب"
              onPress={onConfirm}
              loading={loading}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fullContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
  },
  sectionCard: {
    marginHorizontal: TOKENS.spacing.lg,
    marginVertical: TOKENS.spacing.xs,
    padding: TOKENS.spacing.md,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: TOKENS.spacing.sm,
  },
  itemRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  itemInfo: {
    flex: 1,
  },
  notesHeader: {
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.sm,
  },
  notesInput: {
    borderRadius: TOKENS.radius.md,
    padding: TOKENS.spacing.md,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  bottomAction: {
    padding: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  confirmButton: {
    width: '100%',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TOKENS.spacing.xl,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successTitle: {
    marginTop: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.sm,
  },
  successSubtitle: {
    marginBottom: TOKENS.spacing["3xl"],
  },
  successButton: {
    width: '100%',
    marginBottom: TOKENS.spacing.md,
  },
});

export default CheckoutScreen;
