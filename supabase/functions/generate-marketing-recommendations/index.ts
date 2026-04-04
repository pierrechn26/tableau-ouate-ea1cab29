// ============================================================
// generate-marketing-recommendations — V3 (API layer)
// GET  → retourne toutes les recommandations actives + quota
// POST → update_status / submit_feedback
// La GÉNÉRATION est maintenant dans weekly-recommendations
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function reportEdgeFunctionError(functionName: string, error: unknown, context?: Record<string, unknown>) {
  try {
    const apiKey = Deno.env.get("MONITORING_API_KEY");
    if (!apiKey) return;
    await fetch("https://srzbcuhwrpkfhubbbeuw.supabase.co/functions/v1/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-monitoring-key": apiKey },
      body: JSON.stringify({
        errors: [{
          source: "edge_function", severity: context?.severity || "error",
          error_type: context?.type || "internal_error", function_name: functionName,
          message: (error as any)?.message || String(error),
          stack_trace: (error as any)?.stack || "",
          context: { ...context, timestamp: new Date().toISOString() },
        }],
      }),
    });
  } catch { /* fire-and-forget */ }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROJECT_ID = "ouate";

// ── Quota helper ──────────────────────────────────────────────────────

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getQuota(supabase: any) {
  const { data: planData } = await supabase
    .from("client_plan")
    .select("plan, recos_monthly_limit")
    .eq("project_id", PROJECT_ID)
    .maybeSingle();

  const planLimits: Record<string, number> = { starter: 24, growth: 60, scale: 240 };
  const planName = planData?.plan ?? "growth";
  const monthlyLimit = planData?.recos_monthly_limit ?? planLimits[planName] ?? 60;

  const now = new Date();
  const utcMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const utcNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

  const { count: usedCount } = await supabase
    .from("marketing_recommendations")
    .select("*", { count: "exact", head: true })
    .gte("generated_at", utcMonthStart)
    .lt("generated_at", utcNextMonth);

  const totalGenerated = usedCount ?? 0;

  const monthYear = getCurrentMonthYear();
  const { data: usageData } = await supabase
    .from("recommendation_usage")
    .select("generations_log")
    .eq("project_id", PROJECT_ID)
    .eq("month_year", monthYear)
    .maybeSingle();

  return {
    total_generated: totalGenerated,
    monthly_limit: monthlyLimit,
    remaining: Math.max(0, monthlyLimit - totalGenerated),
    plan: planName,
    generations_log: usageData?.generations_log || [],
  };
}

// ── Feedback score calculation ────────────────────────────────────────

function calculateFeedbackScore(results: any, kpiAttendu: any): string {
  if (!results || !kpiAttendu) return "average";

  // Extract numeric values from results and KPIs for comparison
  const comparisons: number[] = []; // ratios of actual/expected

  // Generic comparison: try to match keys
  for (const key of Object.keys(results)) {
    const actual = parseFloat(String(results[key]).replace(/[^0-9.,]/g, "").replace(",", "."));
    const expected = kpiAttendu[key];
    if (isNaN(actual) || !expected) continue;
    const expectedNum = parseFloat(String(expected).replace(/[^0-9.,]/g, "").replace(",", "."));
    if (isNaN(expectedNum) || expectedNum === 0) continue;
    comparisons.push(actual / expectedNum);
  }

  if (comparisons.length === 0) return "average";

  const avgRatio = comparisons.reduce((a, b) => a + b, 0) / comparisons.length;

  if (avgRatio >= 1.2) return "good";
  if (avgRatio <= 0.8) return "poor";
  return "average";
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ════════════════════════════════════════════════════════
    // GET — Retourne toutes les recommandations actives + quota
    // ════════════════════════════════════════════════════════
    if (req.method === "GET") {
      const [recsResult, quota, intelligenceResult] = await Promise.all([
        supabase
          .from("marketing_recommendations")
          .select("*, generation_status")
          .eq("status", "active")
          .order("generated_at", { ascending: false }),
        getQuota(supabase),
        supabase
          .from("market_intelligence")
          .select("month_year, status, updated_at, generation_duration_ms")
          .eq("project_id", PROJECT_ID)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (recsResult.error) throw recsResult.error;

      return new Response(
        JSON.stringify({
          recommendations: recsResult.data || [],
          quota,
          intelligence: intelligenceResult.data || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ════════════════════════════════════════════════════════
    // POST — Actions sur les recommandations
    // ════════════════════════════════════════════════════════
    if (req.method === "POST") {
      let body: any = {};
      try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
      } catch {}

      const { action, recommendation_id } = body;

      if (!action || !recommendation_id) {
        return new Response(
          JSON.stringify({ error: "action and recommendation_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── UPDATE STATUS ──────────────────────────────────────
      if (action === "update_status") {
        const { status } = body;
        if (!["todo", "in_progress", "done"].includes(status)) {
          return new Response(
            JSON.stringify({ error: "Invalid status. Must be: todo, in_progress, done" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updatePayload: any = { action_status: status };
        if (status === "done") {
          updatePayload.completed_at = new Date().toISOString();
        } else {
          updatePayload.completed_at = null;
        }

        const { error } = await supabase
          .from("marketing_recommendations")
          .update(updatePayload)
          .eq("id", recommendation_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, recommendation_id, status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── SUBMIT FEEDBACK ────────────────────────────────────
      if (action === "submit_feedback") {
        const { results, notes } = body;

        // Get the recommendation to access kpi_attendu
        const { data: rec, error: recErr } = await supabase
          .from("marketing_recommendations")
          .select("targeting, content")
          .eq("id", recommendation_id)
          .single();

        if (recErr || !rec) {
          return new Response(
            JSON.stringify({ error: "Recommendation not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate feedback_score
        const kpiAttendu = rec.targeting?.kpi_attendu || {};
        const feedbackScore = calculateFeedbackScore(results, kpiAttendu);

        const { error } = await supabase
          .from("marketing_recommendations")
          .update({
            feedback_results: results || {},
            feedback_score: feedbackScore,
            feedback_notes: notes || null,
            feedback_entered_at: new Date().toISOString(),
            action_status: "done",
            completed_at: new Date().toISOString(),
          })
          .eq("id", recommendation_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, recommendation_id, feedback_score: feedbackScore }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}. Use: update_status, submit_feedback` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[generate-marketing] Unhandled error:", err);
    reportEdgeFunctionError("generate-marketing-recommendations", err, { type: "internal_error", severity: "error" });
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
