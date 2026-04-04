// ============================================================
// weekly-recommendations — Cron hebdomadaire (lundi 07:00 UTC)
// Option C : pré-calcule uniquement les BRIEFS (1 appel Sonnet)
// Le contenu complet est généré au clic via generate-recommendation-content
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROJECT_ID = "ouate";

// ── Helpers ────────────────────────────────────────────────────────────

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

async function reportError(functionName: string, error: unknown, context?: Record<string, unknown>) {
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

async function logUsage(
  supabase: any, provider: string, model: string,
  usage: { input_tokens: number; output_tokens: number; total_tokens: number },
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase.from("api_usage_logs").insert({
      edge_function: "weekly-recommendations",
      api_provider: provider,
      model,
      tokens_used: usage.total_tokens,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
      api_calls: 1,
      metadata: metadata || {},
    });
    if (error) console.error("LOG INSERT ERROR:", error.message);
  } catch (e: any) {
    console.error("LOG EXCEPTION:", e.message);
  }
}

// ── Claude Sonnet ─────────────────────────────────────────────────

const SONNET_MODEL = "claude-sonnet-4-20250514";

async function callSonnet(
  systemPrompt: string, userPrompt: string, maxTokens: number, timeoutMs = 60000
): Promise<{ text: string; inputTokens: number; outputTokens: number; totalTokens: number; model: string }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: SONNET_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sonnet error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;
    const actualModel = data.model || SONNET_MODEL;
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Empty response from Sonnet");
    console.log(`[weekly-recs] Sonnet: ${inputTokens} in / ${outputTokens} out tokens`);
    return { text, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, model: actualModel };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const startTime = Date.now();
  let body: any = {};
  try { const t = await req.text(); if (t) body = JSON.parse(t); } catch {}

  const isForce = body.force === true;
  console.log(`[weekly-recs] Starting briefs pre-calculation. force=${isForce}`);

  try {
    // ════════════════════════════════════════════════════════
    // STEP 1 : CHARGEMENT DU CONTEXTE (~2s)
    // ════════════════════════════════════════════════════════

    const weekStart = getMonday(new Date());

    // A) Plan client
    const { data: planData } = await supabase
      .from("client_plan")
      .select("plan, recos_monthly_limit")
      .eq("project_id", PROJECT_ID)
      .maybeSingle();

    const planLimits: Record<string, { weekly: number; monthly: number }> = {
      starter: { weekly: 6, monthly: 24 },
      growth: { weekly: 15, monthly: 60 },
      scale: { weekly: 60, monthly: 240 },
    };
    const planName = planData?.plan ?? "growth";
    const limits = planLimits[planName] ?? planLimits.growth;
    const monthlyLimit = planData?.recos_monthly_limit ?? limits.monthly;
    const weeklyTarget = limits.weekly;

    // B) Check how many V3 recos already exist for THIS week
    const { data: existingRecos } = await supabase
      .from("marketing_recommendations")
      .select("id, category")
      .eq("week_start", weekStart)
      .eq("recommendation_version", 3)
      .eq("status", "active");

    const existingCount = existingRecos?.length ?? 0;

    if (existingCount >= weeklyTarget && !isForce) {
      console.log(`[weekly-recs] Already ${existingCount}/${weeklyTarget} recos this week. Skipping.`);
      return new Response(JSON.stringify({ status: "already_complete", existing: existingCount, target: weeklyTarget }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // C) Vérifier quota mensuel
    const now = new Date();
    const utcMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const utcNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

    const { count: usedThisMonth } = await supabase
      .from("marketing_recommendations")
      .select("*", { count: "exact", head: true })
      .gte("generated_at", utcMonthStart)
      .lt("generated_at", utcNextMonth);

    const totalUsed = usedThisMonth ?? 0;
    const monthlyRemaining = Math.max(0, monthlyLimit - totalUsed);

    if (monthlyRemaining === 0) {
      console.log("[weekly-recs] Monthly quota exhausted");
      return new Response(JSON.stringify({ status: "quota_exhausted", total_used: totalUsed, monthly_limit: monthlyLimit }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // How many briefs to generate
    const recosToGenerate = Math.min(weeklyTarget - (isForce ? 0 : existingCount), monthlyRemaining);

    if (recosToGenerate <= 0) {
      return new Response(JSON.stringify({ status: "nothing_to_generate" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // D) Market intelligence
    const { data: intelligence } = await supabase
      .from("market_intelligence")
      .select("*")
      .eq("project_id", PROJECT_ID)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!intelligence) {
      console.error("[weekly-recs] No market intelligence available");
      return new Response(JSON.stringify({ status: "no_intelligence_available" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // E-G) Load context in parallel
    const [personasRes, feedbackRes, productsRes] = await Promise.all([
      supabase.from("personas")
        .select("code, name, full_label, description, criteria, session_count, avg_matching_score, is_existing_client_persona")
        .eq("is_active", true)
        .order("session_count", { ascending: false }),
      supabase.from("marketing_recommendations")
        .select("category, persona_code, feedback_score, feedback_notes")
        .not("feedback_score", "is", null)
        .order("completed_at", { ascending: false })
        .limit(20),
      supabase.from("ouate_products")
        .select("title, handle, price_min, price_max, product_type, tags, status")
        .eq("status", "active"),
    ]);

    const personas = personasRes.data || [];
    const pastFeedback = feedbackRes.data || [];
    const products = productsRes.data || [];

    console.log(`[weekly-recs] Context loaded: ${personas.length} personas, ${pastFeedback.length} feedback, ${products.length} products. Intelligence: ${intelligence.month_year}`);

    // ════════════════════════════════════════════════════════
    // STEP 2 : GÉNÉRATION DE TOUS LES BRIEFS EN 1 APPEL (~15-20s)
    // ════════════════════════════════════════════════════════

    const feedbackSummary = pastFeedback.map((f: any) => ({
      category: f.category, persona: f.persona_code, score: f.feedback_score, notes: f.feedback_notes,
    }));

    const systemPrompt = `Tu es le stratège marketing IA d'Ask-It. Tu planifies les recommandations marketing de la semaine pour une marque e-commerce.

Tu reçois :
1. L'analyse de marché mensuelle (tendances, opportunités par catégorie)
2. Les données de tous les personas actifs (volume, conversion, AOV, pain points)
3. Les résultats des recommandations passées (ce qui a marché ou non)
4. Le contexte de la marque (produits, prix, positionnement)
5. La date du jour (pour adapter au calendrier commercial)

Tu dois planifier exactement ${recosToGenerate} recommandations pour cette semaine :
- Répartis intelligemment entre Ads, Emailing et Offres & Bundles selon ce qui est le plus pertinent
- Chaque recommandation doit cibler un persona SPÉCIFIQUE (utilise son prénom, JAMAIS son code P1/P2)
- Varie les personas ciblés — ne pas concentrer toutes les recos sur le même persona
- Priorise les approches qui ont donné de bons résultats (feedback 'good') et évite celles qui ont mal marché ('poor')
- Tiens compte du calendrier (fête des mères, rentrée, etc.)
- Chaque brief doit être suffisamment précis pour qu'un autre IA puisse générer le contenu complet ensuite

Retourne UNIQUEMENT un JSON valide, sans backticks :
{
  "distribution_reasoning": "string — 1-2 phrases expliquant pourquoi cette répartition",
  "recommendations": [
    {
      "title": "string — titre court et accrocheur",
      "brief": "string — 2-3 phrases : problématique identifiée + solution proposée + pourquoi c'est prioritaire cette semaine",
      "category": "ads | emails | offers",
      "persona_cible": "string — prénom du persona (ex: Clara)",
      "persona_code": "string — code technique (ex: P1)",
      "priority": 1,
      "format_suggere": "string — le format recommandé (video_ugc, carousel, newsletter, flow, bundle, etc.)",
      "angle": "string — l'angle marketing à exploiter",
      "produits_suggeres": ["string — noms des produits du catalogue à mettre en avant"],
      "generation_instructions": "string — instructions détaillées pour l'IA qui générera le contenu complet. Inclure le ton, les données clés du persona, les points à adresser, les erreurs à éviter basées sur le feedback passé"
    }
  ]
}`;

    // Build compact summaries of market intelligence
    const intelSummary = {
      ads: intelligence.gemini_ads_analysis?.analysis || intelligence.gemini_ads_analysis || {},
      emails: intelligence.gemini_email_analysis?.analysis || intelligence.gemini_email_analysis || {},
      offers: intelligence.gemini_offers_analysis?.analysis || intelligence.gemini_offers_analysis || {},
    };

    const userPrompt = `Date du jour : ${new Date().toISOString().slice(0, 10)}
Semaine du : ${weekStart}

=== ANALYSE DE MARCHÉ (${intelligence.month_year}) ===
ADS: ${JSON.stringify(intelSummary.ads, null, 1).slice(0, 1500)}
EMAILS: ${JSON.stringify(intelSummary.emails, null, 1).slice(0, 1500)}
OFFRES: ${JSON.stringify(intelSummary.offers, null, 1).slice(0, 1500)}

=== PERSONAS ACTIFS ===
${JSON.stringify(personas.map((p: any) => ({
  code: p.code, nom: p.name, label: p.full_label, sessions: p.session_count,
  score: p.avg_matching_score, description: p.description?.slice(0, 150),
  client_existant: p.is_existing_client_persona,
})), null, 1)}

=== CATALOGUE PRODUITS ===
${JSON.stringify(products.map((p: any) => ({
  title: p.title, prix: p.price_min !== p.price_max ? `${p.price_min}-${p.price_max}€` : `${p.price_min}€`,
  type: p.product_type,
})), null, 1)}

=== FEEDBACK DES 20 DERNIÈRES RECOMMANDATIONS ===
${JSON.stringify(feedbackSummary, null, 1)}

Génère exactement ${recosToGenerate} recommandations avec une répartition intelligente entre ads, emails et offers.`;

    console.log(`[weekly-recs] Calling Sonnet for ${recosToGenerate} briefs...`);
    const sonnetResult = await callSonnet(systemPrompt, userPrompt, 4000, 120000);

    await logUsage(supabase, "anthropic", sonnetResult.model, sonnetResult, {
      step: "briefs_generation", recos_count: recosToGenerate,
    });

    let briefsData: { distribution_reasoning: string; recommendations: any[] };
    try {
      briefsData = JSON.parse(cleanJsonResponse(sonnetResult.text));
    } catch (parseErr) {
      console.error("[weekly-recs] Failed to parse Sonnet response:", sonnetResult.text.slice(0, 500));
      throw new Error("Failed to parse briefs JSON from Sonnet");
    }

    if (!briefsData.recommendations || !Array.isArray(briefsData.recommendations)) {
      throw new Error("Invalid briefs format: missing recommendations array");
    }

    console.log(`[weekly-recs] Distribution reasoning: ${briefsData.distribution_reasoning}`);
    console.log(`[weekly-recs] Got ${briefsData.recommendations.length} briefs from Sonnet`);

    // ════════════════════════════════════════════════════════
    // STEP 3 : PERSISTENCE DES BRIEFS (~1s)
    // ════════════════════════════════════════════════════════

    const generatedIds: string[] = [];
    const generatedBriefs: { id: string; category: string; persona: string; title: string; brief: string }[] = [];
    const distribution: Record<string, number> = { ads: 0, emails: 0, offers: 0 };

    for (const rec of briefsData.recommendations) {
      const category = rec.category || "ads";
      distribution[category] = (distribution[category] || 0) + 1;

      // Determine the matching gemini analysis key
      const geminiAnalysisKey = category === "ads"
        ? "gemini_ads_analysis"
        : category === "emails"
        ? "gemini_email_analysis"
        : "gemini_offers_analysis";

      // Build persona metrics from loaded personas
      const matchedPersona = personas.find((p: any) => p.code === rec.persona_code);
      const personaMetrics = matchedPersona ? {
        code: matchedPersona.code,
        name: matchedPersona.name,
        full_label: matchedPersona.full_label,
        sessions: matchedPersona.session_count,
        avg_score: matchedPersona.avg_matching_score,
        description: matchedPersona.description,
        criteria: matchedPersona.criteria,
      } : {};

      // Build feedback history for this category
      const categoryFeedback = pastFeedback
        .filter((f: any) => f.category === category)
        .map((f: any) => ({ score: f.feedback_score, notes: f.feedback_notes, persona: f.persona_code }));

      const preCalculatedContext = {
        market_intelligence_id: intelligence.id,
        gemini_analysis_key: geminiAnalysisKey,
        persona_metrics: personaMetrics,
        feedback_history: categoryFeedback,
        generation_instructions: rec.generation_instructions || "",
        format_suggere: rec.format_suggere || "",
        angle: rec.angle || "",
        produits_suggeres: rec.produits_suggeres || [],
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("marketing_recommendations")
        .insert({
          week_start: weekStart,
          generated_at: new Date().toISOString(),
          status: "active",
          recommendation_version: 3,
          generation_type: "auto_weekly",
          generation_status: "pending",
          category,
          brief: rec.brief || "",
          persona_cible: rec.persona_cible || null,
          persona_code: rec.persona_code || null,
          priority: rec.priority || 1,
          action_status: "todo",
          pre_calculated_context: preCalculatedContext,
          // Content fields intentionally empty — filled on click
          content: {},
          targeting: {},
          sources_inspirations: [],
          // Legacy V2 fields
          ads_v2: [],
          offers_v2: [],
          emails_v2: [],
          campaigns_overview: [],
          checklist: [{ id: `task-${category}-${distribution[category]}`, title: rec.title, category, completed: false }],
          persona_focus: null,
          generation_config: {
            models_used: { briefs: `anthropic/${sonnetResult.model}` },
            market_intelligence_id: intelligence.id,
            market_intelligence_month: intelligence.month_year,
            distribution_reasoning: briefsData.distribution_reasoning,
          },
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error(`[weekly-recs] Insert failed for ${category}:`, insertErr.message);
        continue;
      }

      generatedIds.push(inserted.id);
      generatedBriefs.push({
        id: inserted.id,
        category,
        persona: rec.persona_cible || "?",
        title: rec.title || "",
        brief: rec.brief || "",
      });
      console.log(`[weekly-recs] ✓ Brief ${category} → ${inserted.id} (${rec.persona_cible}, "${rec.title}")`);
    }

    // ════════════════════════════════════════════════════════
    // STEP 4 : MISE À JOUR QUOTA
    // ════════════════════════════════════════════════════════

    if (generatedIds.length > 0) {
      const monthYear = getCurrentMonthYear();
      const { data: existing } = await supabase
        .from("recommendation_usage")
        .select("*")
        .eq("project_id", PROJECT_ID)
        .eq("month_year", monthYear)
        .maybeSingle();

      const logEntry = {
        timestamp: new Date().toISOString(),
        type: "auto_weekly_briefs",
        count: generatedIds.length,
        recommendation_ids: generatedIds,
      };

      if (!existing) {
        await supabase.from("recommendation_usage").insert({
          project_id: PROJECT_ID,
          month_year: monthYear,
          total_generated: generatedIds.length,
          monthly_limit: monthlyLimit,
          plan: planName,
          generations_log: [logEntry],
        });
      } else {
        await supabase.from("recommendation_usage").update({
          total_generated: existing.total_generated + generatedIds.length,
          generations_log: [...(existing.generations_log || []), logEntry],
          updated_at: new Date().toISOString(),
        }).eq("project_id", PROJECT_ID).eq("month_year", monthYear);
      }
    }

    const durationMs = Date.now() - startTime;

    console.log(`[weekly-recs] Done. ${generatedIds.length} briefs created in ${durationMs}ms. Tokens: ${sonnetResult.totalTokens}`);

    return new Response(JSON.stringify({
      status: "complete",
      generated_count: generatedIds.length,
      weekly_target: weeklyTarget,
      distribution,
      distribution_reasoning: briefsData.distribution_reasoning,
      briefs: generatedBriefs,
      generated_ids: generatedIds,
      duration_ms: durationMs,
      total_tokens: sonnetResult.totalTokens,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[weekly-recs] Unhandled error:", err);
    reportError("weekly-recommendations", err, { type: "cron_failure", severity: "critical" });
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
