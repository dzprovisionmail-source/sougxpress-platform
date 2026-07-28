export interface SubCategoryConfig {
  value: string;
  label: string;
}

export interface MainCategoryConfig {
  value: string; // Stable lowercase slug e.g. "food_dining"
  label: string; // Arabic display label
  icon?: string;
  subcategories?: SubCategoryConfig[];
}

export const MAIN_CATEGORIES: MainCategoryConfig[] = [
  {
    value: "food_dining",
    label: "طعام ومطاعم",
    icon: "restaurant-outline",
    subcategories: [
      { value: "restaurant", label: "مطعم" },
      { value: "fast_food", label: "وجبات سريعة" },
      { value: "cafe", label: "مقهى" },
      { value: "bakery", label: "مخبز" },
    ],
  },
  {
    value: "groceries",
    label: "بقالة وسوبرماركت",
    icon: "basket-outline",
    subcategories: [
      { value: "supermarket", label: "سوبرماركت" },
      { value: "grocery_store", label: "متجر بقالة" },
      { value: "butcher", label: "جزارة" },
      { value: "convenience", label: "بقالة سريعة" },
      { value: "produce", label: "خضروات وفواكه" },
    ],
  },
  {
    value: "fashion",
    label: "أزياء وملابس",
    icon: "shirt-outline",
    subcategories: [
      { value: "clothing", label: "ملابس" },
      { value: "shoes", label: "أحذية" },
      { value: "boutique", label: "بوتيك" },
    ],
  },
  {
    value: "electronics",
    label: "إلكترونيات وتكنولوجيا",
    icon: "phone-portrait-outline",
    subcategories: [
      { value: "phones_gadgets", label: "هواتف وملحقات" },
      { value: "computers", label: "حواسيب" },
    ],
  },
  {
    value: "health_beauty",
    label: "صحة وجمال",
    icon: "medkit-outline",
    subcategories: [
      { value: "pharmacy", label: "صيدلية" },
      { value: "cosmetics", label: "مستحضرات تجميل" },
    ],
  },
  {
    value: "household",
    label: "أدوات منزلية",
    icon: "home-outline",
  },
  {
    value: "other",
    label: "أخرى",
    icon: "grid-outline",
  },
];

export function mapLegacyCategoryToMain(legacyCategory?: string | null): string {
  if (!legacyCategory) return "other";
  const lower = legacyCategory.toLowerCase().trim();
  switch (lower) {
    case "restaurant":
    case "food":
    case "fast_food":
    case "cafe":
    case "bakery":
    case "مخبوزات":
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
      return "groceries";
    case "clothing":
    case "fashion":
    case "apparel":
    case "shoes":
    case "boutique":
      return "fashion";
    case "electronics":
    case "tech":
    case "phones":
    case "computers":
      return "electronics";
    case "pharmacy":
    case "health":
    case "medical":
    case "beauty":
      return "health_beauty";
    case "household":
      return "household";
    default:
      return "other";
  }
}
