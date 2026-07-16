import { useCallback, useEffect, useState } from "react";
import { MoneyRequest } from "@/types/schema-03b-addendum";
import {
  getMyMoneyRequests,
  getAllMoneyRequests,
  createMoneyRequest,
  reviewMoneyRequest,
} from "@/services/money-requests.service";

/** Hook for regular users — shows only their own requests. */
export function useMyMoneyRequests(userId: string) {
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      setRequests(await getMyMoneyRequests(userId));
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = useCallback(
    async (amount: number, reason: string) => {
      const created = await createMoneyRequest(userId, amount, reason);
      setRequests((prev) => [created, ...prev]);
      return created;
    },
    [userId]
  );

  return { requests, loading, error, refresh, submit };
}

/** Hook for founder/admin — shows all requests across all users. */
export function useAllMoneyRequests() {
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRequests(await getAllMoneyRequests());
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const review = useCallback(
    async (id: string, status: "approved" | "rejected", reviewerId: string) => {
      await reviewMoneyRequest(id, status, reviewerId);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }
            : r
        )
      );
    },
    []
  );

  return { requests, loading, error, refresh, review };
}
