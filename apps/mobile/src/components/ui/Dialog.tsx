import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react-native';
import { Button } from './Button';
import { useAppTheme } from '../../contexts/ThemeContext';
import { TOKENS } from '../../constants/tokens';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmTitle?: string;
  cancelTitle?: string;
  onConfirm?: () => void;
  type?: 'info' | 'warning' | 'danger' | 'success';
  loading?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  onClose,
  title,
  description,
  confirmTitle = 'تأكيد',
  cancelTitle = 'إلغاء',
  onConfirm,
  type = 'info',
  loading = false,
}) => {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const renderIcon = () => {
    switch (type) {
      case 'danger':
      case 'warning':
        return <AlertTriangle size={32} color={colors.error} />;
      case 'success':
        return <CheckCircle2 size={32} color={colors.success} />;
      case 'info':
      default:
        return <Info size={32} color={colors.primary} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialogCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}12` }]}>
            {renderIcon()}
          </View>

          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: TOKENS.typography.families.arabic }]}>
            {title}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary, fontFamily: TOKENS.typography.families.arabic }]}>
            {description}
          </Text>

          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {cancelTitle && (
              <View style={styles.buttonWrapper}>
                <Button
                  title={cancelTitle}
                  onPress={onClose}
                  variant="ghost"
                  size="md"
                  disabled={loading}
                />
              </View>
            )}

            <View style={styles.buttonWrapper}>
              <Button
                title={confirmTitle}
                onPress={onConfirm || onClose}
                variant={type === 'danger' ? 'danger' : 'primary'}
                size="md"
                loading={loading}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.xl,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    ...TOKENS.shadows.large,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  title: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: TOKENS.spacing.xs,
  },
  description: {
    fontSize: TOKENS.typography.sizes.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.xl,
  },
  actionsRow: {
    width: '100%',
    gap: TOKENS.spacing.sm,
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default Dialog;
