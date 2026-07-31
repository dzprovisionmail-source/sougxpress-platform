export interface SubCategoryConfig {
  value: string;
  label: string;
}

export interface MainCategoryConfig {
  value: string; // Stable lowercase slug
  label: string; // Arabic display label
  icon?: string;
  subcategories: SubCategoryConfig[];
}

export const MAIN_CATEGORIES: MainCategoryConfig[] = [
  {
    value: "groceries",
    label: "سوبر ماركت",
    icon: "basket-outline",
    subcategories: [
      { value: "food_stuffs", label: "مواد غذائية" },
      { value: "beverages", label: "مشروبات" },
      { value: "cleaning_supplies", label: "مواد تنظيف" },
      { value: "household_products", label: "منتجات منزلية" },
    ],
  },
  {
    value: "produce",
    label: "خضر وفواكه",
    icon: "leaf-outline",
    subcategories: [
      { value: "vegetables", label: "خضر" },
      { value: "fruits", label: "فواكه" },
      { value: "dates", label: "تمور" },
      { value: "herbs", label: "أعشاب" },
    ],
  },
  {
    value: "food_dining",
    label: "مطاعم",
    icon: "restaurant-outline",
    subcategories: [
      { value: "fast_food", label: "أكلات سريعة" },
      { value: "traditional_food", label: "أكلات تقليدية" },
      { value: "pizza", label: "بيتزا" },
      { value: "grills", label: "مشاوي" },
      { value: "sweets", label: "حلويات" },
    ],
  },
  {
    value: "bakery_sweets",
    label: "مخابز وحلويات",
    icon: "cafe-outline",
    subcategories: [
      { value: "bakery", label: "مخبزة" },
      { value: "traditional_sweets", label: "حلويات تقليدية" },
      { value: "modern_sweets", label: "حلويات عصرية" },
      { value: "pastries", label: "مرطبات" },
    ],
  },
  {
    value: "health_beauty",
    label: "صيدلية وصحة",
    icon: "medkit-outline",
    subcategories: [
      { value: "pharmacy", label: "صيدلية" },
      { value: "parapharmacy", label: "شبه صيدلية" },
      { value: "medical_supplies", label: "مستلزمات طبية" },
      { value: "personal_care", label: "عناية شخصية" },
    ],
  },
  {
    value: "fashion",
    label: "ملابس وأحذية",
    icon: "shirt-outline",
    subcategories: [
      { value: "mens_clothing", label: "ملابس رجالية" },
      { value: "womens_clothing", label: "ملابس نسائية" },
      { value: "kids_clothing", label: "ملابس أطفال" },
      { value: "shoes", label: "أحذية" },
      { value: "accessories", label: "إكسسوارات" },
    ],
  },
  {
    value: "electronics",
    label: "إلكترونيات وهواتف",
    icon: "phone-portrait-outline",
    subcategories: [
      { value: "phones", label: "هواتف" },
      { value: "phone_accessories", label: "إكسسوارات الهواتف" },
      { value: "electronics", label: "إلكترونيات" },
      { value: "maintenance", label: "صيانة" },
    ],
  },
  {
    value: "cosmetics_perfumes",
    label: "تجميل وعطور",
    icon: "sparkles-outline",
    subcategories: [
      { value: "cosmetics", label: "مستحضرات تجميل" },
      { value: "perfumes", label: "عطور" },
      { value: "skin_care", label: "عناية بالبشرة" },
      { value: "grooming_beauty", label: "حلاقة وتجميل" },
    ],
  },
  {
    value: "household",
    label: "منزل وأثاث",
    icon: "home-outline",
    subcategories: [
      { value: "houseware", label: "أدوات منزلية" },
      { value: "furniture", label: "أثاث" },
      { value: "decor", label: "ديكور" },
      { value: "appliances", label: "أجهزة كهرومنزلية" },
    ],
  },
  {
    value: "services",
    label: "خدمات",
    icon: "construct-outline",
    subcategories: [
      { value: "repair_services", label: "صيانة" },
      { value: "transport", label: "نقل" },
      { value: "printing_photo", label: "تصوير وطباعة" },
      { value: "misc_services", label: "خدمات متنوعة" },
    ],
  },
  {
    value: "other",
    label: "أخرى",
    subcategories: [],
  },
];

export function mapLegacyCategoryToMain(legacyCategory?: string | null): string {
  if (!legacyCategory) return "groceries";
  const lower = legacyCategory.toLowerCase().trim();
  if (lower === "other" || lower === "أخرى") return "other";
  const found = MAIN_CATEGORIES.find(
    (c) => c.value === lower || c.label === legacyCategory || c.subcategories.some((s) => s.value === lower || s.label === legacyCategory)
  );
  if (found) return found.value;

  switch (lower) {
    case "restaurant":
    case "food":
    case "fast_food":
    case "cafe":
    case "bakery":
    case "مخبوزات":
    case "مطاعم":
      return "food_dining";
    case "grocery":
    case "supermarket":
    case "convenience":
    case "market":
    case "butcher":
    case "خضروات":
    case "فواكه":
    case "لحوم":
    case "ألبان":
    case "سوبر ماركت":
      return "groceries";
    case "clothing":
    case "fashion":
    case "apparel":
    case "shoes":
    case "boutique":
    case "ملابس وأحذية":
      return "fashion";
    case "electronics":
    case "tech":
    case "phones":
    case "computers":
    case "إلكترونيات":
      return "electronics";
    case "pharmacy":
    case "health":
    case "medical":
    case "beauty":
    case "صيدلية":
      return "health_beauty";
    case "household":
    case "منزل وأثاث":
      return "household";
    default:
      return "groceries";
  }
}

export function getArabicCategoryName(mainCat?: string | null, subCat?: string | null, legacyCat?: string | null): string {
  if (mainCat) {
    if (mainCat === "other") return "أخرى";
    const main = MAIN_CATEGORIES.find((c) => c.value === mainCat);
    if (main) {
      if (subCat) {
        const sub = main.subcategories.find((s) => s.value === subCat || s.label === subCat);
        if (sub) return `${main.label} • ${sub.label}`;
      }
      return main.label;
    }
  }

  const legacyToUse = legacyCat || mainCat;
  if (legacyToUse && legacyToUse !== "other") {
    const mappedVal = mapLegacyCategoryToMain(legacyToUse);
    const main = MAIN_CATEGORIES.find((c) => c.value === mappedVal);
    if (main) return main.label;
    return legacyToUse;
  }

  return "أخرى";
}
