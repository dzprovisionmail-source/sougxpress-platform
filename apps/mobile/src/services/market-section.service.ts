import { supabase } from "@/lib/supabase";

export interface MarketSectionSettings {
  showSpecialOffers: boolean;
  showNewStores: boolean;
  showAllStores: boolean;
}

const DEFAULT_MARKET_SECTION_SETTINGS: MarketSectionSettings = {
  showSpecialOffers: true,
  showNewStores: true,
  showAllStores: true,
};

export async function getMarketSectionSettings(): Promise<MarketSectionSettings> {
  try {
    const { data, error } = await supabase
      .from("platform_financial_settings")
      .select("key, value")
      .in("key", ["market_show_special_offers", "market_show_new_stores", "market_show_all_stores"]);

    if (error || !data) return DEFAULT_MARKET_SECTION_SETTINGS;

    const settings = { ...DEFAULT_MARKET_SECTION_SETTINGS };
    data.forEach((row: any) => {
      const value = row.value === true || row.value === "true";
      if (row.key === "market_show_special_offers") settings.showSpecialOffers = value;
      if (row.key === "market_show_new_stores") settings.showNewStores = value;
      if (row.key === "market_show_all_stores") settings.showAllStores = value;
    });
    return settings;
  } catch (error) {
    console.error("getMarketSectionSettings error:", error);
    return DEFAULT_MARKET_SECTION_SETTINGS;
  }
}

export async function updateMarketSectionSettings(
  settings: MarketSectionSettings,
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates = [
      ["market_show_special_offers", settings.showSpecialOffers],
      ["market_show_new_stores", settings.showNewStores],
      ["market_show_all_stores", settings.showAllStores],
    ] as const;

    const results = await Promise.all(
      updates.map(([key, value]) =>
        supabase
          .from("platform_financial_settings")
          .update({ value: String(value) })
          .eq("key", key),
      ),
    );
    const failed = results.find(({ error }) => error);
    if (failed?.error) throw failed.error;
    return { success: true };
  } catch (error: any) {
    console.error("updateMarketSectionSettings error:", error);
    return { success: false, error: error.message || "تعذّر حفظ إعدادات أقسام السوق" };
  }
}
