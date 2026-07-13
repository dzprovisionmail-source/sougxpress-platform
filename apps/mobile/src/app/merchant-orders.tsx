import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, RefreshCcw, Filter } from 'lucide-react-native';

import { Header } from '../design/components';
import MerchantOrderCard from '../components/orders/MerchantOrderCard';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';
import { iconSizes } from '../design/icons';

import useMerchantOrders from '../hooks/useMerchantOrders';
import { supabase } from '../lib/supabase';
import { OrderStatus } from '../types/schema-03-core';

const MerchantOrdersScreen = () => {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'active' | 'completed'>('new');

  useEffect(() => {
    const getMerchant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMerchantId(user.id);
    };
    getMerchant();
  }, []);

  const { orders, loading, error, updateStatus, refreshOrders } = useMerchantOrders(merchantId || '');

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'new') return order.status === 'pending';
    if (activeTab === 'active') return ['accepted', 'preparing', 'ready_for_pickup'].includes(order.status);
    if (activeTab === 'completed') return ['picked_up', 'delivered', 'cancelled', 'disputed'].includes(order.status);
    return false;
  });

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    const success = await updateStatus(orderId, newStatus);
    if (success) {
      // Notification placeholder
      console.log(`Notification sent for status: ${newStatus}`);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <Stack.Screen 
        options={{ 
          title: 'مركز الطلبات',
          headerRight: () => (
            <TouchableOpacity onPress={refreshOrders} style={styles.headerIcon}>
              <RefreshCcw size={iconSizes.header} color={colors.text} />
            </TouchableOpacity>
          )
        }} 
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]} 
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>السابقة</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]} 
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>الحالية</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'new' && styles.activeTab]} 
          onPress={() => setActiveTab('new')}
        >
          <View style={styles.newTabContainer}>
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <View style={styles.badge} />
            )}
            <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>الجديدة</Text>
          </View>
        </TouchableOpacity>
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noOrdersText}>لا توجد طلبات في هذا القسم.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MerchantOrderCard 
              order={item} 
              onUpdateStatus={handleStatusUpdate} 
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={refreshOrders}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.huge,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  headerIcon: {
    padding: spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.card,
    padding: spacing.sm,
    ...colors.shadows.small,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  newTabContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: spacing.xs,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  noOrdersText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default MerchantOrdersScreen;
