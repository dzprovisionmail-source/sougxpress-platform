import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { User, Star, Bike, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getAvailableDriversForOrder, assignDriverToOrder } from '@/services/merchant-orders.service';

interface CourierSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  onAssigned: () => void;
}

export const CourierSelectionModal: React.FC<CourierSelectionModalProps> = ({
  visible,
  onClose,
  orderId,
  onAssigned,
}) => {
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (visible && orderId) loadDrivers();
  }, [visible, orderId]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      setDrivers(await getAvailableDriversForOrder(orderId));
    } catch (error) {
      console.error('Error loading drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (driverId: string) => {
    setAssigning(driverId);
    try {
      const success = await assignDriverToOrder(orderId, driverId);
      if (success) {
        onAssigned();
        onClose();
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
    } finally {
      setAssigning(null);
    }
  };

  const renderDriver = (item: any) => (
    <TouchableOpacity
      key={item.driver_id}
      style={styles.driverCard}
      onPress={() => handleAssign(item.driver_id)}
      disabled={!!assigning}
    >
      <View style={styles.driverInfo}>
        <View style={styles.avatarContainer}>
          <User size={22} color={colors.textSecondary} />
        </View>
        <View style={styles.details}>
          <Text style={styles.driverName}>{item.full_name || `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || 'موصل'}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Star size={11} color={colors.warning} fill={colors.warning} />
              <Text style={styles.statText}>{item.rating ?? '0.0'}</Text>
            </View>
            <View style={styles.statItem}>
              <Bike size={11} color={colors.textSecondary} />
              <Text style={styles.statText}>{item.vehicle_type || 'موصل'}</Text>
            </View>
            <Text style={styles.statText}>({item.delivered_count ?? 0} توصيلات)</Text>
          </View>
        </View>
      </View>
      <View style={styles.actionIcon}>
        {assigning === item.driver_id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <CheckCircle2 size={22} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="مرحلة التوصيل">
      <View style={styles.stageHeader}>
        <Text style={styles.stageTitle}>الموصلون المتاحون</Text>
        <Text style={styles.stageSubtitle}>اختر الموصل الذي سيكمل عملية التوصيل للزبون.</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري البحث عن موصلين متاحين...</Text>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>لا يوجد موصلون متاحون حالياً في منطقة الطلب.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDrivers}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {drivers.map(renderDriver)}
        </ScrollView>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  stageHeader: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  stageTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  stageSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  list: {
    maxHeight: 420,
  },
  centerContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
  },
  retryText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  driverCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.sm,
    borderRadius: radius.medium,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  details: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 3,
    gap: 7,
  },
  statItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionIcon: {
    paddingLeft: spacing.sm,
  },
});
