import { useState, useEffect, useCallback } from "react";
import {
  getMerchantEarnings,
  getMerchantDeliveryStats,
  EarningsSummary,
  DeliveryStats,
} from "../services/merchant-earnings.service";

export function useMerchantEarnings(merchantId: string, storeId: string) {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!merchantId) return;
    setLoading(true);
    const [e, d] = await Promise.all([
      getMerchantEarnings(merchantId),
      storeId ? getMerchantDeliveryStats(storeId) : Promise.resolve(null),
    ]);
    setEarnings(e);
    setDeliveryStats(d);
    setLoading(false);
  }, [merchantId, storeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { earnings, deliveryStats, loading, refresh };
}
