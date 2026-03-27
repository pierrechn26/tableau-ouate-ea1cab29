import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://app.ask-it.ai",
  "https://srzbcuhwrpkfhubbbeuw.supabase.co",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function getMonthBounds(period: string) {
  const [y, m] = period.split("-").map(Number);
  const startOfMonth = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const nextMonthStart = new Date(Date.UTC(y, m, 1)).toISOString();
  return { startOfMonth, nextMonthStart };
}

async function fetchMonthData(supabase: any, startOfMonth: string, nextMonthStart: string) {
  const [
    { count: questionsAsked, error: countError },
    { data: tokenData, error: tokenError },
    { count: diagnosticSessions, error: sessionsError },
    { count: marketingRecommendations, error: marketingError },
    { data: usageData, error: usageError },
  ] = await Promise.all([
    supabase.from("aski_messages").select("*", { count: "exact", head: true }).eq("role", "user").gte("created_at", startOfMonth).lt("created_at", nextMonthStart),
    supabase.from("aski_messages").select("tokens_used").eq("role", "assistant").gte("created_at", startOfMonth).lt("created_at", nextMonthStart),
    supabase.from("diagnostic_sessions").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth).lt("created_at", nextMonthStart),
    supabase.from("marketing_recommendations").select("*", { count: "exact", head: true }).gte("generated_at", startOfMonth).lt("generated_at", nextMonthStart),
    supabase.from("api_usage_logs").select("edge_function, api_provider, model, input_tokens, output_tokens, total_tokens, tokens_used, api_calls").gte("created_at", startOfMonth).lt("created_at", nextMonthStart),
  ]);

  if (countError) throw countError;
  if (tokenError) throw tokenError;
  if (sessionsError) throw sessionsError;
  if (marketingError) throw marketingError;
  if (usageError) throw usageError;

  const tokensUsed = (tokenData ?? []).reduce((sum: number, row: any) => sum + (row.tokens_used ?? 0), 0);

  const groupMap: Record<string, any> = {};
  for (const row of usageData ?? []) {
    const key = `${row.edge_function}||${row.api_provider}||${row.model}`;
    if (!groupMap[key]) {
      groupMap[key] = { edge_function: row.edge_function, api_provider: row.api_provider, model: row.model ?? "unknown", input_tokens: 0, output_tokens: 0, total_tokens: 0, calls: 0 };
    }
    const g = groupMap[key];
    g.input_tokens += row.input_tokens ?? 0;
    g.output_tokens += row.output_tokens ?? 0;
    g.total_tokens += row.total_tokens ?? row.tokens_used ?? 0;
    g.calls += row.api_calls ?? 1;
  }

  return {
    questions_asked: questionsAsked ?? 0,
    tokens_used: tokensUsed,
    diagnostic_sessions: diagnosticSessions ?? 0,
    marketing_recommendations: marketingRecommendations ?? 0,
    api_usage: Object.values(groupMap).sort((a: any, b: any) => b.total_tokens - a.total_tokens),
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("USAGE_STATS_API_KEY");
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body OK */ }
    const requestedMonth = body.month;

    // Mode "all" : retourne les données groupées par mois
    if (requestedMonth === "all") {
      const { data: firstLog } = await supabase.from("api_usage_logs").select("created_at").order("created_at", { ascending: true }).limit(1);
      const { data: firstSession } = await supabase.from("diagnostic_sessions").select("created_at").order("created_at", { ascending: true }).limit(1);
      const earliest = [firstLog?.[0]?.created_at, firstSession?.[0]?.created_at].filter(Boolean).sort()[0];
      if (!earliest) {
        return new Response(JSON.stringify({ success: true, months: {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const now = new Date();
      const startDate = new Date(earliest);
      const months: Record<string, any> = {};
      let y = startDate.getUTCFullYear(), m = startDate.getUTCMonth();
      while (y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth())) {
        const period = `${y}-${String(m + 1).padStart(2, "0")}`;
        const { startOfMonth, nextMonthStart } = getMonthBounds(period);
        const data = await fetchMonthData(supabase, startOfMonth, nextMonthStart);
        months[period] = { ...data, period };
        m++;
        if (m > 11) { m = 0; y++; }
      }
      return new Response(JSON.stringify({ success: true, months }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mode mois spécifique ou mois en cours
    const now = new Date();
    const period = requestedMonth || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const { startOfMonth, nextMonthStart } = getMonthBounds(period);
    const data = await fetchMonthData(supabase, startOfMonth, nextMonthStart);

    return new Response(JSON.stringify({ success: true, period, ...data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
