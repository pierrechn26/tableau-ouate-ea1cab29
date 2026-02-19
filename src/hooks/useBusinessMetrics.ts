import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

interface BusinessMetricsData {
  revenueDiag: number;
  revenueDiagPrev: number;
  revenueTotal: number;
  revenueTotalPrev: number;
  aovDiag: number;
  aovNonDiag: number;
  aovDiagPrev: number;
  orderCountDiag: number;
  completedSessions: number;
  convRatePrev: number;
  isLoading: boolean;
}

export function useBusinessMetrics(dateRange?: DateRange): BusinessMetricsData {
  const [data, setData] = useState<BusinessMetricsData>({
    revenueDiag: 0,
    revenueDiagPrev: 0,
    revenueTotal: 0,
    revenueTotalPrev: 0,
    aovDiag: 0,
    aovNonDiag: 0,
    aovDiagPrev: 0,
    orderCountDiag: 0,
    completedSessions: 0,
    convRatePrev: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      setData((d) => ({ ...d, isLoading: true }));

      const from = dateRange?.from ?? subDays(new Date(), 29);
      const to = dateRange?.to ?? new Date();

      // Calculate previous period of same length
      const periodMs = to.getTime() - from.getTime();
      const prevFrom = new Date(from.getTime() - periodMs);
      const prevTo = new Date(from.getTime() - 1);

      const fromISO = from.toISOString();
      const toISO = to.toISOString();
      const prevFromISO = prevFrom.toISOString();
      const prevToISO = prevTo.toISOString();

      // Fetch current period orders
      const { data: currentOrders } = await supabase
        .from("shopify_orders")
        .select("total_price, is_from_diagnostic")
        .gte("created_at", fromISO)
        .lte("created_at", toISO);

      // Fetch previous period orders
      const { data: prevOrders } = await supabase
        .from("shopify_orders")
        .select("total_price, is_from_diagnostic")
        .gte("created_at", prevFromISO)
        .lte("created_at", prevToISO);

      // Fetch completed sessions count for conversion rate
      const { count: completedSessions } = await supabase
        .from("diagnostic_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "termine")
        .gte("created_at", fromISO)
        .lte("created_at", toISO);

      const { count: prevCompletedSessions } = await supabase
        .from("diagnostic_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "termine")
        .gte("created_at", prevFromISO)
        .lte("created_at", prevToISO);

      const orders = currentOrders || [];
      const prev = prevOrders || [];

      const diagOrders = orders.filter((o) => o.is_from_diagnostic);
      const nonDiagOrders = orders.filter((o) => !o.is_from_diagnostic);
      const prevDiagOrders = prev.filter((o) => o.is_from_diagnostic);

      const sum = (arr: { total_price: number | null }[]) =>
        arr.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
      const avg = (arr: { total_price: number | null }[]) =>
        arr.length > 0 ? sum(arr) / arr.length : 0;

      const prevDiagCount = prevDiagOrders.length;
      const prevCompleted = prevCompletedSessions || 0;
      const convRatePrev = prevCompleted > 0 ? (prevDiagCount / prevCompleted) * 100 : 0;

      setData({
        revenueDiag: sum(diagOrders),
        revenueDiagPrev: sum(prevDiagOrders),
        revenueTotal: sum(orders),
        revenueTotalPrev: sum(prev),
        aovDiag: avg(diagOrders),
        aovNonDiag: avg(nonDiagOrders),
        aovDiagPrev: avg(prevDiagOrders),
        orderCountDiag: diagOrders.length,
        completedSessions: completedSessions || 0,
        convRatePrev,
        isLoading: false,
      });
    };

    fetchData();
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  return data;
}
