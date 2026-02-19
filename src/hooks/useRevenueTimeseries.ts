import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { subDays, startOfWeek, getISOWeek, format, parse } from "date-fns";
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
}

export function useRevenueTimeseries(
  dateRange?: DateRange,
  granularity: Granularity = "day"
): UseRevenueTimeseriesResult {
  const [data, setData] = useState<RevenuePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      const from = dateRange?.from ?? subDays(new Date(), 29);
      const toRaw = dateRange?.to ?? new Date();
      const to = new Date(toRaw);
      to.setHours(23, 59, 59, 999);

      const { data: result, error } = await supabase.functions.invoke(
        "diagnostic-performance",
        { body: { from: from.toISOString(), to: to.toISOString() } }
      );

      if (error || !result?.revenueTimeseries) {
        setData([]);
        setIsLoading(false);
        return;
      }

      const raw: { date: string; withDiag: number; withoutDiag: number }[] =
        result.revenueTimeseries;

      // Fill missing days within range
      const dayMap = new Map<string, { withDiag: number; withoutDiag: number }>();
      for (const r of raw) {
        dayMap.set(r.date, { withDiag: r.withDiag, withoutDiag: r.withoutDiag });
      }

      const allDays: string[] = [];
      const cur = new Date(from);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(0, 0, 0, 0);
      while (cur <= end) {
        allDays.push(cur.toISOString().substring(0, 10));
        cur.setDate(cur.getDate() + 1);
      }

      // Aggregate based on granularity
      if (granularity === "day") {
        setData(
          allDays.map((d) => {
            const v = dayMap.get(d) ?? { withDiag: 0, withoutDiag: 0 };
            const date = parse(d, "yyyy-MM-dd", new Date());
            return {
              label: format(date, "dd/MM"),
              withDiag: v.withDiag,
              withoutDiag: v.withoutDiag,
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
            withDiag: Math.round(v.withDiag * 100) / 100,
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
              withDiag: Math.round(v.withDiag * 100) / 100,
              withoutDiag: Math.round(v.withoutDiag * 100) / 100,
            };
          })
        );
      }

      setIsLoading(false);
    };

    fetchData();
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), granularity]);

  return { data, isLoading };
}
