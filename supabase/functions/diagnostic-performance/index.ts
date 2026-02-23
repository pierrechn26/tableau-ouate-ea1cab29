import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* Is a legacy diagnostic_response "completed"? */
// deno-lint-ignore no-explicit-any
function isLegacyCompleted(row: any): boolean {
  const completedAt = row.metadata && (row.metadata as any).completed_at;
  if (completedAt) return true;
  if (row.email) return true;
  if (row.detected_persona) return true;
  if (row.child_name && row.child_age !== null && row.child_age !== undefined)
    return true;
  return false;
}

type RequestBody = {
  from?: string;
  to?: string;
  includeDetails?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}));
    const from = body.from ? new Date(body.from) : undefined;
    const to = body.to ? new Date(body.to) : undefined;
    const includeDetails = body.includeDetails ?? false;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    /* ====== NEW FORMAT: diagnostic_sessions + children ====== */
    const cutoffDate = "2026-02-08T00:00:00.000Z";

    let sessionsQuery = supabase
      .from("diagnostic_sessions")
      .select("*, diagnostic_children(*)")
      .gte("created_at", cutoffDate)
      .order("created_at", { ascending: false });

    if (from && new Date(from) > new Date(cutoffDate)) sessionsQuery = sessionsQuery.gte("created_at", from.toISOString());
    if (to) sessionsQuery = sessionsQuery.lte("created_at", to.toISOString());

    const { data: sessionsRaw, error: sessionsError } = await sessionsQuery;
    if (sessionsError) console.error("[perf] Sessions query error:", sessionsError);
    // deno-lint-ignore no-explicit-any
    const sessions: any[] = sessionsRaw ?? [];

    let newTotal = 0,
      newCompleted = 0,
      newEmailOptin = 0,
      newSmsOptin = 0,
      newDoubleOptin = 0;
    const newPersonaCounts: Record<string, number> = {};
    // deno-lint-ignore no-explicit-any
    const recentNew: any[] = [];

    for (const s of sessions) {
      newTotal++;
      if (s.status === "termine") newCompleted++;
      if (s.optin_email) newEmailOptin++;
      if (s.optin_sms) newSmsOptin++;
      if (s.optin_email && s.optin_sms) newDoubleOptin++;
      if (s.persona_detected) {
        newPersonaCounts[s.persona_detected] =
          (newPersonaCounts[s.persona_detected] || 0) + 1;
      }
      if (recentNew.length < 10) {
        const children = ((s.diagnostic_children || []) as any[]).sort(
          (a: any, b: any) => (b.age ?? 0) - (a.age ?? 0)
        );
        recentNew.push({
          id: s.id,
          created_at: s.created_at,
          child_name: children[0]?.first_name ?? null,
          child_age: children[0]?.age ?? null,
          detected_persona: s.persona_detected,
          email_optin: s.optin_email,
          sms_optin: s.optin_sms,
        });
      }
    }

    /* ====== LEGACY FORMAT: diagnostic_responses ====== */
    const pageSize = 1000;
    let offset = 0;
    let legacyTotal = 0,
      legacyCompleted = 0,
      legacyEmailOptin = 0,
      legacySmsOptin = 0,
      legacyDoubleOptin = 0;
    const legacyPersonaCounts: Record<string, number> = {};
    // deno-lint-ignore no-explicit-any
    const recentLegacy: any[] = [];
    // deno-lint-ignore no-explicit-any
    const legacyRows: any[] = [];

    while (true) {
      let q = supabase
        .from("diagnostic_responses")
        .select(
          "id, created_at, session_id, child_name, child_age, parent_name, email, phone, email_optin, sms_optin, detected_persona, persona_confidence, metadata, source_url, utm_campaign"
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      q = q.gte("created_at", cutoffDate);
      if (from && new Date(from) > new Date(cutoffDate)) q = q.gte("created_at", from.toISOString());
      if (to) q = q.lte("created_at", to.toISOString());

      const { data, error } = await q;
      if (error) {
        console.error("[perf] Legacy query error:", error);
        break;
      }
      const rows = data ?? [];
      if (rows.length === 0) break;

      for (const row of rows as any[]) {
        legacyTotal++;
        if (isLegacyCompleted(row)) legacyCompleted++;
        if (row.email_optin) legacyEmailOptin++;
        if (row.sms_optin) legacySmsOptin++;
        if (row.email_optin && row.sms_optin) legacyDoubleOptin++;
        if (row.detected_persona) {
          legacyPersonaCounts[row.detected_persona] =
            (legacyPersonaCounts[row.detected_persona] || 0) + 1;
        }
        if (recentLegacy.length < 10) {
          recentLegacy.push({
            id: row.id,
            created_at: row.created_at,
            child_name: row.child_name,
            child_age: row.child_age,
            detected_persona: row.detected_persona,
            email_optin: row.email_optin,
            sms_optin: row.sms_optin,
          });
        }
        if (includeDetails) legacyRows.push(row);
      }
      offset += pageSize;
    }

    /* ====== COMBINE METRICS ====== */
    const totalResponses = newTotal + legacyTotal;
    const completedResponses = newCompleted + legacyCompleted;
    const completionRate =
      totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;
    const emailOptinCount = newEmailOptin + legacyEmailOptin;
    const smsOptinCount = newSmsOptin + legacySmsOptin;
    const doubleOptinCount = newDoubleOptin + legacyDoubleOptin;
    const emailOptinRate =
      completedResponses > 0
        ? (emailOptinCount / completedResponses) * 100
        : 0;
    const smsOptinRate =
      completedResponses > 0
        ? (smsOptinCount / completedResponses) * 100
        : 0;

    const allPersonaCounts: Record<string, number> = { ...legacyPersonaCounts };
    for (const [name, count] of Object.entries(newPersonaCounts)) {
      allPersonaCounts[name] = (allPersonaCounts[name] || 0) + count;
    }
    const personaDistribution = Object.entries(allPersonaCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Recent 10 combined (for DiagnosticsAnalytics backwards compat)
    const responses = [...recentNew, ...recentLegacy]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )
      .slice(0, 10);

    /* ====== FUNNEL DATA (from diagnostic_sessions only) ====== */
    let funnelOptinEmail = 0;
    let funnelRecommendation = 0;
    let funnelAddToCart = 0;
    let funnelCheckout = 0;
    let funnelDurationSum = 0;
    let funnelDurationCount = 0;

    for (const s of sessions) {
      if (s.status === "termine" && s.optin_email) funnelOptinEmail++;
      if (s.recommended_products) funnelRecommendation++;
      if (s.selected_cart_amount != null || s.conversion) funnelAddToCart++;
      if (s.checkout_started || s.conversion) funnelCheckout++;
      if (s.status === "termine" && s.duration_seconds != null) {
        funnelDurationSum += s.duration_seconds;
        funnelDurationCount++;
      }
    }

    // Funnel purchase count & AOV from shopify_orders (single source of truth)
    let funnelPurchaseCount = 0;
    let funnelOrderAmountAvg: number | null = null;
    let orphanOrderCount = 0;
    {
      let ordQ = supabase
        .from("shopify_orders")
        .select("total_price, diagnostic_session_id")
        .eq("is_from_diagnostic", true)
        .gt("total_price", 0);
      if (from) ordQ = ordQ.gte("created_at", from.toISOString());
      if (to) ordQ = ordQ.lte("created_at", to.toISOString());
      const { data: diagOrders, error: diagOrdErr } = await ordQ;
      if (diagOrdErr) console.error("[perf] Diag orders query error:", diagOrdErr);
      const dOrders = diagOrders ?? [];
      funnelPurchaseCount = dOrders.length;
      orphanOrderCount = dOrders.filter((o: any) => !o.diagnostic_session_id).length;
      if (funnelPurchaseCount > 0) {
        const sum = dOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0);
        funnelOrderAmountAvg = Math.round((sum / funnelPurchaseCount) * 100) / 100;
      }
    }

    // Ensure funnel is always decreasing: cart & checkout >= purchases
    funnelAddToCart = Math.max(funnelAddToCart + orphanOrderCount, funnelPurchaseCount);
    funnelCheckout = Math.max(funnelCheckout + orphanOrderCount, funnelPurchaseCount);

    /* ====== DETAILED DIAGNOSTIC FUNNEL ====== */
    const detailedSteps = [
      { label: "Prénom parent", match: (s: any) => s.question_path && (/(?:^|>)1(?:>|$)/.test(s.question_path) || /^0>1/.test(s.question_path)) },
      { label: "Lien avec l'enfant", match: (s: any) => s.question_path && />2(?:>|$)/.test(s.question_path) },
      { label: "Nombre d'enfants", match: (s: any) => s.question_path && />3(?:>|$)/.test(s.question_path) },
      { label: "Info enfant", match: (s: any) => s.question_path && />4(?:>|$)/.test(s.question_path) },
      { label: "Type de peau", match: (s: any) => s.question_path && />5(?:>|$)/.test(s.question_path) },
      { label: "Routine existante", match: (s: any) => s.question_path && />6(?:>|$)/.test(s.question_path) },
      { label: "Questions peau", match: (s: any) => s.question_path && />11(?:>|$)/.test(s.question_path) },
      { label: "Questions IA", match: (s: any) => s.question_path && />12(?:>|$)/.test(s.question_path) },
      { label: "Préférences", match: (s: any) => s.question_path && />13(?:>|$)/.test(s.question_path) },
      { label: "Opt-in", match: (s: any) => s.status === "termine" },
      { label: "Recommandation affichée", match: (s: any) => !!s.recommended_products },
    ];

    const detailedFunnel = detailedSteps.map((step) => {
      let count = 0;
      for (const s of sessions) {
        if (step.match(s)) count++;
      }
      return { label: step.label, count };
    });

    /* ====== REVENUE TIMESERIES from shopify_orders ====== */
    let revenueTimeseries: { date: string; withDiag: number; withoutDiag: number }[] = [];
    {
      let ordersQuery = supabase
        .from("shopify_orders")
        .select("created_at, total_price, is_from_diagnostic")
        .gt("total_price", 0)
        .order("created_at", { ascending: true });

      if (from) ordersQuery = ordersQuery.gte("created_at", from.toISOString());
      if (to) ordersQuery = ordersQuery.lte("created_at", to.toISOString());

      const { data: ordersData, error: ordersError } = await ordersQuery;
      if (ordersError) console.error("[perf] Orders timeseries error:", ordersError);

      const orders = ordersData ?? [];
      // Group by day in Europe/Paris timezone
      const dayMap: Record<string, { withDiag: number; withoutDiag: number }> = {};
      for (const o of orders as any[]) {
        const day = new Date(o.created_at as string).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
        if (!dayMap[day]) dayMap[day] = { withDiag: 0, withoutDiag: 0 };
        const amount = Number(o.total_price) || 0;
        if (o.is_from_diagnostic) {
          dayMap[day].withDiag += amount;
        } else {
          dayMap[day].withoutDiag += amount;
        }
      }
      revenueTimeseries = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date,
          withDiag: Math.round(vals.withDiag * 100) / 100,
          withoutDiag: Math.round(vals.withoutDiag * 100) / 100,
        }));
    }

    /* ====== BUILD RESPONSE ====== */
    const result: Record<string, unknown> = {
      totalResponses,
      completedResponses,
      completionRate,
      emailOptinCount,
      smsOptinCount,
      doubleOptinCount,
      emailOptinRate,
      smsOptinRate,
      personaDistribution,
      responses,
      funnel: {
        started: newTotal,
        completed: newCompleted,
        optinEmail: funnelOptinEmail,
        recommendation: funnelRecommendation,
        addToCart: funnelAddToCart,
        checkout: funnelCheckout,
        purchase: funnelPurchaseCount,
        avgDurationSeconds: funnelDurationCount > 0 ? Math.round(funnelDurationSum / funnelDurationCount) : null,
        avgOrderAmount: funnelOrderAmountAvg,
      },
      detailedFunnel,
      revenueTimeseries,
    };

    /* ====== DETAILED SESSIONS (for Réponses tab) ====== */
    if (includeDetails) {
      // deno-lint-ignore no-explicit-any
      const detailed: any[] = [];

      // Map new sessions
      for (const s of sessions) {
        const children = ((s.diagnostic_children || []) as any[])
          .sort((a: any, b: any) => (b.age ?? 0) - (a.age ?? 0))
          .map((c: any) => ({
            child_index: c.child_index,
            first_name: c.first_name,
            birth_date: c.birth_date,
            age: c.age,
            age_range: c.age_range,
            skin_concern: c.skin_concern,
            has_routine: c.has_routine,
            routine_satisfaction: c.routine_satisfaction,
            routine_issue: c.routine_issue,
            routine_issue_details: c.routine_issue_details,
            has_ouate_products: c.has_ouate_products,
            ouate_products: c.ouate_products,
            existing_routine_description: c.existing_routine_description,
            skin_reactivity: c.skin_reactivity,
            reactivity_details: c.reactivity_details,
            exclude_fragrance: c.exclude_fragrance,
            dynamic_question_1: c.dynamic_question_1,
            dynamic_answer_1: c.dynamic_answer_1,
            dynamic_question_2: c.dynamic_question_2,
            dynamic_answer_2: c.dynamic_answer_2,
            dynamic_question_3: c.dynamic_question_3,
            dynamic_answer_3: c.dynamic_answer_3,
            dynamic_insight_targets: c.dynamic_insight_targets,
          }));

        detailed.push({
          id: s.id,
          session_code: s.session_code,
          created_at: s.created_at,
          status: s.status,
          source: s.source,
          utm_campaign: s.utm_campaign,
          device: s.device,
          user_name: s.user_name,
          relationship: s.relationship,
          email: s.email,
          phone: s.phone,
          optin_email: s.optin_email,
          optin_sms: s.optin_sms,
          number_of_children: s.number_of_children,
          locale: s.locale,
          result_url: s.result_url,
          persona_detected: s.persona_detected,
          persona_matching_score: s.persona_matching_score,
          adapted_tone: s.adapted_tone,
          ai_key_messages: s.ai_key_messages,
          ai_suggested_segment: s.ai_suggested_segment,
          conversion: s.conversion,
          exit_type: s.exit_type,
          existing_ouate_products: s.existing_ouate_products,
          is_existing_client: s.is_existing_client,
          recommended_products: s.recommended_products,
          recommended_cart_amount: s.recommended_cart_amount,
          validated_products: s.validated_products,
          validated_cart_amount: s.validated_cart_amount,
          upsell_potential: s.upsell_potential,
          duration_seconds: s.duration_seconds,
          abandoned_at_step: s.status === "termine" ? null : s.abandoned_at_step,
          question_path: s.question_path,
          back_navigation_count: s.back_navigation_count,
          has_optional_details: s.has_optional_details,
          behavior_tags: s.behavior_tags,
          engagement_score: s.engagement_score,
          routine_size_preference: s.routine_size_preference,
          priorities_ordered: s.priorities_ordered,
          trust_triggers_ordered: s.trust_triggers_ordered,
          content_format_preference: s.content_format_preference,
          persona_code: s.persona_code ?? null,
          matching_score: s.matching_score ?? null,
          children,
          _source: "new",
        });
      }

      // Map legacy responses
      for (const r of legacyRows) {
        // deno-lint-ignore no-explicit-any
        const children: any[] = [];
        if (r.child_name || r.child_age != null) {
          children.push({
            child_index: 0,
            first_name: r.child_name,
            birth_date: null,
            age: r.child_age,
            age_range: null,
            skin_concern: null,
            has_routine: null,
            routine_satisfaction: null,
            routine_issue: null,
            routine_issue_details: null,
            has_ouate_products: null,
            ouate_products: null,
            existing_routine_description: null,
            skin_reactivity: null,
            reactivity_details: null,
            exclude_fragrance: null,
            dynamic_question_1: null,
            dynamic_answer_1: null,
            dynamic_question_2: null,
            dynamic_answer_2: null,
            dynamic_question_3: null,
            dynamic_answer_3: null,
            dynamic_insight_targets: null,
          });
        }

        detailed.push({
          id: r.id,
          session_code: r.session_id,
          created_at: r.created_at,
          status: isLegacyCompleted(r) ? "termine" : "en_cours",
          source: r.source_url,
          utm_campaign: r.utm_campaign,
          device: null,
          user_name: r.parent_name,
          relationship: null,
          email: r.email,
          phone: r.phone,
          optin_email: r.email_optin ?? false,
          optin_sms: r.sms_optin ?? false,
          number_of_children: children.length > 0 ? 1 : null,
          locale: null,
          result_url: null,
          persona_detected: r.detected_persona,
          persona_matching_score: r.persona_confidence
            ? Math.round(r.persona_confidence * 100)
            : null,
          adapted_tone: null,
          ai_key_messages: null,
          ai_suggested_segment: null,
          conversion: false,
          exit_type: null,
          existing_ouate_products: null,
          is_existing_client: false,
          recommended_cart_amount: null,
          validated_cart_amount: null,
          upsell_potential: null,
          duration_seconds: null,
          abandoned_at_step: null,
          question_path: null,
          back_navigation_count: 0,
          has_optional_details: false,
          behavior_tags: null,
          engagement_score: null,
          routine_size_preference: null,
          priorities_ordered: null,
          trust_triggers_ordered: null,
          content_format_preference: null,
          children,
          _source: "legacy",
        });
      }

      // Sort combined by date desc
      detailed.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

      result.sessions = detailed;
      result.categories = {
        identification: { color: "#E8E8E8", label: "Identification & Tracking" },
        persona: { color: "#EDE0F0", label: "Personas & IA" },
        business: { color: "#D5F5E3", label: "Business & Conversion" },
        comportement: { color: "#FEF3C7", label: "Comportement" },
        statiques: { color: "#DBEAFE", label: "Questions statiques" },
        dynamiques: { color: "#FEE2E2", label: "Questions dynamiques IA" },
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[perf] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
