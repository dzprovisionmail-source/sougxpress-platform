import React from 'react';
import { ProductCard as UIProductCard, ProductCardProps as UIProductCardProps } from '@/components/ui/ProductCard';

export interface ProductCardProps {
  product?: any;
  id?: string;
  name?: string;
  price?: number;
  onPress?: (productId: string) => void;
  onAddToCart?: (product: any) => void;
  [key: string]: any;
}

const ProductCard: React.FC<ProductCardProps> = (props) => {
  return <UIProductCard {...props} />;
};

export default ProductCard;
