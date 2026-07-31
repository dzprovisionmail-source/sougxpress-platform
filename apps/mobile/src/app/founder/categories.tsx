import React, { useEffect, useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Search, Plus, X, ChevronUp, ChevronDown, Trash2 } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getCategoriesWithSubcategories, createCategory, updateCategory, deleteCategory, createSubcategory, updateSubcategory, deleteSubcategory } from "@/services/category.service";
import { Category, Subcategory } from "@/types/schema-03-core";
import { AdminPageShell, AdminLoadingState, AdminEmptyState, AdminErrorState } from "@/components/admin";
import { TOKENS } from "@/constants/tokens";

export default function FounderCategoriesScreen() {
  const { colors, tokens } = useAppTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [subsForCat, setSubsForCat] = useState<Record<string, Subcategory[]>>({});

  const [showAddSub, setShowAddSub] = useState(false);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getCategoriesWithSubcategories();
      setCategories(data);
    } catch {
      setError("تعذّر تحميل التصنيفات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = async (catId: string) => {
    if (expandedCat === catId) {
      setExpandedCat(null);
      return;
    }
    setExpandedCat(catId);
    if (!subsForCat[catId]) {
      const all = await getCategoriesWithSubcategories();
      const map: Record<string, Subcategory[]> = {};
      all.forEach(c => { map[c.id] = (c as any).subcategories || []; });
      setSubsForCat(map);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    const created = await createCategory(newCatName.trim());
    setSavingCat(false);
    if (created) {
      setNewCatName("");
      setShowAddCat(false);
      load(true);
    } else {
      Alert.alert("خطأ", "تعذر إنشاء التصنيف");
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    Alert.alert(
      "تأكيد الحذف",
      `هل تريد حذف "${cat.name_ar}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            const { error: delError } = await deleteCategory(cat.id);
            if (delError) {
              Alert.alert("خطأ", delError);
            } else {
              load(true);
            }
          },
        },
      ]
    );
  };

  const handleCreateSubcategory = async () => {
    if (!newSubName.trim() || !activeCatId) return;
    setSavingSub(true);
    const created = await createSubcategory(activeCatId, newSubName.trim());
    setSavingSub(false);
    if (created) {
      setNewSubName("");
      setShowAddSub(false);
      setActiveCatId(null);
      if (expandedCat) {
        toggleExpand(expandedCat);
        setTimeout(() => toggleExpand(expandedCat), 50);
      }
    } else {
      Alert.alert("خطأ", "تعذر إنشاء الفئة الفرعية");
    }
  };

  const handleDeleteSubcategory = async (sub: Subcategory) => {
    Alert.alert(
      "تأكيد الحذف",
      `هل تريد حذف "${sub.name_ar}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            const { error: delError } = await deleteSubcategory(sub.id);
            if (delError) {
              Alert.alert("خطأ", delError);
            } else if (expandedCat) {
              toggleExpand(expandedCat);
              setTimeout(() => toggleExpand(expandedCat), 50);
            }
          },
        },
      ]
    );
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.trim().toLowerCase();
    return categories.filter(c =>
      c.name_ar.toLowerCase().includes(q) ||
      (subsForCat[c.id] || []).some(s => s.name_ar.toLowerCase().includes(q))
    );
  }, [categories, search, subsForCat]);

  const renderItem = ({ item }: { item: Category }) => {
    const subs = subsForCat[item.id] || [];
    const isExpanded = expandedCat === item.id;
    return (
      <View style={[styles.catCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.catHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.catName, { color: colors.textPrimary }]}>{item.name_ar}</Text>
            <Text style={[styles.catMeta, { color: colors.textSecondary }]}>
              {subs.length} فئة فرعية • {item.is_active ? "نشط" : "مخفي"}
            </Text>
          </View>
          <View style={{ flexDirection: "row-reverse", marginRight: 8, alignItems: "center" }}>
            <TouchableOpacity onPress={() => handleDeleteCategory(item)}>
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>
            {isExpanded ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.subsArea, { borderTopColor: colors.borderSubtle }]}>
            {subs.map((sub) => (
              <View key={sub.id} style={[styles.subRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.subName, { color: colors.textPrimary }]}>{sub.name_ar}</Text>
                <View style={{ flexDirection: "row-reverse", marginRight: 8 }}>
                  <TouchableOpacity onPress={() => handleDeleteSubcategory(sub)}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => { setActiveCatId(item.id); setShowAddSub(true); }}
              style={[styles.addSubBtn, { borderColor: colors.borderSubtle }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.addSubText, { color: colors.primary }]}>إضافة فئة فرعية</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <AdminPageShell showLogout title="إدارة التصنيفات" showBack>
      <View style={{ flex: 1, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }}>
            <View style={{ flexDirection: "row-reverse", marginRight: 8, marginBottom: 12 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث..."
            placeholderTextColor={colors.textDisabled}
            textAlign="right"
            style={[styles.searchInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, flex: 1 }]}
          />
          <TouchableOpacity onPress={() => setShowAddCat(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <AdminLoadingState message="جاري تحميل التصنيفات..." />
        ) : error && !categories.length ? (
          <AdminErrorState message={error} onRetry={() => load(true)} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
            ListEmptyComponent={<AdminEmptyState message="لا توجد تصنيفات" />}
            renderItem={renderItem}
          />
        )}
      </View>

      {/* Add Category Modal */}
      <Modal visible={showAddCat} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصنيف جديد</Text>
            <TextInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="اسم التصنيف"
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
            />
            <View style={{ flexDirection: "row-reverse", marginRight: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={handleCreateCategory} disabled={savingCat} style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                {savingCat ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>حفظ</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAddCat(false); setNewCatName(""); }} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal visible={showAddSub} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>فئة فرعية جديدة</Text>
            <TextInput
              value={newSubName}
              onChangeText={setNewSubName}
              placeholder="اسم الفئة الفرعية"
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
            />
            <View style={{ flexDirection: "row-reverse", marginRight: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={handleCreateSubcategory} disabled={savingSub} style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                {savingSub ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>حفظ</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAddSub(false); setNewSubName(""); setActiveCatId(null); }} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = {
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, textAlign: "right" as const },
  addBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center" as const, justifyContent: "center" as const },
  catCard: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: "hidden" as const },
  catHeader: { flexDirection: "row-reverse" as const, alignItems: "center" as const, padding: 16, paddingRight: 20 },
  catName: { fontSize: 16, fontWeight: "700" as const, textAlign: "right" as const },
  catMeta: { fontSize: 12, marginTop: 2, textAlign: "right" as const },
  subsArea: { borderTopWidth: 1, paddingVertical: 8 },
  subRow: { flexDirection: "row-reverse" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  subName: { fontSize: 14, textAlign: "right" as const },
  addSubBtn: { flexDirection: "row-reverse" as const, alignItems: "center" as const, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" as const },
  addSubText: { fontSize: 13, fontWeight: "600" as const },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" as const },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 17, fontWeight: "700" as const, textAlign: "right" as const, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, textAlign: "right" as const },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: "center" as const },
};
