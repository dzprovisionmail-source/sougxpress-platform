
import React from 'react';
import Button from './Button';
import { ViewStyle, TextStyle } from 'react-native';

interface DangerButtonProps {
  title?: string;
  onPress: () => void;
  isLoading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const DangerButton: React.FC<DangerButtonProps> = (props) => {
  return <Button variant="danger" {...props} />;
};

export default DangerButton;
