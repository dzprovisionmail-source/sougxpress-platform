/**
 * Shared money-request screen used by customer, merchant, and driver workspaces.
 * Shows a submission form and the user's own request history.
 * All UI is Arabic RTL and theme-driven via useAppTheme().
 */
import React, { useState } from "react";
import {
  ScrollView,
  RefreshControl,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Wallet, Clock, CheckCircle, XCircle } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { useMyMoneyRequests } from "@/hooks/useMoneyRequests";
import { MoneyRequestStatus } from "@/types/schema-03b-addendum";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceText,
  WorkspaceButton,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<MoneyRequestStatus, string> = {
  pending: "قيد المراجعة",
  approved: "موافق عليه",
  rejected: "مرفوض",
};

function StatusIcon({ status, color }: { status: MoneyRequestStatus; color: string }) {
  if (status === "approved") return <CheckCircle size={16} color={color} />;
  if (status === "rejected") return <XCircle size={16} color={color} />;
  return <Clock size={16} color={color} />;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MoneyRequestScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { requests, loading, refresh, submit } = useMyMoneyRequests(userId ?? "");

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح أكبر من الصفر.");
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert("خطأ", "يرجى كتابة سبب الطلب (3 أحرف على الأقل).");
      return;
    }
    try {
      setSubmitting(true);
      await submit(parsed, reason.trim());
      setAmount("");
      setReason("");
      Alert.alert("تم الإرسال", "تم إرسال طلبك بنجاح. سيتم مراجعته قريباً.");
    } catch (err: any) {
      Alert.alert("خطأ", err?.message ?? "حدث خطأ أثناء إرسال الطلب.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.bgBase,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    color: colors.textPrimary,
    fontFamily: tokens.typography.families.arabic,
    fontSize: tokens.typography.sizes.base,
    textAlign: "right" as const,
  };

  if (loading && requests.length === 0) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل طلباتك..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            padding: tokens.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
            backgroundColor: colors.bgElevated,
          }}
        >
          <WorkspaceText variant="title">طلب مالي</WorkspaceText>
          <ChevronRight
            color={colors.textPrimary}
            size={24}
            onPress={() => router.back()}
          />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingTop: tokens.spacing.xl,
            paddingBottom: tokens.spacing["3xl"],
          }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── Submission form ── */}
          <SectionCard>
            <SectionTitle
              icon={<Wallet color={colors.primary} size={tokens.spacing.lg} />}
            >
              تقديم طلب جديد
            </SectionTitle>

            <WorkspaceText color="secondary" variant="caption" style={{ marginBottom: tokens.spacing.sm }}>
              المبلغ (د.ج)
            </WorkspaceText>
            <TextInput
              style={[inputStyle, { marginBottom: tokens.spacing.md }]}
              placeholder="مثال: 5000"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <WorkspaceText color="secondary" variant="caption" style={{ marginBottom: tokens.spacing.sm }}>
              سبب الطلب
            </WorkspaceText>
            <TextInput
              style={[inputStyle, { minHeight: 80, textAlignVertical: "top", marginBottom: tokens.spacing.lg }]}
              placeholder="اشرح سبب طلبك بإيجاز..."
              placeholderTextColor={colors.textDisabled}
              multiline
              value={reason}
              onChangeText={setReason}
            />

            <WorkspaceButton
              title="إرسال الطلب"
              onPress={handleSubmit}
              isLoading={submitting}
              disabled={submitting}
            />
          </SectionCard>

          {/* ── History ── */}
          <SectionCard>
            <SectionTitle>سجل الطلبات</SectionTitle>

            {requests.length === 0 ? (
              <EmptyState message="لا توجد طلبات سابقة." />
            ) : (
              requests.map((req, index) => {
                const isLast = index === requests.length - 1;
                const statusColor =
                  req.status === "approved"
                    ? colors.success
                    : req.status === "rejected"
                    ? colors.error
                    : colors.warning;

                return (
                  <View
                    key={req.id}
                    style={{
                      paddingVertical: tokens.spacing.md,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: colors.borderSubtle,
                    }}
                  >
                    {/* Amount + status row */}
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: tokens.spacing.xs,
                      }}
                    >
                      <WorkspaceText variant="title">
                        {Number(req.amount).toLocaleString("ar-DZ")} د.ج
                      </WorkspaceText>
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          gap: tokens.spacing.xs,
                          backgroundColor: statusColor + "22",
                          borderRadius: tokens.radius.sm,
                          paddingHorizontal: tokens.spacing.sm,
                          paddingVertical: tokens.spacing.xs,
                        }}
                      >
                        <StatusIcon status={req.status} color={statusColor} />
                        <WorkspaceText
                          variant="caption"
                          style={{ color: statusColor, marginRight: tokens.spacing.xs }}
                        >
                          {STATUS_LABEL[req.status]}
                        </WorkspaceText>
                      </View>
                    </View>

                    {/* Reason */}
                    <WorkspaceText color="secondary" variant="caption">
                      {req.reason}
                    </WorkspaceText>

                    {/* Date */}
                    <WorkspaceText
                      color="disabled"
                      variant="caption"
                      style={{ marginTop: tokens.spacing.xs }}
                    >
                      {new Date(req.created_at).toLocaleString("ar-DZ")}
                    </WorkspaceText>

                    {/* Reviewed at (if done) */}
                    {req.reviewed_at && (
                      <WorkspaceText
                        color="disabled"
                        variant="caption"
                        style={{ marginTop: 2 }}
                      >
                        {`تمت المراجعة: ${new Date(req.reviewed_at).toLocaleString("ar-DZ")}`}
                      </WorkspaceText>
                    )}
                  </View>
                );
              })
            )}
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </WorkspaceScreen>
  );
}
