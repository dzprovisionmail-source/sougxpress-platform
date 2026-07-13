
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Bike, CircleDot, Hash, PackageCheck, WalletCards } from 'lucide-react-native';
import ProfileCard from './ProfileCard';
import ProfileRow from './ProfileRow';

interface DriverStatusCardProps {
  driverName: string;
  isOnline: boolean;
  onToggleOnlineStatus: (value: boolean) => void;
  todayOrders: number;
  weekOrders: number;
  totalOrders: number;
  dueAmount: number;
  pendingSettlementOrders: number;
  settlementTarget: number;
}

const DriverStatusCard: React.FC<DriverStatusCardProps> = ({
  driverName,
  isOnline,
  onToggleOnlineStatus,
  todayOrders,
  weekOrders,
  totalOrders,
  dueAmount,
  pendingSettlementOrders,
  settlementTarget,
}) => {
  return (
    <ProfileCard icon={<Bike color="#007BFF" size={24} />} title={`مرحباً ${driverName}`}>
      <View style={styles.statusToggleContainer}>
        <Text style={styles.statusLabel}>الحالة:</Text>
        <Text style={styles.statusText(isOnline)}>{isOnline ? '🟢 متصل' : '🔴 غير متصل'}</Text>
        <Switch
          onValueChange={onToggleOnlineStatus}
          value={isOnline}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isOnline ? '#007BFF' : '#f4f3f4'}
        />
      </View>
      <ProfileRow label="طلبات اليوم" value={todayOrders.toString()} />
      <ProfileRow label="طلبات هذا الأسبوع" value={weekOrders.toString()} />
      <ProfileRow label="إجمالي الطلبات" value={totalOrders.toString()} />
      <ProfileRow label="المبلغ المستحق" value={`${dueAmount.toFixed(2)} د.ج`} />
      <ProfileRow
        label="عدد الطلبات المتبقية للتسوية"
        value={`${pendingSettlementOrders} / ${settlementTarget}`}
      />
      <Text style={styles.settlementExample}>
        {`يتبقى ${settlementTarget - pendingSettlementOrders} طلباً للوصول إلى التسوية`}
      </Text>
    </ProfileCard>
  );
};

const styles = StyleSheet.create({
  statusToggleContainer: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  statusText: (isOnline: boolean) => ({
    fontSize: 16,
    fontWeight: 'bold',
    color: isOnline ? '#28A745' : '#DC3545',
    flex: 1,
    textAlign: 'right',
  }),
  settlementExample: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
    paddingHorizontal: 10,
  },
});

export default DriverStatusCard;
