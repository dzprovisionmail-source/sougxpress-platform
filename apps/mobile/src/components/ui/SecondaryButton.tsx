
import React from 'react';
import Button from './Button';
import { ViewStyle, TextStyle } from 'react-native';

interface SecondaryButtonProps {
  title?: string;
  onPress: () => void;
  isLoading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = (props) => {
  return <Button variant="secondary" {...props} />;
};

export default SecondaryButton;
