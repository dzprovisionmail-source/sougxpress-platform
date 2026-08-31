import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleProp,
  ViewStyle,
  I18nManager,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';
import { KeyboardAwareView } from './KeyboardAwareView';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number | string;
  style?: StyleProp<ViewStyle>;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  style,
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
                style,
              ]}
            >
              {/* Drag Handle Indicator */}
              <View style={styles.handleBarContainer}>
                <View style={[styles.handleBar, { backgroundColor: colors.borderSubtle }]} />
              </View>

              {/* Header */}
              {title ? (
                <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text
                    style={[
                      styles.title,
                      { color: colors.textPrimary, fontFamily: TOKENS.typography.families.arabic },
                    ]}
                  >
                    {title}
                  </Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Sheet Body: one shared keyboard-aware scroll boundary for every sheet form */}
              <KeyboardAwareView
                scrollable
                contentContainerStyle={styles.bodyContent}
              >
                {children}
              </KeyboardAwareView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
    maxHeight: '85%',
    paddingBottom: TOKENS.spacing.xl,
    borderWidth: 1,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: '700',
  },
  closeButton: {
    padding: TOKENS.spacing.xs,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContent: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.md,
  },
});

export default BottomSheet;
