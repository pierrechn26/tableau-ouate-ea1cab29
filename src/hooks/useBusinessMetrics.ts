import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface BusinessMetricsData {
  // Diagnostic data (from diagnostic_sessions — single source of truth)
  revenueDiag: number;
  aovDiag: number;
  orderCountDiag: number;

  // Non-diagnostic data (from shopify_orders)
  revenueNonDiag: number;
  aovNonDiag: number;
  orderCountNonDiag: number;

  // Totals
  revenueTotal: number;
  orderCountTotal: number;

  // GA4 data for conversion rates
  siteSessions: number;
  diagnosticPageViews: number;

  isLoading: boolean;
}

export function useBusinessMetrics(dateRange?: DateRange): BusinessMetricsData {
  const [data, setData] = useState<BusinessMetricsData>({
    revenueDiag: 0,
    aovDiag: 0,
    orderCountDiag: 0,
    revenueNonDiag: 0,
    aovNonDiag: 0,
    orderCountNonDiag: 0,
    revenueTotal: 0,
    orderCountTotal: 0,
    siteSessions: 0,
    diagnosticPageViews: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      setData((d) => ({ ...d, isLoading: true }));

      const from = dateRange?.from;
      const toRaw = dateRange?.to;
      // Align with useDiagnosticStats: include the full end day
      const to = toRaw ? new Date(toRaw) : undefined;
      if (to) to.setHours(23, 59, 59, 999);

      const fromISO = from ? from.toISOString() : undefined;
      const toISO = to ? to.toISOString() : undefined;

      // For GA4 fallback when no range: use a wide window (start of 2026)
      const ga4From = from ?? new Date("2026-01-01T00:00:00.000Z");
      const ga4To = to ?? new Date();

      // Paginate to bypass the PostgREST 1000-row server cap
      const PAGE_SIZE = 1000;
      let allOrdersList: { total_price: number | null; is_from_diagnostic: boolean | null }[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const from_idx = page * PAGE_SIZE;
        let q = supabase
          .from("shopify_orders")
          .select("total_price, is_from_diagnostic")
          .gt("total_price", 0)
          .order("created_at", { ascending: true })
          .range(from_idx, from_idx + PAGE_SIZE - 1);
        if (fromISO) q = q.gte("created_at", fromISO);
        if (toISO) q = q.lte("created_at", toISO);
        const { data: batch } = await q;
        if (!batch || batch.length === 0) break;
        allOrdersList = allOrdersList.concat(batch);
        hasMore = batch.length === PAGE_SIZE;
        page++;
      }
      

      // GA4 data for conversion rate denominators
      const startDate = format(ga4From, "yyyy-MM-dd");
      const endDate = format(ga4To, "yyyy-MM-dd");
      let siteSessions = 0;
      let diagnosticPageViews = 0;

      try {
        const { data: ga4Data, error: ga4Error } = await supabase.functions.invoke("ga4-analytics", {
          body: { start_date: startDate, end_date: endDate },
        });
        if (!ga4Error && ga4Data) {
          siteSessions = ga4Data.site_sessions || 0;
          diagnosticPageViews = ga4Data.diagnostic_page_sessions || 0;
        }
      } catch (err) {
        console.error("GA4 fetch error in useBusinessMetrics:", err);
      }

      // allOrders already contains the paginated results

      // Diagnostic metrics from shopify_orders
      const diagOrders = allOrdersList.filter((o: any) => o.is_from_diagnostic);
      const orderCountDiag = diagOrders.length;
      const revenueDiag = diagOrders.reduce(
        (s, o) => s + (Number(o.total_price) || 0),
        0
      );
      const aovDiag = orderCountDiag > 0 ? revenueDiag / orderCountDiag : 0;

      // Non-diagnostic metrics from shopify_orders
      const nonDiag = allOrdersList.filter((o: any) => !o.is_from_diagnostic);
      const orderCountNonDiag = nonDiag.length;
      const revenueNonDiag = nonDiag.reduce(
        (s, o) => s + (Number(o.total_price) || 0),
        0
      );
      const aovNonDiag = orderCountNonDiag > 0 ? revenueNonDiag / orderCountNonDiag : 0;

      // Total
      const orderCountTotal = allOrdersList.length;
      const revenueTotal = allOrdersList.reduce(
        (s, o) => s + (Number(o.total_price) || 0),
        0
      );

      setData({
        revenueDiag,
        aovDiag,
        orderCountDiag,
        revenueNonDiag,
        aovNonDiag,
        orderCountNonDiag,
        revenueTotal,
        orderCountTotal,
        siteSessions,
        diagnosticPageViews,
        isLoading: false,
      });
    };

    fetchData();
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  return data;
}
