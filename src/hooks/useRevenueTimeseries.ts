import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { subDays, getISOWeek, format, parse } from "date-fns";
import { fr } from "date-fns/locale";

export type Granularity = "day" | "week" | "month";

interface RevenuePoint {
  label: string;
  withDiag: number;
  withoutDiag: number;
}

interface UseRevenueTimeseriesResult {
  data: RevenuePoint[];
  isLoading: boolean;
  isEmpty: boolean; // true when query returned 0 orders (likely wrong date range)
}

export function useRevenueTimeseries(
  dateRange?: DateRange,
  granularity: Granularity = "day"
): UseRevenueTimeseriesResult {
  const [data, setData] = useState<RevenuePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      const from = dateRange?.from;
      const toRaw = dateRange?.to;
      const to = toRaw ? new Date(toRaw) : undefined;
      if (to) to.setHours(23, 59, 59, 999);

      const fromISO = from ? from.toISOString() : undefined;
      const toISO = to ? to.toISOString() : undefined;

      // Paginate to bypass the PostgREST 1000-row server cap
      const PAGE_SIZE = 1000;
      let allOrders: { created_at: string | null; total_price: number | null; is_from_diagnostic: boolean | null }[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from_idx = page * PAGE_SIZE;
        const to_idx = from_idx + PAGE_SIZE - 1;
        let q = supabase
          .from("shopify_orders")
          .select("created_at, total_price, is_from_diagnostic")
          .gt("total_price", 0)
          .order("created_at", { ascending: true })
          .range(from_idx, to_idx);
        if (fromISO) q = q.gte("created_at", fromISO);
        if (toISO) q = q.lte("created_at", toISO);
        const { data: batch, error } = await q;

        if (error || !batch) {
          setData([]);
          setIsEmpty(true);
          setIsLoading(false);
          return;
        }

        allOrders = allOrders.concat(batch);
        hasMore = batch.length === PAGE_SIZE;
        page++;
      }

      const orders = allOrders;

      // Effective bounds: use provided range or derive from data
      const effectiveFrom = from ?? (orders.length > 0 ? new Date(orders[0].created_at!) : new Date());
      effectiveFrom.setHours(0, 0, 0, 0);
      const effectiveTo = to ?? new Date();

      setIsEmpty(orders.length === 0);

      // Group orders by Europe/Paris date (explicit timezone)
      const toParisDate = (iso: string) =>
        new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

      const dayMap = new Map<string, { withDiag: number; withoutDiag: number }>();
      for (const o of orders) {
        const dayKey = toParisDate(o.created_at!);
        const existing = dayMap.get(dayKey) ?? { withDiag: 0, withoutDiag: 0 };
        const amount = Number(o.total_price) || 0;
        if (o.is_from_diagnostic) {
          existing.withDiag += amount;
        } else {
          existing.withoutDiag += amount;
        }
        dayMap.set(dayKey, existing);
      }

      // Fill all days in range (using Europe/Paris dates)
      // Use effectiveFrom so "Toute la période" covers real data range
      const allDays: string[] = [];
      const cur = new Date(effectiveFrom);
      cur.setHours(12, 0, 0, 0); // noon to avoid DST edge cases
      const end = new Date(effectiveTo);
      end.setHours(12, 0, 0, 0);
      while (cur <= end) {
        allDays.push(toParisDate(cur.toISOString()));
        cur.setDate(cur.getDate() + 1);
      }

      if (granularity === "day") {
        setData(
          allDays.map((d) => {
            const v = dayMap.get(d) ?? { withDiag: 0, withoutDiag: 0 };
            const date = parse(d, "yyyy-MM-dd", new Date());
            const total = Math.round((v.withDiag + v.withoutDiag) * 100) / 100;
            return {
              label: format(date, "dd/MM"),
              withDiag: total,
              withoutDiag: Math.round(v.withoutDiag * 100) / 100,
            };
          })
        );
      } else if (granularity === "week") {
        const weekMap = new Map<string, { withDiag: number; withoutDiag: number }>();
        for (const d of allDays) {
          const date = parse(d, "yyyy-MM-dd", new Date());
          const weekNum = getISOWeek(date);
          const year = date.getFullYear();
          const key = `${year}-S${weekNum}`;
          const existing = weekMap.get(key) ?? { withDiag: 0, withoutDiag: 0 };
          const v = dayMap.get(d) ?? { withDiag: 0, withoutDiag: 0 };
          weekMap.set(key, {
            withDiag: existing.withDiag + v.withDiag,
            withoutDiag: existing.withoutDiag + v.withoutDiag,
          });
        }
        setData(
          Array.from(weekMap.entries()).map(([key, v]) => ({
            label: key.split("-")[1],
            withDiag: Math.round((v.withDiag + v.withoutDiag) * 100) / 100,
            withoutDiag: Math.round(v.withoutDiag * 100) / 100,
          }))
        );
      } else {
        const monthMap = new Map<string, { withDiag: number; withoutDiag: number }>();
        const monthOrder: string[] = [];
        for (const d of allDays) {
          const date = parse(d, "yyyy-MM-dd", new Date());
          const key = format(date, "yyyy-MM");
          if (!monthMap.has(key)) {
            monthMap.set(key, { withDiag: 0, withoutDiag: 0 });
            monthOrder.push(key);
          }
          const existing = monthMap.get(key)!;
          const v = dayMap.get(d) ?? { withDiag: 0, withoutDiag: 0 };
          monthMap.set(key, {
            withDiag: existing.withDiag + v.withDiag,
            withoutDiag: existing.withoutDiag + v.withoutDiag,
          });
        }
        setData(
          monthOrder.map((key) => {
            const v = monthMap.get(key)!;
            const date = parse(key + "-01", "yyyy-MM-dd", new Date());
            return {
              label: format(date, "MMMM", { locale: fr }),
              withDiag: Math.round((v.withDiag + v.withoutDiag) * 100) / 100,
              withoutDiag: Math.round(v.withoutDiag * 100) / 100,
            };
          })
        );
      }

      setIsLoading(false);
    };

    fetchData();
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), granularity]);

  return { data, isLoading, isEmpty };
}
