import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Camera, Star } from 'lucide-react-native';
import AvatarUploader from './AvatarUploader';

interface StoreHeaderProps {
  storeName: string;
  category: string;
  rating: number;
  isOpen: boolean;
  storeLogoUrl?: string | null;
  coverImageUrl?: string | null;
  onLogoUpload?: (url: string) => void;
  onCoverUpload?: (url: string) => void;
  isMerchantView: boolean;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({
  storeName,
  category,
  rating,
  isOpen,
  storeLogoUrl,
  coverImageUrl,
  onLogoUpload = () => {},
  onCoverUpload = () => {},
  isMerchantView,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.coverImageContainer}>
        {coverImageUrl ? (
          <Image source={{ uri: coverImageUrl }} style={styles.coverImage as ImageStyle} />
        ) : (
          <View style={styles.coverImagePlaceholder} />
        )}
        {isMerchantView && (
          <TouchableOpacity style={styles.editCoverButton} onPress={() => console.log('Edit Cover')}>
            <Camera size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.logoAndInfoContainer}>
        <View style={styles.logoContainer}>
          <AvatarUploader avatarUrl={storeLogoUrl} onUpload={onLogoUpload} />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.category}>{category}</Text>
          <View style={styles.ratingContainer}>
            <Star size={16} color="#FFA500" fill="#FFA500" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={[styles.statusTextBase, { color: isOpen ? '#28A745' : '#DC3545' }]}>
              {isOpen ? 'مفتوح' : 'مغلق'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingBottom: 20,
  },
  coverImageContainer: {
    height: 150,
    width: '100%',
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  logoAndInfoContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    marginTop: -50,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  infoContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  storeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#FFA500',
    marginRight: 5,
  },
  statusTextBase: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default StoreHeader;
