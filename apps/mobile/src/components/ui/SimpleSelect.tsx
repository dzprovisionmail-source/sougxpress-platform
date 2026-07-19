import React, { useState } from "react";
import {
  View,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Typography } from "./Typography";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";

export interface SelectOption {
  value: string;
  label: string;
}

interface SimpleSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

export const SimpleSelect: React.FC<SimpleSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = "اختر...",
  error,
}) => {
  const [open, setOpen] = useState(false);
  const colors = getThemeColors(DEFAULT_THEME);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Typography
          variant="caption"
          style={[styles.fieldLabel, { color: colors.textSecondary }]}
        >
          {label}
        </Typography>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.bgSurface,
            borderColor: error
              ? colors.error
              : value
              ? colors.primary
              : colors.borderSubtle,
          },
        ]}
      >
        <Typography
          variant="body"
          style={[
            styles.triggerText,
            { color: selected ? colors.textPrimary : colors.textSecondary },
          ]}
        >
          {selected ? selected.label : placeholder}
        </Typography>
        <Typography
          variant="body"
          style={{ color: colors.textSecondary, fontSize: 12 }}
        >
          ▾
        </Typography>
      </TouchableOpacity>

      {!!error && (
        <Typography
          variant="caption"
          style={[styles.errorText, { color: colors.error }]}
        >
          {error}
        </Typography>
      )}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, { backgroundColor: colors.bgBase }]}>
            {/* Header */}
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.headerSide} />
              <Typography
                variant="body"
                style={[styles.sheetTitle, { color: colors.textPrimary }]}
              >
                {label ?? placeholder}
              </Typography>
              <TouchableOpacity
                style={styles.headerSide}
                onPress={() => setOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Typography
                  variant="body"
                  style={{ color: colors.primary, textAlign: "left" }}
                >
                  إلغاء
                </Typography>
              </TouchableOpacity>
            </View>

            {/* Options */}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.item,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected
                          ? `${colors.primary}18`
                          : "transparent",
                      },
                    ]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    activeOpacity={0.6}
                  >
                    {isSelected && (
                      <Typography
                        variant="body"
                        style={[styles.checkmark, { color: colors.primary }]}
                      >
                        ✓
                      </Typography>
                    )}
                    <Typography
                      variant="body"
                      style={[
                        styles.itemText,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {item.label}
                    </Typography>
                  </TouchableOpacity>
                );
              }}
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  fieldLabel: {
    textAlign: "right",
    marginBottom: TOKENS.spacing.xs,
    fontWeight: "600",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    minHeight: 48,
  },
  triggerText: {
    flex: 1,
    textAlign: "right",
    marginLeft: TOKENS.spacing.sm,
  },
  errorText: {
    textAlign: "right",
    marginTop: TOKENS.spacing.xs,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
    paddingBottom: TOKENS.spacing.xl,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.md,
    borderBottomWidth: 1,
  },
  headerSide: { width: 60 },
  sheetTitle: {
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: { flex: 1, textAlign: "right" },
  checkmark: { marginLeft: TOKENS.spacing.sm, fontWeight: "700" },
});
