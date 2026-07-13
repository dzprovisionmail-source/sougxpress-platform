import React from 'react';
import Button from './Button';
import { ViewStyle, TextStyle } from 'react-native';

interface LoadingButtonProps {
  title?: string;
  onPress: () => void;
  isLoading: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const LoadingButton: React.FC<LoadingButtonProps> = (props) => {
  return <Button {...props} />;
};

export default LoadingButton;
