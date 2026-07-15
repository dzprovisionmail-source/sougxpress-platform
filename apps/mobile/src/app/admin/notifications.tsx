import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";

type Audience = "all" | "customers" | "merchants" | "drivers";

const AUDIENCE_OPTIONS: Array<{ key: Audience; label: string }> = [
  { key: "all", label: "الجميع" },
  { key: "customers", label: "الزبائن" },
  { key: "merchants", label: "التجار" },
  { key: "drivers", label: "الموصلون" },
];

export default function AdminNotificationsScreen() {
  const { colors, tokens } = useAppTheme();
  const [audience, setAudience] = useState<Audience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <AdminPageShell title="الإشعارات" showBack>
      <View style={{ paddingTop: tokens.spacing.lg }}>
        {/* Audience selector */}
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>
          المستهدفون
        </Text>
        <View style={[styles.audienceRow, { marginBottom: tokens.spacing.lg }]}>
          {AUDIENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setAudience(opt.key)}
              style={[
                styles.audienceChip,
                {
                  backgroundColor: audience === opt.key ? colors.primary : colors.bgElevated,
                  borderColor: audience === opt.key ? colors.primary : colors.borderSubtle,
                  borderRadius: tokens.radius.full,
                  paddingHorizontal: tokens.spacing.md,
                  paddingVertical: tokens.spacing.xs,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: audience === opt.key ? "#000" : colors.textPrimary,
                    fontFamily: tokens.typography.families.arabic,
                    fontSize: tokens.typography.sizes.sm,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>
          عنوان الإشعار
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="أدخل عنوان الإشعار..."
          placeholderTextColor={colors.textDisabled}
          textAlign="right"
          style={[styles.input, {
            backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle,
            color: colors.textPrimary, fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base, borderRadius: tokens.radius.sm,
            padding: tokens.spacing.md, marginBottom: tokens.spacing.md,
          }]}
        />

        {/* Body */}
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>
          نص الإشعار
        </Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="أدخل نص الإشعار..."
          placeholderTextColor={colors.textDisabled}
          textAlign="right"
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textarea, {
            backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle,
            color: colors.textPrimary, fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base, borderRadius: tokens.radius.sm,
            padding: tokens.spacing.md, marginBottom: tokens.spacing.xl,
          }]}
        />

        {/* Disabled send — requires server-side push service */}
        <View
          style={[
            styles.disabledNote,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md,
              marginBottom: tokens.spacing.md,
            },
          ]}
        >
          <Text
            style={[
              styles.disabledText,
              {
                color: colors.textSecondary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
              },
            ]}
          >
            يتطلب إرسال الإشعارات ربط خدمة الإشعارات من الخادم
          </Text>
        </View>

        <TouchableOpacity
          disabled
          style={[
            styles.sendBtn,
            {
              backgroundColor: colors.textDisabled,
              borderRadius: tokens.radius.full,
              paddingVertical: tokens.spacing.md,
            },
          ]}
        >
          <Text
            style={[
              styles.sendBtnText,
              {
                color: colors.bgBase,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.base,
              },
            ]}
          >
            إرسال الإشعار
          </Text>
        </TouchableOpacity>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  label: { textAlign: "right", fontWeight: "500", marginBottom: 8 },
  audienceRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  audienceChip: { borderWidth: 1 },
  chipText: { fontWeight: "600" },
  input: { borderWidth: 1, writingDirection: "rtl" },
  textarea: { height: 100, textAlignVertical: "top" },
  disabledNote: { borderWidth: 1 },
  disabledText: { textAlign: "right", lineHeight: 22 },
  sendBtn: { alignItems: "center", justifyContent: "center" },
  sendBtnText: { fontWeight: "700" },
});
