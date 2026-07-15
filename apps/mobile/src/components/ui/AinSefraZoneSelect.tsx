import React, { useState, useMemo } from "react";
import {
  View,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  I18nManager,
  Platform,
} from "react-native";
import { Typography } from "./Typography";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";

interface Zone {
  id: string;
  name: string;
}

interface AinSefraZoneSelectProps {
  zones: Zone[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  error?: string;
}

export const AinSefraZoneSelect: React.FC<AinSefraZoneSelectProps> = ({
  zones,
  value,
  onChange,
  label = "الحي",
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const colors = getThemeColors(DEFAULT_THEME);

  const selectedZone = zones.find((z) => z.id === value);

  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? zones.filter((z) => z.name.includes(q)) : zones;
  }, [zones, query]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
  };

  const isRTL = I18nManager.isRTL || true; // always RTL for Arabic

  return (
    <View style={styles.wrapper}>
      {/* Field label */}
      <Typography
        variant="caption"
        style={[styles.fieldLabel, { color: colors.textSecondary }]}
      >
        {label}
      </Typography>

      {/* Trigger / closed state */}
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
            {
              color: selectedZone ? colors.textPrimary : colors.textSecondary,
            },
          ]}
        >
          {selectedZone ? selectedZone.name : "اختر الحي"}
        </Typography>
        <Typography
          variant="body"
          style={{ color: colors.textSecondary, fontSize: 12 }}
        >
          ▾
        </Typography>
      </TouchableOpacity>

      {/* Inline validation */}
      {!!error && (
        <Typography
          variant="caption"
          style={[styles.errorText, { color: colors.error }]}
        >
          {error}
        </Typography>
      )}

      {/* Modal sheet */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.bgBase },
            ]}
          >
            {/* Sheet header */}
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: colors.borderSubtle },
              ]}
            >
              {/* Spacer so title is centered */}
              <View style={styles.headerSide} />
              <Typography
                variant="body"
                style={[styles.sheetTitle, { color: colors.textPrimary }]}
              >
                {label}
              </Typography>
              <TouchableOpacity
                style={styles.headerSide}
                onPress={handleClose}
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

            {/* Search input */}
            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="بحث في الأحياء..."
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.searchInput,
                  { color: colors.textPrimary },
                ]}
                autoCorrect={false}
                returnKeyType="search"
                textAlign="right"
              />
            </View>

            {/* Zone list */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id || item.name}
              renderItem={({ item }) => {
                const selected = item.id === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.item,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: selected
                          ? `${colors.primary}18`
                          : "transparent",
                      },
                    ]}
                    onPress={() => handleSelect(item.id)}
                    activeOpacity={0.6}
                  >
                    {selected && (
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
                          color: selected
                            ? colors.primary
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {item.name}
                    </Typography>
                  </TouchableOpacity>
                );
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              ListEmptyComponent={
                <View style={styles.emptyRow}>
                  <Typography
                    variant="caption"
                    style={{ color: colors.textSecondary, textAlign: "center" }}
                  >
                    لا توجد نتائج
                  </Typography>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
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
  // Modal
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
    maxHeight: "78%",
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
  headerSide: {
    width: 60,
  },
  sheetTitle: {
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  searchRow: {
    marginHorizontal: TOKENS.spacing.lg,
    marginVertical: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: Platform.OS === "ios" ? TOKENS.spacing.sm : 2,
  },
  searchInput: {
    fontSize: TOKENS.typography.sizes.base,
    fontFamily: TOKENS.typography.families.arabic,
    writingDirection: "rtl",
    minHeight: 36,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    flex: 1,
    textAlign: "right",
  },
  checkmark: {
    marginLeft: TOKENS.spacing.sm,
    fontWeight: "700",
  },
  emptyRow: {
    padding: TOKENS.spacing.xl,
    alignItems: "center",
  },
});
