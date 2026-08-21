import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bike, CheckCircle2, Star, User, X } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { getAvailableDriversForOrder, assignDriverToOrder } from '@/services/merchant-orders.service';

interface DriverOption {
  driver_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  vehicle_type?: string | null;
  rating?: number | null;
  delivered_count?: number | null;
  is_available?: boolean | null;
}

interface CourierSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  onAssigned: (driverId: string) => void;
}

export const CourierSelectionModal: React.FC<CourierSelectionModalProps> = ({
  visible,
  onClose,
  orderId,
  onAssigned,
}) => {
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const loadDrivers = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const data = await getAvailableDriversForOrder(orderId);
      setDrivers(data as DriverOption[]);
    } catch (error) {
      console.error('Error loading drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (visible) {
      void loadDrivers();
    }
  }, [loadDrivers, visible]);

  const handleAssign = async (driverId: string) => {
    if (assigning) return;

    setAssigning(driverId);
    try {
      const success = await assignDriverToOrder(orderId, driverId);
      if (success) {
        onAssigned(driverId);
        onClose();
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
    } finally {
      setAssigning(null);
    }
  };

  const renderDriver = ({ item }: { item: DriverOption }) => {
    const displayName =
      item.full_name?.trim() ||
      [item.first_name, item.last_name].filter(Boolean).join(' ').trim() ||
      'موصل';
    const isAssigning = assigning === item.driver_id;
    const rating = Number(item.rating);

    return (
      <TouchableOpacity
        style={styles.driverCard}
        onPress={() => void handleAssign(item.driver_id)}
        disabled={Boolean(assigning)}
        accessibilityRole="button"
        accessibilityLabel={`اختيار ${displayName}`}
      >
        <View style={styles.driverInfo}>
          <View style={styles.avatarContainer}>
            <User size={24} color="#4B5563" />
          </View>
          <View style={styles.details}>
            <Text style={styles.driverName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Star size={12} color={colors.warning} fill={colors.warning} />
                <Text style={styles.statText}>
                  {Number.isFinite(rating) ? rating.toFixed(1) : '0.0'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Bike size={12} color={colors.textSecondary} />
                <Text style={styles.statText}>{item.vehicle_type || 'موصل'}</Text>
              </View>
              <Text style={styles.statText}>
                {item.delivered_count || 0} توصيلة
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.actionIcon}>
          {isAssigning ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <CheckCircle2 size={24} color={colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={styles.sheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handleBar} />
            <View style={styles.header}>
              <Text style={styles.title}>مرحلة التوصيل</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>اختر الموصل لإكمال الطلب</Text>

            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                  جاري البحث عن موصلين متاحين...
                </Text>
              </View>
            ) : drivers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>
                  لا يوجد موصلون متاحون حالياً في هذه المنطقة.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => void loadDrivers()}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>إعادة المحاولة</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={drivers}
                renderItem={renderDriver}
                keyExtractor={(item) => item.driver_id}
                contentContainerStyle={styles.listContent}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    minHeight: 280,
    backgroundColor: colors.backgroundDark,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    marginVertical: spacing.sm,
    borderRadius: 3,
    backgroundColor: colors.divider,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  closeButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginVertical: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  centerContainer: {
    minHeight: 180,
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
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    ...typography.button,
    color: colors.white,
  },
  driverCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
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
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  details: {
    flex: 1,
    minWidth: 0,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  driverName: {
    ...typography.subtitle,
    color: colors.black,
    fontWeight: '700',
    maxWidth: '100%',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  statsRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 8,
  },
  statItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.caption,
    color: '#4B5563',
  },
  actionIcon: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: spacing.sm,
  },
});

export default CourierSelectionModal;

