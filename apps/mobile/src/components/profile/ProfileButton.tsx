
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ProfileButtonProps {
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean; // To handle the last button styling, e.g., logout
}

const ProfileButton: React.FC<ProfileButtonProps> = ({ icon, label, onPress, isLast }) => {
  const { colors, tokens } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isLast ? colors.error : colors.bgBase,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.sm,
          paddingVertical: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          marginVertical: tokens.spacing.xs,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.buttonContent}>
        {icon && <View style={{ marginLeft: tokens.spacing.sm }}>{icon}</View>}
        <Text
          style={{
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
            textAlign: 'right',
            flex: 1,
            color: isLast ? colors.textOnBrand : colors.textPrimary,
          }}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
});

export default ProfileButton;
