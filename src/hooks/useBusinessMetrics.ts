import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

interface BusinessMetricsData {
  revenueDiag: number;
  revenueNonDiag: number;
  revenueTotal: number;
  aovDiag: number;
  aovNonDiag: number;
  orderCountDiag: number;
  orderCountNonDiag: number;
  orderCountTotal: number;
  completedSessions: number;
  isLoading: boolean;
}

export function useBusinessMetrics(dateRange?: DateRange): BusinessMetricsData {
  const [data, setData] = useState<BusinessMetricsData>({
    revenueDiag: 0,
    revenueNonDiag: 0,
    revenueTotal: 0,
    aovDiag: 0,
    aovNonDiag: 0,
    orderCountDiag: 0,
    orderCountNonDiag: 0,
    orderCountTotal: 0,
    completedSessions: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      setData((d) => ({ ...d, isLoading: true }));

      const from = dateRange?.from ?? subDays(new Date(), 29);
      const to = dateRange?.to ?? new Date();

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      // Fetch current period orders (exclude 0€ orders)
      const { data: currentOrders } = await supabase
        .from("shopify_orders")
        .select("total_price, is_from_diagnostic")
        .gt("total_price", 0)
        .gte("created_at", fromISO)
        .lte("created_at", toISO);

      // Fetch completed sessions count for conversion rate
      const { count: completedSessions } = await supabase
        .from("diagnostic_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "termine")
        .gte("created_at", fromISO)
        .lte("created_at", toISO);

      const orders = currentOrders || [];

      const diagOrders = orders.filter((o) => o.is_from_diagnostic);
      const nonDiagOrders = orders.filter((o) => !o.is_from_diagnostic);

      const sum = (arr: { total_price: number | null }[]) =>
        arr.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
      const avg = (arr: { total_price: number | null }[]) =>
        arr.length > 0 ? sum(arr) / arr.length : 0;

      setData({
        revenueDiag: sum(diagOrders),
        revenueNonDiag: sum(nonDiagOrders),
        revenueTotal: sum(orders),
        aovDiag: avg(diagOrders),
        aovNonDiag: avg(nonDiagOrders),
        orderCountDiag: diagOrders.length,
        orderCountNonDiag: nonDiagOrders.length,
        orderCountTotal: orders.length,
        completedSessions: completedSessions || 0,
        isLoading: false,
      });
    };

    fetchData();
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  return data;
}
