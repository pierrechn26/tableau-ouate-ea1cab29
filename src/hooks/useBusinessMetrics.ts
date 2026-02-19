import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";

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

      const from = dateRange?.from ?? subDays(new Date(), 29);
      const to = dateRange?.to ?? new Date();

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      // 1. Diagnostic conversions from diagnostic_sessions (source of truth)
      const { data: diagSessions } = await supabase
        .from("diagnostic_sessions")
        .select("validated_cart_amount")
        .eq("conversion", true)
        .gte("created_at", fromISO)
        .lte("created_at", toISO);

      // 2. Non-diagnostic orders from shopify_orders (exclude 0€)
      const { data: nonDiagOrders } = await supabase
        .from("shopify_orders")
        .select("total_price")
        .eq("is_from_diagnostic", false)
        .gt("total_price", 0)
        .gte("created_at", fromISO)
        .lte("created_at", toISO);

      // 3. GA4 data for conversion rate denominators
      const startDate = format(from, "yyyy-MM-dd");
      const endDate = format(to, "yyyy-MM-dd");
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

      // Calculate diagnostic metrics
      const sessions = diagSessions || [];
      const orderCountDiag = sessions.length;
      const revenueDiag = sessions.reduce(
        (s, o) => s + (Number(o.validated_cart_amount) || 0),
        0
      );
      const aovDiag = orderCountDiag > 0 ? revenueDiag / orderCountDiag : 0;

      // Calculate non-diagnostic metrics
      const nonDiag = nonDiagOrders || [];
      const orderCountNonDiag = nonDiag.length;
      const revenueNonDiag = nonDiag.reduce(
        (s, o) => s + (Number(o.total_price) || 0),
        0
      );
      const aovNonDiag = orderCountNonDiag > 0 ? revenueNonDiag / orderCountNonDiag : 0;

      setData({
        revenueDiag,
        aovDiag,
        orderCountDiag,
        revenueNonDiag,
        aovNonDiag,
        orderCountNonDiag,
        revenueTotal: revenueDiag + revenueNonDiag,
        orderCountTotal: orderCountDiag + orderCountNonDiag,
        siteSessions,
        diagnosticPageViews,
        isLoading: false,
      });
    };

    fetchData();
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  return data;
}
