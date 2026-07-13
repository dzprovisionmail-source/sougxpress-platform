
import React from 'react';
import Button from './Button';
import { ViewStyle, TextStyle } from 'react-native';

interface PrimaryButtonProps {
  title?: string;
  onPress: () => void;
  isLoading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = (props) => {
  return <Button variant="primary" {...props} />;
};

export default PrimaryButton;
