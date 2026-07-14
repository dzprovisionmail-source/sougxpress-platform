import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Card,
} from "../../components/ui";
import { Settings, ChevronRight, ChevronLeft, Moon, Bell, Shield, Globe, HelpCircle } from "lucide-react-native";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";
import { I18nManager } from "react-native";

export default function CustomerSettingsScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingsGroups = [
    {
      title: "عام",
      items: [
        {
          id: "appearance",
          title: "المظهر الداكن",
          icon: <Moon size={20} color={colors.primary} />,
          type: "switch",
          value: darkMode,
          onValueChange: setDarkMode,
        },
        {
          id: "language",
          title: "اللغة",
          icon: <Globe size={20} color={colors.primary} />,
          type: "link",
          value: "العربية",
        },
      ]
    },
    {
      title: "التنبيهات",
      items: [
        {
          id: "push_notifications",
          title: "تنبيهات التطبيق",
          icon: <Bell size={20} color={colors.primary} />,
          type: "switch",
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled,
        },
      ]
    },
    {
      title: "الأمان والخصوصية",
      items: [
        {
          id: "privacy",
          title: "سياسة الخصوصية",
          icon: <Shield size={20} color={colors.primary} />,
          type: "link",
        },
        {
          id: "help",
          title: "مركز المساعدة",
          icon: <HelpCircle size={20} color={colors.primary} />,
          type: "link",
        },
      ]
    }
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          {isRTL ? <ChevronRight size={24} color={colors.textPrimary} /> : <ChevronLeft size={24} color={colors.textPrimary} />}
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>الإعدادات</Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.groupContainer}>
            <Typography variant="caption" color="secondary" style={[styles.groupTitle, { textAlign: isRTL ? "right" : "left" }]}>
              {group.title}
            </Typography>
            <Card style={styles.groupCard}>
              {group.items.map((item, itemIndex) => (
                <View key={item.id}>
                  <View style={[styles.settingItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <View style={[styles.iconWrapper, { backgroundColor: colors.bgElevated }]}>
                      {item.icon}
                    </View>
                    <Typography variant="body" style={styles.settingTitle}>{item.title}</Typography>
                    
                    {item.type === "switch" ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onValueChange}
                        trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                        thumbColor={colors.white}
                      />
                    ) : (
                      <View style={[styles.linkValue, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                        {item.value && <Typography variant="caption" color="secondary" style={{ marginRight: 8 }}>{item.value as string}</Typography>}
                        {isRTL ? <ChevronLeft size={18} color={colors.textDisabled} /> : <ChevronRight size={18} color={colors.textDisabled} />}
                      </View>
                    )}
                  </View>
                  {itemIndex < group.items.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </Card>
          </View>
        ))}
        
        <View style={styles.footer}>
          <Typography variant="caption" color="disabled" align="center">
            SougXpress v1.0.0
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
    flex: 1,
    textAlign: "center",
  },
  backBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.xl,
  },
  groupContainer: {
    gap: TOKENS.spacing.sm,
  },
  groupTitle: {
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  groupCard: {
    padding: 0,
    overflow: "hidden",
  },
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
  settingTitle: {
    flex: 1,
    fontWeight: "500",
  },
  linkValue: {
    alignItems: "center",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginLeft: 60,
  },
  footer: {
    marginTop: TOKENS.spacing.xl,
    paddingBottom: TOKENS.spacing.xl,
  },
});
