import React from 'react';
import { StoreCard as UIStoreCard, StoreCardProps as UIStoreCardProps } from '@/components/ui/StoreCard';

export interface StoreCardProps {
  store?: any;
  id?: string;
  name?: string;
  onPress?: (storeId: string) => void;
  [key: string]: any;
}

const StoreCard: React.FC<StoreCardProps> = (props) => {
  return <UIStoreCard {...props} />;
};

export default StoreCard;
