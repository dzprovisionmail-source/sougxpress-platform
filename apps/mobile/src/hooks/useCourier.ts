import { useState, useEffect } from "react";

interface Courier {
  id: string;
  [key: string]: any;
}

export default function useCourier(userId: string) {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCourier(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      setCourier({ id: "mock-courier-id", user_id: userId });
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [userId]);

  return { courier, loading };
}
