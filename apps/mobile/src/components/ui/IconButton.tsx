import React from 'react';
import Button from './Button';
import { ViewStyle } from 'react-native';

interface IconButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  isLoading?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, ...props }) => {
  return <Button variant="ghost" icon={icon} {...props} />;
};

export default IconButton;
