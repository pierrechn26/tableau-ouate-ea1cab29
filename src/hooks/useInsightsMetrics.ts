import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

interface InsightsData {
  routineCompletePercent: number;
  ecartPanier: number | null;
  topProduct: string | null;
  topProductCount: number;
  clientsExistantsPercent: number;
  isLoading: boolean;
}

export function useInsightsMetrics(dateRange?: DateRange): InsightsData {
  const [data, setData] = useState<InsightsData>({
    routineCompletePercent: 0,
    ecartPanier: null,
    topProduct: null,
    topProductCount: 0,
    clientsExistantsPercent: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetch = async () => {
      setData((d) => ({ ...d, isLoading: true }));

      const from = dateRange?.from ?? subDays(new Date(), 29);
      const toRaw = dateRange?.to ?? new Date();
      const to = new Date(toRaw);
      to.setHours(23, 59, 59, 999);
      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      // Fetch completed sessions with relevant fields
      const { data: sessions } = await supabase
        .from("diagnostic_sessions")
        .select("recommended_products, validated_products, is_existing_client, recommended_cart_amount, conversion")
        .eq("status", "termine")
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .range(0, 9999);

      // Fetch diagnostic orders
      const { data: diagOrders } = await supabase
        .from("shopify_orders")
        .select("total_price, diagnostic_session_id")
        .eq("is_from_diagnostic", true)
        .gt("total_price", 0)
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .range(0, 9999);

      const list = sessions || [];
      const total = list.length;

      // Helper : split rétrocompatible — supporte " | " (nouveau) et ", " (ancien)
      // Le split sur ", " (virgule+espace) évite de couper "1,2,3" dans les noms de produits
      const splitProducts = (str: string): string[] => {
        if (str.includes(" | ")) return str.split(" | ").map(p => p.trim()).filter(Boolean);
        return str.split(", ").map(p => p.trim()).filter(Boolean);
      };

      // 1. Routine complète
      const routineCount = list.filter((s) => {
        if (!s.recommended_products) return false;
        return splitProducts(s.recommended_products).length >= 3;
      }).length;
      const routineCompletePercent = total > 0 ? (routineCount / total) * 100 : 0;

      // 2. Écart panier (only on actual orders)
      const ordersList = diagOrders || [];
      const avgOrderPrice =
        ordersList.length > 0
          ? ordersList.reduce((s, o) => s + (Number(o.total_price) || 0), 0) / ordersList.length
          : null;

      const convertedWithCart = list.filter(
        (s) => s.conversion && s.recommended_cart_amount != null
      );
      const avgRecommended =
        convertedWithCart.length > 0
          ? convertedWithCart.reduce((s, o) => s + (Number(o.recommended_cart_amount) || 0), 0) /
            convertedWithCart.length
          : null;

      const ecartPanier =
        avgOrderPrice != null && avgRecommended != null
          ? avgOrderPrice - avgRecommended
          : null;

      // 3. Top produit ACHETÉ (from validated_products on converted sessions)
      const productCounts: Record<string, number> = {};
      list.forEach((s) => {
        if (!s.conversion || !s.validated_products) return;
        splitProducts(s.validated_products).forEach((p) => {
          if (p) productCounts[p] = (productCounts[p] || 0) + 1;
        });
      });
      let topProduct: string | null = null;
      let topProductCount = 0;
      for (const [name, count] of Object.entries(productCounts)) {
        if (count > topProductCount) {
          topProduct = name;
          topProductCount = count;
        }
      }

      // 4. Nouveaux clients parmi les commandes diagnostic
      const convertedSessions = list.filter((s) => s.conversion);
      const newClientsCount = convertedSessions.filter((s) => !s.is_existing_client).length;
      const newClientsPercent = convertedSessions.length > 0 ? (newClientsCount / convertedSessions.length) * 100 : 0;

      setData({
        routineCompletePercent,
        ecartPanier,
        topProduct,
        topProductCount,
        clientsExistantsPercent: newClientsPercent,
        isLoading: false,
      });
    };

    fetch();
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  return data;
}
