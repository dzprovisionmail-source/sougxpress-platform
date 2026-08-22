import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import {
  Users,
  Store,
  MessageSquare,
  Truck,
  ShoppingBag,
  ClipboardList,
  CheckCircle,
  DollarSign,
  FileText,
  Settings,
  ScrollText,
  Plus,
  UserPlus,
  TrendingUp,
  Activity,
  Megaphone,
  Eye,
  ChevronLeft,
  AlertTriangle,
  Search,
  X,
} from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { AdminPageShell, AdminStatCard, AdminErrorState, SearchBar } from "@/components/admin";
import {
  getControlCenterStats,
  subscribeToFounderStats,
  logFounderDashboardAccess,
  type ControlCenterStats,
} from "@/services/founder.service";
import {
  executeGlobalSearch,
  getOperationalAlerts,
  type GlobalSearchResult,
  type OperationalAlert,
} from "@/services/founder-command.service";

// ─── Founder visual foundation ────────────────────────────────────────────────

function FounderHero() {
  const { colors, tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
        },
      ]}
    >
      <View style={[styles.heroAccent, { backgroundColor: colors.primary }]} />
      <View style={styles.heroRow}>
        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary + "44",
            },
          ]}
        >
          <TrendingUp size={22} color={colors.primary} />
        </View>
        <View style={styles.heroCopy}>
          <Text
            style={{
              color: colors.primary,
              fontSize: tokens.typography.sizes.xs,
              fontWeight: "700",
              textAlign: "right",
              letterSpacing: 0.4,
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            SOUG-XPRESS · FOUNDER COMMAND CENTER
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.sizes.lg,
              fontWeight: "800",
              textAlign: "right",
              marginTop: 4,
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            مركز قيادة المنصة الموحد
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.sizes.sm,
              lineHeight: 20,
              textAlign: "right",
              marginTop: 3,
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            رؤية موحّدة وشاملة للعمليات الحية في Soug-XPRESS (قراءة فقط)
          </Text>
          <View style={styles.heroLiveRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text
              style={{
                color: colors.success,
                fontSize: tokens.typography.sizes.xs,
                fontWeight: "700",
                fontFamily: tokens.typography.families.arabic,
              }}
            >
              مزامنة مباشرة مع قاعدة بيانات المنصة
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={{ marginTop: tokens.spacing.xl, paddingHorizontal: tokens.spacing.lg }}>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: tokens.typography.sizes.base,
          fontWeight: "700",
          textAlign: "right",
          marginBottom: tokens.spacing.sm,
          fontFamily: tokens.typography.families.arabic,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function StatsRow({ children }: { children: React.ReactNode }) {
  const { tokens } = useAppTheme();
  return (
    <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
      {children}
    </View>
  );
}

function NavTile({
  label,
  icon,
  onPress,
  colors,
  tokens,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.navTile,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
          width: "31%",
          marginBottom: tokens.spacing.sm,
          alignItems: "center",
          borderWidth: 1,
        },
      ]}
    >
      <View
        style={[
          styles.navTileIcon,
          {
            backgroundColor: colors.primary + "18",
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {icon}
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: tokens.typography.sizes.xs,
          fontWeight: "600",
          textAlign: "center",
          marginTop: 6,
          fontFamily: tokens.typography.families.arabic,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
  accentColor,
  colors,
  tokens,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  accentColor: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.quickAction,
        {
          backgroundColor: colors.bgElevated,
          borderColor: accentColor + "33",
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: accentColor + "18" }]}>
        {icon}
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: tokens.typography.sizes.sm,
          fontWeight: "600",
          textAlign: "right",
          flex: 1,
          fontFamily: tokens.typography.families.arabic,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FounderControlCenterScreen() {
  const { colors, tokens } = useAppTheme();
  const [stats, setStats] = useState<ControlCenterStats | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [statsData, alertsData] = await Promise.all([
        getControlCenterStats(),
        getOperationalAlerts(),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error("Founder Command Center load error:", err);
      setError("تعذّر تحميل البيانات الحية");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    logFounderDashboardAccess();
    const subscription = subscribeToFounderStats(() => load(true));
    return () => {
      subscription.unsubscribe();
    };
  }, [load]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await executeGlobalSearch(text);
      setSearchResults(res);
      setShowSearchModal(true);
    } catch (err) {
      console.error("Search execution error:", err);
    } finally {
      setSearching(false);
    }
  };

  const fmt = (minor: number | null | undefined) => {
    if (minor === null || minor === undefined) return "غير متوفر";
    return `${(minor / 100).toLocaleString("ar-DZ")} د.ج`;
  };

  const fmtCount = (value: number | null | undefined) => (value === null || value === undefined ? "غير متوفر" : String(value));

  const primary = colors.primary;
  const blue = colors.secondary;
  const success = colors.success;
  const warning = colors.warning;
  const errorColor = colors.error;
  const info = colors.info;

  if (loading && !stats) {
    return (
      <AdminPageShell showLogout title="مركز القيادة" showProfile showNotification={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: tokens.spacing.xl }}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={{ color: colors.textSecondary, marginTop: tokens.spacing.md, fontFamily: tokens.typography.families.arabic }}>
            جاري تحميل مركز القيادة الموحد...
          </Text>
        </View>
      </AdminPageShell>
    );
  }

  if (error && !stats) {
    return (
      <AdminPageShell showLogout title="مركز القيادة" showProfile showNotification={false}>
        <AdminErrorState message={error} onRetry={() => load()} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="مركز القيادة" showProfile showNotification={false} scrollable={false}>
      <ScrollView
        contentContainerStyle={{
          paddingVertical: tokens.spacing.lg,
          paddingBottom: tokens.spacing["3xl"],
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <FounderHero />

        {/* ── Global Search Bar ────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.md }}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="بحث عالمي في الطلبات، المتاجر، الزبائن، والموصلين..."
            onClear={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
          />
        </View>

        {/* ── Operational Alerts ────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <SectionBlock title="يحتاج إلى انتباه المؤسس">
            {alerts.map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: alert.severity === "error" ? errorColor + "44" : warning + "44",
                    borderRadius: tokens.radius.md,
                    padding: tokens.spacing.md,
                    marginBottom: tokens.spacing.sm,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={20} color={alert.severity === "error" ? errorColor : warning} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: tokens.typography.sizes.sm,
                        fontWeight: "700",
                        textAlign: "right",
                        fontFamily: tokens.typography.families.arabic,
                      }}
                    >
                      {alert.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: tokens.typography.sizes.xs,
                        textAlign: "right",
                        fontFamily: tokens.typography.families.arabic,
                        marginTop: 2,
                      }}
                    >
                      {alert.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* ── Commercial Overview ──────────────────────────────────────── */}
        <SectionBlock title="الملخص التجاري">
          <StatsRow>
            <AdminStatCard label="إجمالي الطلبات" value={fmtCount(stats?.totalOrders)} accent={primary} onPress={() => router.push("/founder/orders" as never)} />
            <AdminStatCard label="الطلبات النشطة" value={fmtCount(stats?.activeOrders)} accent={warning} onPress={() => router.push("/founder/orders" as never)} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="الطلبات المكتملة" value={fmtCount(stats?.completedOrders)} accent={success} onPress={() => router.push("/founder/orders" as never)} />
            <AdminStatCard label="الطلبات الملغاة" value={fmtCount(stats?.cancelledOrders)} accent={errorColor} onPress={() => router.push("/founder/orders" as never)} />
          </StatsRow>
        </SectionBlock>

        {/* ── Delivery Overview ────────────────────────────────────────── */}
        <SectionBlock title="إدارة التوصيل">
          <StatsRow>
            <AdminStatCard label="توصيلات منجزة" value={fmtCount(stats?.totalCompletedDeliveries)} accent={blue} onPress={() => router.push("/founder/deliveries" as never)} />
            <AdminStatCard label="الموصلون النشطون" value={fmtCount(stats?.totalDrivers)} accent={success} onPress={() => router.push("/founder/couriers-control" as never)} />
          </StatsRow>
        </SectionBlock>

        {/* ── People Overview ──────────────────────────────────────────── */}
        <SectionBlock title="الأطراف التجارية">
          <StatsRow>
            <AdminStatCard label="الزبائن" value={fmtCount(stats?.totalCustomers)} accent={blue} onPress={() => router.push("/founder/customers-control" as never)} />
            <AdminStatCard label="التجار" value={fmtCount(stats?.totalMerchants)} accent={primary} onPress={() => router.push("/founder/merchants-control" as never)} />
          </StatsRow>
          <StatsRow>
            <AdminStatCard label="الموصلون" value={fmtCount(stats?.totalDrivers)} accent={success} onPress={() => router.push("/founder/couriers-control" as never)} />
            <AdminStatCard label="المتاجر النشطة" value={fmtCount(stats?.activeStores)} accent={info} onPress={() => router.push("/founder/stores" as never)} />
          </StatsRow>
        </SectionBlock>

        {/* ── Financial Snapshot ───────────────────────────────────────── */}
        <SectionBlock title="المؤشرات المالية (قراءة حية)">
          <View
            style={[
              styles.financeCard,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderSubtle,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.lg,
              },
            ]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
              إجمالي المبيعات (GMV)
            </Text>
            <Text style={{ color: primary, fontSize: 22, fontWeight: "700", textAlign: "right", marginTop: 4, fontFamily: tokens.typography.families.arabic }}>
              {fmt(stats?.totalGMVMinor)}
            </Text>
          </View>
          <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>عمولة المنصة</Text>
              <Text style={{ color: success, fontSize: 15, fontWeight: "700", textAlign: "right", marginTop: 2, fontFamily: tokens.typography.families.arabic }}>{fmt(stats?.platformCommissionMinor)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>أجور التوصيل</Text>
              <Text style={{ color: info, fontSize: 15, fontWeight: "700", textAlign: "right", marginTop: 2, fontFamily: tokens.typography.families.arabic }}>{fmt(stats?.deliveryFeesMinor)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>مستحق الموصلين</Text>
              <Text style={{ color: warning, fontSize: 15, fontWeight: "700", textAlign: "right", marginTop: 2, fontFamily: tokens.typography.families.arabic }}>{fmt(stats?.driverCommissionsOwedMinor)}</Text>
            </View>
          </View>
        </SectionBlock>

        {/* ── Quick Actions ────────────────────────────────────────────── */}
        <SectionBlock title="الإجراءات السريعة">
          <View style={styles.quickActionsGrid}>
            <QuickAction label="مركز الموافقات" icon={<CheckCircle size={18} color={warning} />} accentColor={warning} onPress={() => router.push("/founder/approvals" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إدارة الطلبات" icon={<ClipboardList size={18} color={primary} />} accentColor={primary} onPress={() => router.push("/founder/orders" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إدارة التوصيلات" icon={<Truck size={18} color={success} />} accentColor={success} onPress={() => router.push("/founder/deliveries" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="مراقبة المحادثات" icon={<MessageSquare size={18} color={info} />} accentColor={info} onPress={() => router.push("/founder/chat-control" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="نشاط المنصة" icon={<Activity size={18} color={blue} />} accentColor={blue} onPress={() => router.push("/founder/activity-control" as never)} colors={colors} tokens={tokens} />
            <QuickAction label="إدارة المشاهدات" icon={<Eye size={18} color={primary} />} accentColor={primary} onPress={() => router.push("/founder/views-management" as never)} colors={colors} tokens={tokens} />
          </View>
        </SectionBlock>

        {/* ── Module Navigation ────────────────────────────────────────── */}
        <SectionBlock title="الوحدات والتحكم">
          <View style={styles.navGrid}>
            <NavTile label="المستخدمون" icon={<Users size={20} color={primary} />} onPress={() => router.push("/founder/users" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المتاجر" icon={<Store size={20} color={primary} />} onPress={() => router.push("/founder/stores" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الطلبات" icon={<ClipboardList size={20} color={primary} />} onPress={() => router.push("/founder/orders" as never)} colors={colors} tokens={tokens} />
            <NavTile label="التوصيلات" icon={<Truck size={20} color={primary} />} onPress={() => router.push("/founder/deliveries" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المحادثات" icon={<MessageSquare size={20} color={primary} />} onPress={() => router.push("/founder/chat-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="النشاط" icon={<Activity size={20} color={primary} />} onPress={() => router.push("/founder/activity-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="إدارة المشاهدات" icon={<Eye size={20} color={primary} />} onPress={() => router.push("/founder/views-management" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الزبائن" icon={<Users size={20} color={primary} />} onPress={() => router.push("/founder/customers-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="التجار" icon={<Store size={20} color={primary} />} onPress={() => router.push("/founder/merchants-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الموصلون" icon={<Truck size={20} color={primary} />} onPress={() => router.push("/founder/couriers-control" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المالية" icon={<DollarSign size={20} color={primary} />} onPress={() => router.push("/founder/finance" as never)} colors={colors} tokens={tokens} />
            <NavTile label="المحتوى" icon={<FileText size={20} color={primary} />} onPress={() => router.push("/founder/content" as never)} colors={colors} tokens={tokens} />
            <NavTile label="الإعدادات" icon={<Settings size={20} color={primary} />} onPress={() => router.push("/founder/settings" as never)} colors={colors} tokens={tokens} />
          </View>
        </SectionBlock>
      </ScrollView>

      {/* ── Global Search Results Modal ─────────────────────────────────── */}
      <Modal visible={showSearchModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.searchModalContainer, { backgroundColor: colors.bgSurface }]}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>
                نتائج البحث العالمي ({searchResults.length})
              </Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {searching ? (
              <ActivityIndicator size="small" color={primary} style={{ marginVertical: 20 }} />
            ) : searchResults.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: "center", marginVertical: 30, fontFamily: tokens.typography.families.arabic }}>
                لا توجد نتائج مطابقة للبحث
              </Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setShowSearchModal(false);
                      router.push(item.route as never);
                    }}
                    style={[
                      styles.searchResultItem,
                      {
                        backgroundColor: colors.bgElevated,
                        borderColor: colors.borderSubtle,
                        borderRadius: tokens.radius.md,
                        padding: tokens.spacing.md,
                        marginBottom: tokens.spacing.sm,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                        {item.title}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: primary + "18", borderColor: primary + "44" }]}>
                        <Text style={{ color: primary, fontSize: 10, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>
                          {item.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginTop: 4, fontFamily: tokens.typography.families.arabic }}>
                      {item.subtitle}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              onPress={() => setShowSearchModal(false)}
              style={[styles.closeModalBtn, { backgroundColor: primary, borderRadius: tokens.radius.md }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center", fontFamily: tokens.typography.families.arabic }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 16, position: "relative", overflow: "hidden", borderWidth: 1 },
  heroAccent: { position: "absolute", top: 0, right: 0, left: 0, height: 4 },
  heroRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroLiveRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  alertCard: { borderWidth: 1 },
  financeCard: { borderWidth: 1 },
  quickActionsGrid: { gap: TOKENS.spacing.sm },
  quickAction: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  quickActionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  navGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between" },
  navTile: {},
  navTileIcon: {},
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  searchModalContainer: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingBottom: 40 },
  searchResultItem: { borderWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  closeModalBtn: { padding: 14, marginTop: 16 },
});
