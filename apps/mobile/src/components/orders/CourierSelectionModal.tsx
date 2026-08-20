import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { User, Star, Bike, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';
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
    if (visible && orderId) {
      loadDrivers();
    }
  }, [visible, orderId]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await getAvailableDriversForOrder(orderId);
      setDrivers(data);
    } catch (error) {
      console.error("Error loading drivers:", error);
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
      console.error("Error assigning driver:", error);
    } finally {
      setAssigning(null);
    }
  };

  const renderDriver = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() => handleAssign(item.driver_id)}
      disabled={!!assigning}
    >
      <View style={styles.driverInfo}>
        <View style={styles.avatarContainer}>
          <User size={24} color={colors.textSecondary} />
        </View>
        <View style={styles.details}>
          <Text style={styles.driverName}>{item.full_name || `${item.first_name} ${item.last_name}`}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={styles.statText}>{item.rating || '0.0'}</Text>
            </View>
            <View style={styles.statItem}>
              <Bike size={12} color={colors.textSecondary} />
              <Text style={styles.statText}>{item.vehicle_type || 'موصل'}</Text>
            </View>
            <Text style={styles.statText}>({item.delivered_count || 0} توصيلة)</Text>
          </View>
        </View>
      </View>
      <View style={styles.actionIcon}>
        {assigning === item.driver_id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <CheckCircle2 size={24} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="اختر موصل للطلب">
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري البحث عن موصلين متاحين...</Text>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>لا يوجد موصلين متاحين حالياً في هذه المنطقة.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDrivers}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={drivers}
          renderItem={renderDriver}
          keyExtractor={(item) => item.driver_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
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
    ...typography.button,
    color: colors.white,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  driverCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  details: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverName: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  statItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionIcon: {
    paddingLeft: spacing.sm,
  },
});
