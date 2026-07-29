import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Search, SlidersHorizontal, X, Mic } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  onVoicePress?: () => void;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'ابحث عن منتجات، متاجر، أو فئات...',
  onFilterPress,
  onVoicePress,
  onClear,
  style,
  autoFocus = false,
  onSubmitEditing,
  returnKeyType,
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        textAlign={isRTL ? 'right' : 'left'}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            fontFamily: TOKENS.typography.families.arabic,
          },
        ]}
      />

      <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.iconButton}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {onVoicePress && (
          <TouchableOpacity onPress={onVoicePress} style={styles.iconButton}>
            <Mic size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        {onFilterPress && (
          <TouchableOpacity
            onPress={onFilterPress}
            style={[styles.filterButton, { backgroundColor: colors.primary }]}
          >
            <SlidersHorizontal size={18} color={colors.textOnBrand} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderRadius: TOKENS.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    width: '100%',
  },
  searchIcon: {
    marginHorizontal: TOKENS.spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    height: '100%',
    paddingHorizontal: TOKENS.spacing.xs,
  },
  actionButtons: {
    alignItems: 'center',
    gap: TOKENS.spacing.xs,
  },
  iconButton: {
    padding: TOKENS.spacing.xs,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchBar;
