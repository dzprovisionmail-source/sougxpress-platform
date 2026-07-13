
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../design/colors';
import { spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { iconSizes } from '../../design/icons';

interface ListItemProps {
  icon?: React.ReactNode;
  title: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  valueStyle?: TextStyle;
}

const ListItem: React.FC<ListItemProps> = ({
  icon,
  title,
  value,
  onPress,
  showChevron = false,
  isLast = false,
  style,
  titleStyle,
  valueStyle,
}) => {
  const content = (
    <View style={styles.contentContainer}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {value && <Text style={[styles.value, valueStyle]}>{value}</Text>}
      {showChevron && <ChevronLeft size={iconSizes.default} color={colors.textSecondary} />}
    </View>
  );

  return (
    <View style={[styles.container, !isLast && styles.divider, style]}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} style={styles.touchable}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  touchable: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginLeft: spacing.md, // Adjust for RTL
  },
  title: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    textAlign: 'right', // RTL
  },
  value: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm, // Adjust for RTL
  },
});

export default ListItem;
