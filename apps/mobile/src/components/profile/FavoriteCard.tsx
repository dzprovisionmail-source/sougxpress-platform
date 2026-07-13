
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface FavoriteCardProps {
  title: string;
  description: string;
  imageUrl?: string;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({ title, description, imageUrl }) => {
  return (
    <View style={styles.card}>
      {imageUrl && <Image source={{ uri: imageUrl }} style={styles.image} />}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse', // RTL
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginLeft: 10, // Adjust for RTL
  },
  content: {
    flex: 1,
    alignItems: 'flex-end', // RTL
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});

export default FavoriteCard;
