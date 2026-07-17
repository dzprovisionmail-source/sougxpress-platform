import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Card } from "@/components/ui";
import {
  Moon, Bell, Shield, Globe, HelpCircle,
  ChevronRight, ChevronLeft, Info,
} from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { I18nManager } from "react-native";

type SettingItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  type: "switch" | "link";
  value?: boolean | string;
  onValueChange?: (v: boolean) => void;
};

type SettingGroup = {
  title: string;
  items: SettingItem[];
};

export default function CustomerSettingsScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingsGroups: SettingGroup[] = [
    {
      title: "الإعدادات العامة",
      items: [
        {
          id: "appearance",
          title: "الوضع الداكن",
          subtitle: "تفعيل المظهر الداكن للتطبيق",
          icon: <Moon size={20} color={colors.primary} />,
          type: "switch",
          value: darkMode,
          onValueChange: setDarkMode,
        },
        {
          id: "language",
          title: "لغة التطبيق",
          subtitle: "اللغة المستخدمة في الواجهة",
          icon: <Globe size={20} color={colors.primary} />,
          type: "link",
          value: "العربية",
        },
      ],
    },
    {
      title: "الإشعارات والتنبيهات",
      items: [
        {
          id: "push_notifications",
          title: "إشعارات الطلبات",
          subtitle: "تلقّي تنبيهات عند تحديث حالة طلبك",
          icon: <Bell size={20} color={colors.primary} />,
          type: "switch",
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled,
        },
      ],
    },
    {
      title: "الخصوصية والأمان",
      items: [
        {
          id: "privacy",
          title: "سياسة الخصوصية",
          subtitle: "كيف نحمي بياناتك الشخصية",
          icon: <Shield size={20} color={colors.primary} />,
          type: "link",
        },
        {
          id: "help",
          title: "مركز المساعدة",
          subtitle: "الأسئلة الشائعة والتواصل مع الدعم",
          icon: <HelpCircle size={20} color={colors.primary} />,
          type: "link",
        },
      ],
    },
    {
      title: "حول التطبيق",
      items: [
        {
          id: "version",
          title: "إصدار التطبيق",
          subtitle: "سوق إكسبريس — عين صفراء",
          icon: <Info size={20} color={colors.primary} />,
          type: "link",
          value: "v1.0.0",
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          {isRTL
            ? <ChevronRight size={24} color={colors.textPrimary} />
            : <ChevronLeft  size={24} color={colors.textPrimary} />}
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>الإعدادات</Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.groupContainer}>
            <Typography
              variant="caption"
              color="secondary"
              style={[styles.groupTitle, { textAlign: isRTL ? "right" : "left" }]}
            >
              {group.title}
            </Typography>

            <Card style={styles.groupCard}>
              {group.items.map((item, itemIndex) => (
                <View key={item.id}>
                  <View style={[styles.settingItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <View style={[styles.iconWrapper, { backgroundColor: colors.bgElevated }]}>
                      {item.icon}
                    </View>

                    <View style={[styles.textBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                      <Typography variant="body" style={styles.settingTitle}>{item.title}</Typography>
                      {item.subtitle ? (
                        <Typography variant="caption" color="secondary">{item.subtitle}</Typography>
                      ) : null}
                    </View>

                    {item.type === "switch" ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onValueChange}
                        trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <View style={[styles.linkValue, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                        {item.value ? (
                          <Typography variant="caption" color="secondary" style={{ marginRight: 6 }}>
                            {item.value as string}
                          </Typography>
                        ) : null}
                        {isRTL
                          ? <ChevronLeft  size={18} color={colors.textDisabled} />
                          : <ChevronRight size={18} color={colors.textDisabled} />}
                      </View>
                    )}
                  </View>

                  {itemIndex < group.items.length - 1 && (
                    <View style={[styles.separator, isRTL ? { marginRight: 60 } : { marginLeft: 60 }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: { color: TOKENS.colors.brandPrimary, flex: 1, textAlign: "center" },
  backBtn: { padding: 4 },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.xl,
  },
  groupContainer: { gap: TOKENS.spacing.sm },
  groupTitle: { fontWeight: "600", paddingHorizontal: 4 },
  groupCard: { padding: 0, overflow: "hidden" },
  settingItem: {
    padding: TOKENS.spacing.md,
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  textBlock: { flex: 1, gap: 1 },
  settingTitle: { fontWeight: "500" },
  linkValue: { alignItems: "center" },
  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});
