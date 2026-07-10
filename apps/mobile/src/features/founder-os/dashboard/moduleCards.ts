import { AIN_SEFRA_ZONES } from "@/constants/ain-sefra-zones";
import { MOCK_FOUNDER_DASHBOARD_SUMMARY } from "./mockData";

/**
 * One card per Founder OS module. counts are mock placeholders that satisfy
 * the typed interfaces in src/types — not arbitrary numbers.
 */
export interface FounderModuleCard {
  key: string;
  labelAr: string;
  route: string;
  count: number;
}

export const FOUNDER_MODULE_CARDS: FounderModuleCard[] = [
  { key: "zones", labelAr: "الأحياء", route: "zones", count: AIN_SEFRA_ZONES.length },
  { key: "users", labelAr: "المستخدمون", route: "users", count: 0 },
  { key: "merchants", labelAr: "التجار", route: "merchants", count: MOCK_FOUNDER_DASHBOARD_SUMMARY.active_merchants },
  { key: "stores", labelAr: "المتاجر", route: "stores", count: 0 },
  { key: "products", labelAr: "المنتجات", route: "products", count: 0 },
  { key: "orders", labelAr: "الطلبات", route: "orders", count: MOCK_FOUNDER_DASHBOARD_SUMMARY.total_orders },
  { key: "drivers", labelAr: "السائقون", route: "drivers", count: MOCK_FOUNDER_DASHBOARD_SUMMARY.active_drivers },
  { key: "finance", labelAr: "المالية", route: "finance", count: MOCK_FOUNDER_DASHBOARD_SUMMARY.total_commission_minor },
  { key: "promotions", labelAr: "العروض", route: "promotions", count: 0 },
  { key: "disputes", labelAr: "النزاعات", route: "disputes", count: MOCK_FOUNDER_DASHBOARD_SUMMARY.open_disputes },
  { key: "settings", labelAr: "الإعدادات", route: "settings", count: 0 },
  { key: "ai-control", labelAr: "الذكاء الاصطناعي", route: "ai-control", count: 0 },
  { key: "audit-logs", labelAr: "سجل العمليات", route: "audit-logs", count: 0 },
];
