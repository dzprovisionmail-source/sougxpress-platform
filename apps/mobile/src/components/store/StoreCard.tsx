
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Star, MapPin } from 'lucide-react-native';
import { colors } from '../../design/colors';
import { spacing } from '../../design/spacing';
import { radius } from '../../design/radius';
import { typography } from '../../design/typography';
import { shadows } from '../../design/shadows';
import { Store } from '../../types/schema-03-core';

interface StoreCardProps {
  store: Store;
  onPress: (storeId: string) => void;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onPress }) => {
  const handlePress = () => {
    onPress(store.id);
  };

  // Placeholder for store logo and cover image. In a real app, these would come from store data.
  const storeLogo = 'https://via.placeholder.com/60'; 
  const coverImage = 'https://via.placeholder.com/150x80';

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image source={{ uri: coverImage }} style={styles.coverImage} />
      <View style={styles.logoContainer}>
        <Image source={{ uri: storeLogo }} style={styles.storeLogo} />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.storeName}>{store.name}</Text>
        <Text style={styles.storeCategory}>{store.category}</Text>
        <View style={styles.ratingContainer}>
          <Star size={16} color={colors.accent} fill={colors.accent} />
          <Text style={styles.ratingText}>4.5</Text>
          <Text style={styles.statusText}>{store.status === 'active' ? '🟢 Ouvert' : '🔴 Fermé'}</Text>
        </View>
        <View style={styles.locationContainer}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={styles.locationText}>5 km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    ...shadows.small,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  logoContainer: {
    position: 'absolute',
    top: 40,
    right: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.avatar,
    padding: spacing.xs,
    ...shadows.small,
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: radius.avatar,
  },
  infoContainer: {
    padding: spacing.md,
    paddingTop: spacing.huge,
    alignItems: 'flex-end', // RTL
  },
  storeName: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  storeCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ratingText: {
    ...typography.body,
    color: colors.text,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.success,
    marginRight: spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
});

export default StoreCard;
