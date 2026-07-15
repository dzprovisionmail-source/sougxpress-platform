import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Store, ShoppingBag, Truck, Users } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";
import { getAdminZones } from "@/services/admin.service";

type SetupMode = null | "store" | "merchant" | "driver" | "customer";

interface Zone {
  id: string;
  name: string;
}

export default function AdminSetupScreen() {
  const { colors, tokens } = useAppTheme();
  const [mode, setMode] = useState<SetupMode>(null);
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    getAdminZones().then(({ data }) => {
      const mapped: Zone[] = (data ?? [])
        .map((z) => ({
          id: String(z["id"] ?? ""),
          name: String(z["name"] ?? ""),
        }))
        .filter((z) => z.id && z.name);
      setZones(mapped);
    });
  }, []);

  return (
    <AdminPageShell title="مركز التهيئة والتشغيل" showBack>
      <Text
        style={[
          styles.intro,
          {
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.sm,
          },
        ]}
      >
        اختر نوع الإنشاء لبدء العملية
      </Text>

      {/* Creation cards */}
      <View style={styles.cardsGrid}>
        <CreationCard
          label="إنشاء متجر"
          icon={<Store color={colors.primary} size={28} />}
          onPress={() => setMode("store")}
          active={mode === "store"}
          colors={colors}
          tokens={tokens}
        />
        <CreationCard
          label="إنشاء حساب تاجر"
          icon={<ShoppingBag color={colors.primary} size={28} />}
          onPress={() => setMode("merchant")}
          active={mode === "merchant"}
          colors={colors}
          tokens={tokens}
        />
        <CreationCard
          label="إنشاء حساب موصل"
          icon={<Truck color={colors.primary} size={28} />}
          onPress={() => setMode("driver")}
          active={mode === "driver"}
          colors={colors}
          tokens={tokens}
        />
        <CreationCard
          label="إنشاء حساب زبون"
          icon={<Users color={colors.primary} size={28} />}
          onPress={() => setMode("customer")}
          active={mode === "customer"}
          colors={colors}
          tokens={tokens}
        />
      </View>

      {/* Form panel */}
      {mode && (
        <SetupFormPanel
          mode={mode}
          zones={zones}
          colors={colors}
          tokens={tokens}
        />
      )}
    </AdminPageShell>
  );
}

function CreationCard({
  label,
  icon,
  onPress,
  active,
  colors,
  tokens,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  active: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: active
            ? colors.primary + "22"
            : colors.bgElevated,
          borderColor: active ? colors.primary : colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
        },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.cardLabel,
          {
            color: colors.textPrimary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const FORM_CONFIGS: Record<
  NonNullable<SetupMode>,
  {
    title: string;
    fields: Array<{ key: string; label: string; placeholder: string; numeric?: boolean }>;
  }
> = {
  store: {
    title: "إنشاء متجر جديد",
    fields: [
      { key: "name", label: "اسم المتجر", placeholder: "مثال: متجر الأمل" },
      { key: "category", label: "الفئة", placeholder: "مثال: بقالة، ملابس..." },
    ],
  },
  merchant: {
    title: "إنشاء حساب تاجر",
    fields: [
      { key: "owner_full_name", label: "الاسم الكامل", placeholder: "الاسم الكامل للتاجر" },
      { key: "phone", label: "رقم الهاتف", placeholder: "مثال: 0661234567", numeric: true },
      { key: "business_name", label: "اسم النشاط التجاري", placeholder: "الاسم الرسمي للنشاط" },
    ],
  },
  driver: {
    title: "إنشاء حساب موصل",
    fields: [
      { key: "full_name", label: "الاسم الكامل", placeholder: "الاسم الكامل للموصل" },
      { key: "phone", label: "رقم الهاتف", placeholder: "مثال: 0661234567", numeric: true },
    ],
  },
  customer: {
    title: "إنشاء حساب زبون",
    fields: [
      { key: "full_name", label: "الاسم الكامل", placeholder: "الاسم الكامل للزبون" },
      { key: "phone", label: "رقم الهاتف", placeholder: "مثال: 0661234567", numeric: true },
      { key: "email", label: "البريد الإلكتروني (اختياري)", placeholder: "example@email.com" },
    ],
  },
};

function SetupFormPanel({
  mode,
  zones,
  colors,
  tokens,
}: {
  mode: NonNullable<SetupMode>;
  zones: Zone[];
  colors: ReturnType<typeof useAppTheme>["colors"];
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  const config = FORM_CONFIGS[mode];
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedZone, setSelectedZone] = useState<string>("");

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <View
      style={[
        styles.formPanel,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          marginTop: tokens.spacing.lg,
        },
      ]}
    >
      <Text
        style={[
          styles.formTitle,
          {
            color: colors.textPrimary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.md,
          },
        ]}
      >
        {config.title}
      </Text>

      {config.fields.map((field) => (
        <View key={field.key} style={styles.fieldBlock}>
          <Text
            style={[
              styles.fieldLabel,
              {
                color: colors.textSecondary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
              },
            ]}
          >
            {field.label}
          </Text>
          <TextInput
            value={values[field.key] ?? ""}
            onChangeText={(v) => handleChange(field.key, v)}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textDisabled}
            keyboardType={field.numeric ? "phone-pad" : "default"}
            textAlign="right"
            style={[
              styles.input,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                borderRadius: tokens.radius.sm,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.base,
                padding: tokens.spacing.md,
              },
            ]}
          />
        </View>
      ))}

      {/* Zone selector */}
      <View style={styles.fieldBlock}>
        <Text
          style={[
            styles.fieldLabel,
            {
              color: colors.textSecondary,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.sm,
            },
          ]}
        >
          المنطقة
        </Text>
        <View style={styles.zonesRow}>
          {zones.length === 0 ? (
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.textDisabled,
                  fontFamily: tokens.typography.families.arabic,
                  fontSize: tokens.typography.sizes.sm,
                },
              ]}
            >
              لا توجد مناطق متاحة
            </Text>
          ) : (
            zones.map((z) => (
              <TouchableOpacity
                key={z.id}
                onPress={() => setSelectedZone(z.id)}
                style={[
                  styles.zoneChip,
                  {
                    backgroundColor:
                      selectedZone === z.id
                        ? colors.primary
                        : colors.bgElevated,
                    borderColor:
                      selectedZone === z.id
                        ? colors.primary
                        : colors.borderSubtle,
                    borderRadius: tokens.radius.full,
                    paddingHorizontal: tokens.spacing.md,
                    paddingVertical: tokens.spacing.xs,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.zoneText,
                    {
                      color:
                        selectedZone === z.id
                          ? "#000"
                          : colors.textPrimary,
                      fontFamily: tokens.typography.families.arabic,
                      fontSize: tokens.typography.sizes.sm,
                    },
                  ]}
                >
                  {z.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Disabled create action — secure server-side creation required */}
      <View
        style={[
          styles.disabledBanner,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderSubtle,
            borderRadius: tokens.radius.sm,
            padding: tokens.spacing.md,
            marginTop: tokens.spacing.lg,
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
          يتطلب إنشاء الحساب الإداري خدمة آمنة من الخادم
        </Text>
      </View>

      <TouchableOpacity
        disabled
        style={[
          styles.createBtn,
          {
            backgroundColor: colors.textDisabled,
            borderRadius: tokens.radius.full,
            paddingVertical: tokens.spacing.md,
            marginTop: tokens.spacing.md,
          },
        ]}
      >
        <Text
          style={[
            styles.createBtnText,
            {
              color: colors.bgBase,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.base,
            },
          ]}
        >
          إنشاء
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    textAlign: "right",
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  cardLabel: {
    fontWeight: "700",
    textAlign: "center",
  },
  formPanel: {
    borderWidth: 1,
  },
  formTitle: {
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 16,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    textAlign: "right",
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    writingDirection: "rtl",
  },
  zonesRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  zoneChip: {
    borderWidth: 1,
  },
  zoneText: {
    fontWeight: "600",
  },
  disabledBanner: {
    borderWidth: 1,
  },
  disabledText: {
    textAlign: "right",
    lineHeight: 22,
  },
  createBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    fontWeight: "700",
  },
});
