import React from 'react';
import Button from './Button';
import { ViewStyle, TextStyle } from 'react-native';

interface OutlineButtonProps {
  title?: string;
  onPress: () => void;
  isLoading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const OutlineButton: React.FC<OutlineButtonProps> = (props) => {
  return <Button variant="outline" {...props} />;
};

export default OutlineButton;
