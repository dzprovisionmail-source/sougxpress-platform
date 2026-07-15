import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { CircleUserRound, LogOut, Shield, Moon, Sun } from "lucide-react-native";
import { router } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";
import { supabase } from "@/lib/supabase";

interface AdminProfileData {
  id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
}

export default function AdminProfileScreen() {
  const { colors, tokens, theme, setTheme } = useAppTheme();
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .single();

    setProfile({
      id: user.id,
      role: (data as AdminProfileData | null)?.role ?? "admin",
      full_name: (data as AdminProfileData | null)?.full_name ?? null,
      email: user.email ?? null,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }, []);

  return (
    <AdminPageShell title="الملف الشخصي" showBack>
      <View style={{ paddingTop: tokens.spacing.xl }}>

        {/* Avatar + name */}
        <View style={[styles.avatarBlock, { marginBottom: tokens.spacing.xl }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <CircleUserRound color={colors.primary} size={40} />
            )}
          </View>
          {!loading && (
            <>
              <Text style={[styles.name, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.lg }]}>
                {profile?.full_name ?? "المدير"}
              </Text>
              {profile?.email ? (
                <Text style={[styles.email, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>
                  {profile.email}
                </Text>
              ) : null}
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + "22", borderRadius: tokens.radius.full, marginTop: tokens.spacing.sm }]}>
                <Shield color={colors.primary} size={14} />
                <Text style={[styles.roleText, { color: colors.primary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>
                  {profile?.role === "founder" ? "المؤسس" : "مدير المنصة"}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Theme switcher */}
        <View style={[styles.section, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md, padding: tokens.spacing.lg, marginBottom: tokens.spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base }]}>
            المظهر
          </Text>
          <View style={[styles.themeRow]}>
            {(["dark", "light", "ivory"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTheme(t)}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: theme === t ? colors.primary : colors.bgSurface,
                    borderColor: theme === t ? colors.primary : colors.borderSubtle,
                    borderRadius: tokens.radius.full,
                    paddingHorizontal: tokens.spacing.md,
                    paddingVertical: tokens.spacing.xs,
                  },
                ]}
              >
                <Text style={[styles.themeChipText, { color: theme === t ? "#000" : colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>
                  {t === "dark" ? "داكن" : t === "light" ? "فاتح" : "عاجي"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info rows */}
        <View style={[styles.section, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md, overflow: "hidden", marginBottom: tokens.spacing.xl }]}>
          <InfoRow label="الدور" value={profile?.role === "founder" ? "المؤسس" : "مدير"} colors={colors} tokens={tokens} />
          <View style={{ height: 1, backgroundColor: colors.borderSubtle }} />
          <InfoRow label="المعرّف" value={profile ? String(profile.id).slice(0, 16) + "…" : "—"} colors={colors} tokens={tokens} />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          style={[
            styles.signOutBtn,
            {
              backgroundColor: colors.error + "18",
              borderColor: colors.error,
              borderRadius: tokens.radius.full,
              paddingVertical: tokens.spacing.md,
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            },
          ]}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.error} size="small" />
          ) : (
            <LogOut color={colors.error} size={18} />
          )}
          <Text style={[styles.signOutText, { color: colors.error, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base }]}>
            تسجيل الخروج
          </Text>
        </TouchableOpacity>

      </View>
    </AdminPageShell>
  );
}

function InfoRow({
  label,
  value,
  colors,
  tokens,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <View style={[styles.infoRow, { paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.md, flexDirection: "row-reverse", justifyContent: "space-between" }]}>
      <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, textAlign: "right" }}>
        {label}
      </Text>
      <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, textAlign: "left" }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBlock: { alignItems: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { fontWeight: "700", textAlign: "center" },
  email: { textAlign: "center", marginTop: 4 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 0 },
  roleText: { fontWeight: "600" },
  section: { borderWidth: 1 },
  sectionTitle: { fontWeight: "700", textAlign: "right", marginBottom: 12 },
  themeRow: { flexDirection: "row-reverse", gap: 8 },
  themeChip: { borderWidth: 1 },
  themeChipText: { fontWeight: "600" },
  infoRow: {},
  signOutBtn: { borderWidth: 1 },
  signOutText: { fontWeight: "700" },
});
