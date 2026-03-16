import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://app.ask-it.ai",
  "https://srzbcuhwrpkfhubbbeuw.supabase.co",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate API key
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("USAGE_STATS_API_KEY");

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Count user messages (questions) this month
    const { count: questionsAsked, error: countError } = await supabase
      .from("aski_messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", startOfMonth);

    if (countError) throw countError;

    // Sum tokens used by assistant messages this month (legacy field)
    const { data: tokenData, error: tokenError } = await supabase
      .from("aski_messages")
      .select("tokens_used")
      .eq("role", "assistant")
      .gte("created_at", startOfMonth);

    if (tokenError) throw tokenError;

    const tokensUsed = (tokenData ?? []).reduce(
      (sum, row) => sum + (row.tokens_used ?? 0),
      0
    );

    // Count diagnostic sessions this month
    const { count: diagnosticSessions, error: sessionsError } = await supabase
      .from("diagnostic_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth);

    if (sessionsError) throw sessionsError;

    // Detailed API usage grouped by edge_function / provider / model (this month)
    const { data: usageData, error: usageError } = await supabase
      .from("api_usage_logs")
      .select("edge_function, api_provider, model, input_tokens, output_tokens, total_tokens, tokens_used, api_calls")
      .gte("created_at", startOfMonth);

    if (usageError) throw usageError;

    // Group in-memory (avoid raw SQL)
    const groupMap: Record<string, {
      edge_function: string;
      api_provider: string;
      model: string;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      calls: number;
    }> = {};

    for (const row of usageData ?? []) {
      const key = `${row.edge_function}||${row.api_provider}||${row.model}`;
      if (!groupMap[key]) {
        groupMap[key] = {
          edge_function: row.edge_function,
          api_provider: row.api_provider,
          model: row.model ?? "unknown",
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          calls: 0,
        };
      }
      const g = groupMap[key];
      g.input_tokens += row.input_tokens ?? 0;
      g.output_tokens += row.output_tokens ?? 0;
      // Prefer total_tokens; fall back to legacy tokens_used
      g.total_tokens += row.total_tokens ?? row.tokens_used ?? 0;
      g.calls += row.api_calls ?? 1;
    }

    const apiUsage = Object.values(groupMap).sort((a, b) => b.total_tokens - a.total_tokens);

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return new Response(
      JSON.stringify({
        success: true,
        period,
        questions_asked: questionsAsked ?? 0,
        tokens_used: tokensUsed,
        diagnostic_sessions: diagnosticSessions ?? 0,
        api_usage: apiUsage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
