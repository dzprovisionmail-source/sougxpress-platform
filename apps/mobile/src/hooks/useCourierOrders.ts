import { useState, useEffect } from "react";

interface Delivery {
  id: string;
  status: string;
  store_name: string;
  customer_name: string;
  [key: string]: any;
}

export default function useCourierOrders(courierId: string) {
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDeliveries = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    setActiveDeliveries([]);
    setLoading(false);
  };

  useEffect(() => {
    if (!courierId) {
      setActiveDeliveries([]);
      setLoading(false);
      return;
    }
    refreshDeliveries();
  }, [courierId]);

  return { activeDeliveries, loading, refreshDeliveries };
}
