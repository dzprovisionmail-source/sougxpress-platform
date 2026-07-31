import { supabase } from "../lib/supabase";
import { Category, Subcategory } from "../types/schema-03-core";

export const getActiveCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return (data as Category[]) || [];
};

export const getActiveSubcategories = async (categoryId?: string): Promise<Subcategory[]> => {
  if (!categoryId) return [];
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching subcategories:", error);
    return [];
  }
  return (data as Subcategory[]) || [];
};

export const getCategoriesWithSubcategories = async (): Promise<Category[]> => {
  const categories = await getActiveCategories();
  const enriched = await Promise.all(
    categories.map(async (cat) => {
      const subs = await getActiveSubcategories(cat.id);
      return { ...cat, subcategories: subs } as Category & { subcategories: Subcategory[] };
    })
  );
  return enriched;
};

export const createCategory = async (nameAr: string, icon?: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name_ar: nameAr, icon: icon || null })
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    return null;
  }
  return data as Category;
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category | null> => {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error);
    return null;
  }
  return data as Category;
};

export const deleteCategory = async (id: string): Promise<{ error: string | null }> => {
  const { count, error: countError } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) {
    return { error: countError.message };
  }
  if ((count ?? 0) > 0) {
    return { error: "لا يمكن حذف تصنيف مرتبط بمتاجر نشطة" };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }
  return { error: null };
};

export const reorderCategories = async (orderedIds: string[]): Promise<{ error: string | null }> => {
  const updates = orderedIds.map((id, index) => ({ id, display_order: index }));
  const { error } = await supabase.from("categories").upsert(updates, { onConflict: "id" });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
};

export const reorderSubcategories = async (categoryId: string, orderedIds: string[]): Promise<{ error: string | null }> => {
  const updates = orderedIds.map((id, index) => ({ id, display_order: index, category_id: categoryId }));
  const { error } = await supabase.from("subcategories").upsert(updates, { onConflict: "id" });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
};

export const deleteSubcategory = async (id: string): Promise<{ error: string | null }> => {
  const { count, error: countError } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("subcategory_id", id);
  if (countError) {
    return { error: countError.message };
  }
  if ((count ?? 0) > 0) {
    return { error: "لا يمكن حذف فئة فرعية مرتبطة بمتاجر نشطة" };
  }

  const { error } = await supabase.from("subcategories").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }
  return { error: null };
};

export const createSubcategory = async (categoryId: string, nameAr: string): Promise<Subcategory | null> => {
  const { data, error } = await supabase
    .from("subcategories")
    .insert({ category_id: categoryId, name_ar: nameAr })
    .select()
    .single();

  if (error) {
    console.error("Error creating subcategory:", error);
    return null;
  }
  return data as Subcategory;
};

export const updateSubcategory = async (id: string, updates: Partial<Subcategory>): Promise<Subcategory | null> => {
  const { data, error } = await supabase
    .from("subcategories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating subcategory:", error);
    return null;
  }
  return data as Subcategory;
};
