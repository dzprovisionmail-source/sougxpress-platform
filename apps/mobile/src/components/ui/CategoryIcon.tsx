import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import {
  Utensils,
  Carrot,
  Wheat,
  Pill,
  Coffee,
  Smartphone,
  Shirt,
  Sparkles,
  Tag,
  Bike,
  Heart,
  Wallet,
  Bell,
  Search,
  SlidersHorizontal,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CarFront,
  House,
  Armchair,
  BookOpen,
  BriefcaseBusiness,
  Baby,
  PawPrint,
  Apple,
  Dumbbell,
  Leaf,
  HeartPulse,
  Gem,
  Ellipsis,
  LucideIcon,
} from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

export type CategoryKey =
  | 'restaurant'
  | 'supermarket'
  | 'vegetables'
  | 'bakery'
  | 'pharmacy'
  | 'coffee'
  | 'electronics'
  | 'clothing'
  | 'beauty'
  | 'deals'
  | 'delivery'
  | 'orders'
  | 'favorites'
  | 'wallet'
  | 'notifications'
  | 'default';

export interface CategoryIconProps {
  category?: string;
  categoryKey?: CategoryKey;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'filled' | 'outlined' | 'subtle' | 'plain';
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A local, stable semantic registry. Matching uses the category label rather
 * than array position so database reordering or newly inserted categories do
 * not change the meaning of an icon.
 */
const CATEGORY_MAP: Record<string, LucideIcon> = {
  // Food and everyday shopping
  'مطاعم': Utensils,
  'مطعم': Utensils,
  'وجبات سريعة': Utensils,
  'بقالة': Apple,
  'سوبرماركت': Apple,
  'مواد غذائية': Apple,
  'خضار وفواكه': Carrot,
  'خضروات': Carrot,
  'فواكه': Apple,
  'مخبزة': Wheat,
  'حلويات': Wheat,
  'مخبوزات': Wheat,
  'صيدلية': Pill,
  'أدوية': Pill,
  'مقهى': Coffee,
  'كافيه': Coffee,
  'مشروبات': Coffee,
  restaurant: Utensils,
  supermarket: Apple,
  grocery: Apple,
  vegetables: Carrot,
  fruit: Apple,
  bakery: Wheat,
  pharmacy: Pill,
  coffee: Coffee,

  // Marketplace categories
  'سيارات': CarFront,
  'سيارة': CarFront,
  'مركبات': CarFront,
  cars: CarFront,
  vehicles: CarFront,
  'عقارات': House,
  'عقار': House,
  'منازل': House,
  'مباني': House,
  realestate: House,
  property: House,
  'إلكترونيات': Smartphone,
  'الكترونيات': Smartphone,
  'هواتف': Smartphone,
  'أجهزة': Smartphone,
  electronics: Smartphone,
  'ملابس': Shirt,
  'أزياء': Shirt,
  'موضة': Shirt,
  clothing: Shirt,
  fashion: Shirt,
  'منزل': House,
  'المنزل': House,
  'أثاث': Armchair,
  'ديكور': Armchair,
  home: House,
  furniture: Armchair,
  'كتب': BookOpen,
  'تعليم': BookOpen,
  'قرطاسية': BookOpen,
  books: BookOpen,
  education: BookOpen,
  'خدمات': BriefcaseBusiness,
  'خدمة': BriefcaseBusiness,
  services: BriefcaseBusiness,
  'أطفال': Baby,
  'طفل': Baby,
  'ألعاب': Baby,
  children: Baby,
  toys: Baby,
  'حيوانات أليفة': PawPrint,
  'حيوانات': PawPrint,
  'مستلزمات حيوانات': PawPrint,
  pets: PawPrint,
  'رياضة': Dumbbell,
  'رياضة وترفيه': Dumbbell,
  'ترفيه': Dumbbell,
  sports: Dumbbell,
  'جمال': Sparkles,
  'تجميل': Sparkles,
  'عناية شخصية': Sparkles,
  beauty: Sparkles,
  'زراعة': Leaf,
  'حدائق': Leaf,
  'زراعة وحدائق': Leaf,
  agriculture: Leaf,
  gardening: Leaf,
  'صحة': HeartPulse,
  'صحة ولياقة': HeartPulse,
  'لياقة': HeartPulse,
  health: HeartPulse,
  fitness: HeartPulse,
  'مجوهرات': Gem,
  'مجوهرات وساعات': Gem,
  'ساعات': Clock,
  jewelry: Gem,
  watches: Clock,
  'عروض': Tag,
  'خصومات': Tag,
  deals: Tag,

  // App/system labels used by shared cards
  'توصيل': Bike,
  delivery: Bike,
  طلباتي: Utensils,
  orders: Utensils,
  المفضلة: Heart,
  favorites: Heart,
  محفظة: Wallet,
  wallet: Wallet,
  إشعارات: Bell,
  notifications: Bell,
  search: Search,
  filters: SlidersHorizontal,
  clock: Clock,
  location: MapPin,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  help: HelpCircle,
  default: Ellipsis,
};

const CATEGORY_PATTERNS: Array<[string[], LucideIcon]> = [
  [['سيار', 'مركب', 'car', 'vehicle'], CarFront],
  [['عقار', 'منزل', 'مبنى', 'property', 'real'], House],
  [['إلكترون', 'الكترون', 'هاتف', 'جهاز', 'electronic'], Smartphone],
  [['ملابس', 'أزياء', 'موضة', 'clothing', 'fashion'], Shirt],
  [['أثاث', 'ديكور', 'furniture'], Armchair],
  [['كتب', 'تعليم', 'قرطاسي', 'book', 'educat'], BookOpen],
  [['خدم', 'service'], BriefcaseBusiness],
  [['طفل', 'أطفال', 'ألعاب', 'child', 'toy'], Baby],
  [['حيوان', 'حيوانات', 'pet'], PawPrint],
  [['غذاء', 'غذائي', 'بقال', 'سوبر', 'food', 'grocery'], Apple],
  [['خضار', 'نبات', 'vegetable'], Carrot],
  [['فاكه', 'fruit'], Apple],
  [['رياض', 'ترفيه', 'sport'], Dumbbell],
  [['جمال', 'تجميل', 'عناية', 'beaut'], Sparkles],
  [['زراع', 'حدائق', 'garden', 'agric'], Leaf],
  [['صح', 'لياق', 'health', 'fitness'], HeartPulse],
  [['مجوهر', 'جوهرة', 'jewel'], Gem],
  [['ساع', 'watch'], Clock],
  [['مطع', 'وجبات', 'restaurant'], Utensils],
  [['مخب', 'حلوي', 'bak'], Wheat],
  [['صيدل', 'دواء', 'pharm'], Pill],
  [['مقه', 'كافي', 'مشروب', 'coffee'], Coffee],
];

const resolveCategoryIcon = (category: string, categoryKey?: CategoryKey): LucideIcon => {
  const raw = String(categoryKey || category || '').trim();
  const normalized = raw.toLowerCase();
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];
  if (CATEGORY_MAP[raw]) return CATEGORY_MAP[raw];
  const matched = CATEGORY_PATTERNS.find(([patterns]) => patterns.some((pattern) => normalized.includes(pattern)));
  return matched?.[1] || CATEGORY_MAP.default;
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category = '',
  categoryKey,
  size = 'md',
  variant = 'subtle',
  color,
  backgroundColor,
  style,
}) => {
  const { colors } = useAppTheme();
  const getIconSize = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 14;
      case 'sm': return 18;
      case 'md': return 22;
      case 'lg': return 28;
      case 'xl': return 36;
      default: return 22;
    }
  };

  const numericSize = getIconSize();
  const containerSize = numericSize * 1.85;
  const IconComponent = resolveCategoryIcon(category, categoryKey);
  const iconColor = color || (variant === 'filled' ? colors.textOnBrand : colors.primary);
  const getBgColor = (): string => {
    if (backgroundColor) return backgroundColor;
    switch (variant) {
      case 'filled': return colors.primary;
      case 'subtle': return `${colors.primary}18`;
      case 'outlined':
      case 'plain':
      default: return 'transparent';
    }
  };

  return (
    <View
      style={[
        styles.base,
        variant !== 'plain' && {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: getBgColor(),
        },
        variant === 'outlined' && { borderWidth: 1.5, borderColor: colors.primary },
        style,
      ]}
    >
      <IconComponent size={numericSize} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryIcon;
