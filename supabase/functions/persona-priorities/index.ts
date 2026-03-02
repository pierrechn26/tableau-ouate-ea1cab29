import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString();

    // Fetch completed sessions from last 30 days WITH first child nested
    const { data: sessions, error: sessionsErr } = await supabase
      .from("diagnostic_sessions")
      .select(`
        id, session_code, persona_code, engagement_score, optin_email, number_of_children,
        is_existing_client,
        diagnostic_children(age, age_range, child_index, skin_concern, has_routine)
      `)
      .eq("status", "termine")
      .gte("created_at", fromDate)
      .limit(10000);

    if (sessionsErr) throw new Error(`Sessions fetch error: ${sessionsErr.message}`);
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ status: "no_data" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign persona codes (ignore P0, recalculate)
    function assignPersonaCode(session: any, children: any[]): string {
      const c1 = children.find((c: any) => c.child_index === 0) || children[0];
      const c2 = children.find((c: any) => c.child_index === 1);
      if (!c1) return "P6";
      if (session.is_existing_client) return c1.skin_concern === "imperfections" ? "P8" : "P9";
      if (session.number_of_children >= 2 && c2 && c1.skin_concern !== c2.skin_concern) return "P5";
      if (c1.has_routine === true) return "P7";
      if (c1.skin_concern === "imperfections" && c1.age_range === "10-11") return "P2";
      if (c1.skin_concern === "imperfections") return "P1";
      if (c1.skin_concern === "atopique") return "P3";
      if (c1.skin_concern === "sensible") return "P4";
      return "P6";
    }

    // Build child map + effective persona code per session
    const childBySession: Record<string, { age_range: string | null; age: number | null }> = {};
    const sessionPersonaCode: Record<string, string> = {};
    for (const s of sessions) {
      const children = ((s as any).diagnostic_children || []) as any[];
      const sortedChildren = children.sort((a: any, b: any) => (a.child_index ?? 0) - (b.child_index ?? 0));
      if (sortedChildren.length > 0) {
        childBySession[s.id] = { age: sortedChildren[0].age, age_range: sortedChildren[0].age_range };
      }
      const effectiveCode = (s.persona_code && s.persona_code !== 'P0')
        ? s.persona_code
        : assignPersonaCode(s, sortedChildren);
      sessionPersonaCode[s.id] = effectiveCode;
    }

    // Fetch orders
    const sessionCodes = sessions.map((s: any) => s.session_code);
    const { data: orders } = await supabase
      .from("shopify_orders")
      .select("diagnostic_session_id, total_price, is_from_diagnostic")
      .in("diagnostic_session_id", sessionCodes);

    // Build order lookup by session_code
    const ordersByCode: Record<string, any[]> = {};
    for (const o of (orders || [])) {
      const sc = o.diagnostic_session_id;
      if (sc) {
        if (!ordersByCode[sc]) ordersByCode[sc] = [];
        ordersByCode[sc].push(o);
      }
    }

    // Global metrics
    const allOrders = orders || [];
    const globalConvRate = sessions.length > 0 ? allOrders.length / sessions.length : 0;
    const globalAOV = allOrders.length > 0
      ? allOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0) / allOrders.length
      : 0;

    // Per-persona aggregation — load active non-pool personas dynamically
    const { data: personasData, error: personasErr } = await supabase
      .from("personas")
      .select("code, is_existing_client_persona")
      .eq("is_active", true)
      .eq("is_pool", false)
      .order("code");
    if (personasErr) throw new Error(`Personas fetch error: ${personasErr.message}`);
    const personaCodes = (personasData || []).map((p: any) => p.code);

    // Build set of existing-client persona codes (excluded from ROI Acquisition)
    const existingClientCodes = new Set<string>(
      (personasData || [])
        .filter((p: any) => p.is_existing_client_persona === true)
        .map((p: any) => p.code)
    );
    const personaStats: Record<string, any> = {};

    for (const code of personaCodes) {
      const pSessions = sessions.filter((s: any) => sessionPersonaCode[s.id] === code);
      const volume = pSessions.length;
      if (volume === 0) continue;

      const pSessionCodes = pSessions.map((s: any) => s.session_code);
      const pOrders = allOrders.filter((o: any) => pSessionCodes.includes(o.diagnostic_session_id));
      const conversions = pOrders.length;
      const totalRevenue = pOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0);
      const aov = conversions > 0 ? totalRevenue / conversions : 0;
      const convRate = conversions / volume;

      // Optin email %
      const optinEmailCount = pSessions.filter((s: any) => s.optin_email === true).length;
      const optinEmailPct = optinEmailCount / volume;

      // Multi-children %
      const multiChildrenCount = pSessions.filter((s: any) => (s.number_of_children || 1) > 1).length;
      const multiChildrenPct = multiChildrenCount / volume;

      // Dominant age range of first child + average age (fallback to age_range midpoint)
      function getAgeEstimate(age: number | null, ageRange: string | null): number | null {
        if (age !== null && age !== undefined) return age;
        if (!ageRange) return null;
        const midpoints: Record<string, number> = { "4-6": 5, "7-9": 8, "10-11": 10.5 };
        return midpoints[ageRange] ?? null;
      }
      const ageRanges: Record<string, number> = {};
      const ages: number[] = [];
      for (const s of pSessions) {
        const child = childBySession[s.id];
        if (child) {
          if (child.age_range) ageRanges[child.age_range] = (ageRanges[child.age_range] || 0) + 1;
          const est = getAgeEstimate(child.age, child.age_range);
          if (est !== null) ages.push(est);
        }
      }
      let dominantAgeRange: string | null = null;
      let maxCount = 0;
      for (const [ar, count] of Object.entries(ageRanges)) {
        if (count > maxCount) { dominantAgeRange = ar; maxCount = count; }
      }
      const avgChildAge = ages.length > 0
        ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10
        : null;

      personaStats[code] = {
        code,
        volume,
        conversions,
        convRate: Math.round(convRate * 1000) / 10,
        aov: Math.round(aov * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        optinEmailPct: Math.round(optinEmailPct * 1000) / 10,
        multiChildrenPct: Math.round(multiChildrenPct * 1000) / 10,
        dominantAgeRange,
        avgChildAge,
      };
    }

    const activePersonas = Object.values(personaStats);
    const globalConvPct = Math.round(globalConvRate * 1000) / 10;

    // === CATÉGORIE 1: Meilleur ROI Acquisition ===
    let bestROI: any = null;
    let bestROIValue = 0;
    for (const p of activePersonas) {
      // Exclude existing client personas from acquisition ROI
      if (existingClientCodes.has(p.code)) continue;
      const valuePerSession = (p.convRate / 100) * p.aov;
      if (valuePerSession > bestROIValue) {
        bestROIValue = valuePerSession;
        bestROI = { ...p, valuePerSession: Math.round(valuePerSession * 100) / 100 };
      }
    }

    // === CATÉGORIE 2: Plus gros levier de croissance ===
    // Exclude the persona already chosen for ROI
    const excludedAfterROI = new Set([bestROI?.code].filter(Boolean));
    let bestGrowth: any = null;
    let bestGrowthCA = 0;
    for (const p of activePersonas) {
      if (excludedAfterROI.has(p.code)) continue;
      if (p.convRate >= globalConvPct || p.volume < 5) continue;
      const caManquant = ((globalConvPct - p.convRate) / 100) * p.volume * p.aov;
      if (caManquant > bestGrowthCA) {
        bestGrowthCA = caManquant;
        bestGrowth = { ...p, caManquant: Math.round(caManquant) };
      }
    }

    // === CATÉGORIE 3: Meilleur potentiel de fidélisation ===
    // Exclude personas already chosen for ROI and Growth
    const excludedAfterGrowth = new Set([bestROI?.code, bestGrowth?.code].filter(Boolean));
    let bestLTV: any = null;
    let bestLTVScore = 0;
    for (const p of activePersonas) {
      if (excludedAfterGrowth.has(p.code)) continue;
      let scoreAge = 2;
      if (p.dominantAgeRange === "4-6") scoreAge = 3;
      else if (p.dominantAgeRange === "7-9") scoreAge = 2;
      else if (p.dominantAgeRange === "10-11") scoreAge = 1;

      const coeffMulti = p.multiChildrenPct > 20 ? 1.5 : 1.0;
      const ltvScore = scoreAge * (p.optinEmailPct / 100) * coeffMulti * (p.aov / 50);

      if (ltvScore > bestLTVScore) {
        bestLTVScore = ltvScore;
        bestLTV = { ...p, ltvScore: Math.round(ltvScore * 100) / 100, scoreAge, coeffMulti };
      }
    }

    return new Response(JSON.stringify({
      status: "ok",
      globalConvRate: globalConvPct,
      globalAOV: Math.round(globalAOV * 100) / 100,
      totalSessions: sessions.length,
      bestROI,
      bestGrowth,
      bestLTV,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[persona-priorities] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
