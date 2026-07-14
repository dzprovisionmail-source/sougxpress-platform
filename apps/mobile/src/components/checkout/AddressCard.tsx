
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, ChevronLeft } from 'lucide-react-native';
import { colors } from '@/design/colors';
import { spacing } from '@/design/spacing';
import { radius } from '@/design/radius';
import { typography } from '@/design/typography';
import { CustomerAddress } from '@/types/schema-03-core';
import { Card } from '@/components/ui';
import { iconSizes } from '@/design/icons';

interface AddressCardProps {
  address: CustomerAddress | null;
  onEdit: () => void;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, onEdit }) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 عنوان التوصيل</Text>
        <TouchableOpacity onPress={onEdit}>
          <Text style={styles.editButton}>✏️ تعديل العنوان</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <MapPin size={iconSizes.default} color={colors.primary} style={styles.icon} />
        <View style={styles.addressInfo}>
          {address ? (
            <>
              <Text style={styles.addressLabel}>{address.label}</Text>
              <Text style={styles.addressText}>{address.address_text}</Text>
            </>
          ) : (
            <Text style={styles.noAddressText}>لم يتم اختيار عنوان بعد.</Text>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
  },
  editButton: {
    ...typography.caption,
    color: colors.primary,
  },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  icon: {
    marginLeft: spacing.md,
  },
  addressInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  addressLabel: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  addressText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  noAddressText: {
    ...typography.body,
    color: colors.error,
  },
});

export default AddressCard;
