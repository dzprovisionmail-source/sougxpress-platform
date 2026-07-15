import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

interface AdminLoadingStateProps {
  message?: string;
}

interface AdminEmptyProps {
  message?: string;
}

interface AdminErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Loading spinner with Arabic message.
 */
export const AdminLoadingState: React.FC<AdminLoadingStateProps> = ({
  message = "جاري التحميل...",
}) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={[
          styles.msg,
          {
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};

/**
 * Empty-state placeholder with Arabic message.
 */
export const AdminEmptyState: React.FC<AdminEmptyProps> = ({
  message = "لا توجد بيانات متاحة حالياً",
}) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={styles.centered}>
      <Text
        style={[
          styles.emoji,
        ]}
      >
        📭
      </Text>
      <Text
        style={[
          styles.msg,
          {
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};

/**
 * Error state with optional retry button.
 */
export const AdminErrorState: React.FC<AdminErrorStateProps> = ({
  message = "حدث خطأ أثناء تحميل البيانات",
  onRetry,
}) => {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={styles.centered}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text
        style={[
          styles.msg,
          {
            color: colors.error,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
          },
        ]}
      >
        {message}
      </Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          style={[
            styles.retryBtn,
            { backgroundColor: colors.primary, borderRadius: tokens.radius.full },
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.retryText,
              {
                color: colors.textOnBrand ?? "#000",
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.base,
              },
            ]}
          >
            إعادة المحاولة
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
    textAlign: "center",
  },
  msg: {
    textAlign: "center",
    marginTop: 12,
    lineHeight: 26,
  },
  retryBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryText: {
    fontWeight: "700",
  },
});
