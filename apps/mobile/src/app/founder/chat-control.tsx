import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { MessageSquare, Shield, ChevronLeft, X, Filter, Headphones } from "lucide-react-native";
import { SearchBar } from "@/components/ui";
import {
  AdminPageShell,
  AdminStatCard,
  AdminLoadingState,
  AdminEmptyState,
  AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getUserDisplayName } from "@/utils/user-display";
import { useRouter } from "expo-router";
import {
  getFounderConversations,
  getFounderConversationMessages,
  subscribeToFounderSupportConversations,
} from "@/services/founder-chat.service";
import type { Conversation, Message } from "@/services/chat.service";

type RelationshipFilter = "all" | "customer_merchant" | "customer_courier" | "merchant_courier";

const RELATIONSHIP_LABELS: Record<string, string> = {
  customer_merchant: "زبون ↔ تاجر",
  customer_courier: "زبون ↔ موصل",
  merchant_courier: "تاجر ↔ موصل",
};

export default function FounderChatControlScreen() {
  const { colors, tokens } = useAppTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipFilter>("all");
  const [conversationMode, setConversationMode] = useState<"commercial" | "support">("commercial");
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  // Selected conversation detail
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const loadConversations = useCallback(
    async (rel?: RelationshipFilter, refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const effectiveRel = rel === "all" ? undefined : rel;
        const data = await getFounderConversations(search, conversationMode === "support" ? undefined : effectiveRel, conversationMode);
        setConversations(data);
      } catch (err) {
        console.error("Founder Chat load error:", err);
        setError("تعذّر تحميل المحادثات");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, conversationMode]
  );

  useEffect(() => {
    loadConversations(conversationMode === "support" ? "all" : relationshipFilter);
  }, [loadConversations, relationshipFilter, conversationMode]);

  useEffect(() => {
    if (conversationMode !== "support") return;
    const cleanup = subscribeToFounderSupportConversations(() => {
      void loadConversations("all", true);
    });
    return cleanup;
  }, [conversationMode, loadConversations]);

  const openConversationDetail = async (conv: Conversation) => {
    setSelectedConv(conv);
    setShowDetail(true);
    setLoadingMessages(true);
    try {
      const msgs = await getFounderConversationMessages(conv.id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const otherName = c.other_participant?.full_name?.toLowerCase() ?? "";
    const storeName = c.other_participant?.store_name?.toLowerCase() ?? "";
    const lastMsg = c.last_message?.content?.toLowerCase() ?? "";
    return otherName.includes(q) || storeName.includes(q) || lastMsg.includes(q);
  });

  if (loading && !refreshing && !showDetail) {
    return (
      <AdminPageShell showLogout title="مراقبة المحادثات" showBack>
        <AdminLoadingState message="جاري تحميل سجل المحادثات..." />
      </AdminPageShell>
    );
  }

  if (error && !conversations.length) {
    return (
      <AdminPageShell showLogout title="مراقبة المحادثات" showBack>
        <AdminErrorState message={error} onRetry={() => loadConversations(relationshipFilter)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="مراقبة المحادثات" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row-reverse", gap: 8, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }}>
          <TouchableOpacity onPress={() => setConversationMode("commercial")} style={[styles.modeTab, { borderColor: conversationMode === "commercial" ? colors.primary : colors.borderSubtle, backgroundColor: conversationMode === "commercial" ? colors.primary + "18" : "transparent" }]}>
            <MessageSquare size={16} color={conversationMode === "commercial" ? colors.primary : colors.textSecondary} />
            <Text style={{ color: conversationMode === "commercial" ? colors.primary : colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>المحادثات التجارية</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConversationMode("support")} style={[styles.modeTab, { borderColor: conversationMode === "support" ? colors.primary : colors.borderSubtle, backgroundColor: conversationMode === "support" ? colors.primary + "18" : "transparent" }]}>
            <Headphones size={16} color={conversationMode === "support" ? colors.primary : colors.textSecondary} />
            <Text style={{ color: conversationMode === "support" ? colors.primary : colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>محادثات الدعم</Text>
          </TouchableOpacity>
        </View>
        {/* Search & Filters */}
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="بحث باسم المشارك أو المتجر..."
            onSubmitEditing={() => loadConversations(relationshipFilter)}
            onClear={() => setSearch("")}
            onFilterPress={() => setShowFilters(conversationMode === "commercial")}
            style={{ flex: 1 }}
          />
        </View>

        {/* Stats Summary */}
        <View style={{ paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.sm }}>
          <AdminStatCard label="إجمالي المحادثات المتاحة" value={filteredConversations.length} accent={colors.primary} />
        </View>

        {/* Conversations List */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConversations(relationshipFilter, true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={<AdminEmptyState message="لا توجد محادثات نشطة أو متاحة للقراءة" />}
          renderItem={({ item }) => {
            const relLabel = conversationMode === "support" ? "دعم Soug-XPRESS" : RELATIONSHIP_LABELS[item.relationship_type ?? ""] ?? item.relationship_type ?? "علاقة تجارية";
            const other = item.other_participant;
            return (
              <TouchableOpacity onPress={() => openConversationDetail(item)} activeOpacity={0.8}>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: colors.borderSubtle,
                      borderRadius: tokens.radius.md,
                      padding: tokens.spacing.md,
                      marginBottom: tokens.spacing.sm,
                    },
                  ]}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.cardInfo}>
                      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontSize: tokens.typography.sizes.base,
                            fontWeight: "700",
                            textAlign: "right",
                            fontFamily: tokens.typography.families.arabic,
                          }}
                          numberOfLines={1}
                        >
                          {conversationMode === "support"
                            ? getUserDisplayName(other, "support")
                            : (other?.store_name || getUserDisplayName(other, other?.role))}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
                          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700", fontFamily: tokens.typography.families.arabic }}>
                            {relLabel}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: tokens.typography.sizes.xs,
                          textAlign: "right",
                          fontFamily: tokens.typography.families.arabic,
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        آخر رسالة: {item.last_message?.content || "لا توجد رسائل"}
                      </Text>
                      <Text
                        style={{
                          color: colors.textDisabled,
                          fontSize: 10,
                          textAlign: "right",
                          marginTop: 2,
                        }}
                      >
                        {new Date(item.last_message_at || item.created_at).toLocaleString("ar-DZ")}
                      </Text>
                    </View>
                    <ChevronLeft size={16} color={colors.textDisabled} style={{ alignSelf: "center", marginRight: 8 }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
              تصفية حسب نوع العلاقة
            </Text>
            {(
              [
                { value: "all", label: "الكل" },
                { value: "customer_merchant", label: "زبون ↔ تاجر" },
                { value: "customer_courier", label: "زبون ↔ موصل" },
                { value: "merchant_courier", label: "تاجر ↔ موصل" },
              ] as Array<{ value: RelationshipFilter; label: string }>
            ).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setRelationshipFilter(opt.value);
                  setShowFilters(false);
                }}
                style={[
                  styles.filterOpt,
                  {
                    borderColor: relationshipFilter === opt.value ? colors.primary : colors.borderSubtle,
                    backgroundColor: relationshipFilter === opt.value ? colors.primary + "18" : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: relationshipFilter === opt.value ? colors.primary : colors.textPrimary,
                    textAlign: "right",
                    fontWeight: "600",
                    fontFamily: tokens.typography.families.arabic,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilters(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Messages Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedConv && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", flex: 1, fontFamily: tokens.typography.families.arabic }}>
                    سجل محادثة: {selectedConv.other_participant?.store_name || getUserDisplayName(selectedConv.other_participant, selectedConv.other_participant?.role)}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 8, fontFamily: tokens.typography.families.arabic }}>
                    نوع العلاقة: {RELATIONSHIP_LABELS[selectedConv.relationship_type] ?? selectedConv.relationship_type}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 12, fontFamily: tokens.typography.families.arabic }}>
                    المرجع المرتبط: {selectedConv.reference_id || "غير متوفر"}
                  </Text>
                </View>

                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right", marginVertical: 8, fontFamily: tokens.typography.families.arabic }}>
                  الرسائل ({messages.length})
                </Text>

                {loadingMessages ? (
                  <Text style={{ color: colors.textSecondary, textAlign: "center", marginVertical: 20 }}>جاري تحميل الرسائل...</Text>
                ) : messages.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, textAlign: "center", marginVertical: 20 }}>لا توجد رسائل مسجلة</Text>
                ) : (
                  messages.map((m) => (
                    <View
                      key={m.id}
                      style={[
                        styles.msgBubble,
                        {
                          backgroundColor: colors.bgElevated,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>
                        {m.content}
                      </Text>
                      <Text style={{ color: colors.textDisabled, fontSize: 10, textAlign: "left", marginTop: 4 }}>
                        {new Date(m.created_at).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  ))
                )}

                {selectedConv.conversation_type === "support" && (
                  <TouchableOpacity
                    onPress={() => { setShowDetail(false); router.push({ pathname: "/chat/[id]", params: { id: selectedConv.id, support: "1" } }); }}
                    style={[styles.closeBtn, { backgroundColor: colors.primary, borderRadius: tokens.radius.md, marginBottom: 8 }]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center", fontFamily: tokens.typography.families.arabic }}>فتح محادثة الدعم والرد</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowDetail(false)}
                  style={[styles.closeBtn, { backgroundColor: colors.primary, borderRadius: tokens.radius.md }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center", fontFamily: tokens.typography.families.arabic }}>إغلاق</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  topBar: { marginBottom: 8 },
  modeTab: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 6 },
  card: { borderWidth: 1 },
  cardRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  cardInfo: { flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  filterOpt: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  detailScroll: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
  infoCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  msgBubble: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  closeBtn: { padding: 14, marginTop: 16, marginBottom: 30 },
});
