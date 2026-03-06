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
    // Count user messages (questions) this month
    const { count: questionsAsked, error: countError } = await supabase
      .from("aski_messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    if (countError) throw countError;

    // Sum tokens used by assistant messages this month
    const { data: tokenData, error: tokenError } = await supabase
      .from("aski_messages")
      .select("tokens_used")
      .eq("role", "assistant")
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    if (tokenError) throw tokenError;

    const tokensUsed = (tokenData ?? []).reduce(
      (sum, row) => sum + (row.tokens_used ?? 0),
      0
    );

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return new Response(
      JSON.stringify({
        success: true,
        period,
        questions_asked: questionsAsked ?? 0,
        tokens_used: tokensUsed,
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
