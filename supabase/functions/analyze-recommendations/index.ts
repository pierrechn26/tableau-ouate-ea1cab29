import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

function logUsage(provider: string, model: string, tokens: number, metadata?: Record<string, any>) {
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    .from("api_usage_logs")
    .insert({ edge_function: "analyze-recommendations", api_provider: provider, model, tokens_used: tokens, api_calls: 1, metadata: metadata || {} })
    .then(() => {}).catch(() => {});
}

// ============================================
// STEP 2: GEMINI 3.1 PRO ANALYSIS
// ============================================
async function callGeminiAnalysis(
  collectedData: any,
  perplexityResearch: { adsResearch: string; emailResearch: string; offersResearch: string },
  clientContext: any,
  type: "global" | "ads" | "offers" | "emails"
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const { personaData, personaRows, priorities, globalMetrics } = collectedData;
  const { adsResearch, emailResearch, offersResearch } = perplexityResearch;
  const CLIENT_CONTEXT = clientContext;

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();

  const analysisStructure = type === "global" ? `{
  "analyse_ads": { "tendances_marche": "string", "opportunites_formats": ["string"], "insights_ciblage": "string", "angles_identifies": ["string"] },
  "analyse_email": { "tendances_marche": "string", "opportunites_flows": ["string"], "insights_segmentation": "string", "benchmarks": "string" },
  "analyse_offres": { "tendances_marche": "string", "opportunites_bundles": ["string"], "insights_pricing": "string", "calendrier_commercial": "string" },
  "personas_prioritaires": { "persona_roi": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_growth": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_ltv": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] } },
  "campagnes_suggerees": [{ "nom": "string", "objectif": "string", "persona": "string", "logique": "string" }]
}` : type === "ads" ? `{
  "analyse_ads": { "tendances_marche": "string", "opportunites_formats": ["string"], "insights_ciblage": "string", "angles_identifies": ["string"] },
  "personas_prioritaires": { "persona_roi": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_growth": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_ltv": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] } }
}` : type === "offers" ? `{
  "analyse_offres": { "tendances_marche": "string", "opportunites_bundles": ["string"], "insights_pricing": "string", "calendrier_commercial": "string" },
  "personas_prioritaires": { "persona_roi": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_growth": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_ltv": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] } }
}` : `{
  "analyse_email": { "tendances_marche": "string", "opportunites_flows": ["string"], "insights_segmentation": "string", "benchmarks": "string" },
  "personas_prioritaires": { "persona_roi": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_growth": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }, "persona_ltv": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] } }
}`;

  const systemPrompt = `Tu es un analyste marketing senior. Ta mission : produire une SYNTHÈSE ANALYTIQUE structurée qui identifie les opportunités les plus pertinentes pour cette marque.
Tu ne génères PAS de recommandations actionnables. Tu identifies les PATTERNS, OPPORTUNITÉS et INSIGHTS.
Retourne UNIQUEMENT du JSON valide avec cette structure : ${analysisStructure}`;

  const personaDescriptions = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => `- ${p.code} : ${p.full_label} : ${p.description || ""}`)
    .join("\n");

  const researchBlock = type === "ads" || type === "global" ? `--- Tendances Ads ---\n${adsResearch || "Non disponible"}\n` : "";
  const emailBlock = type === "emails" || type === "global" ? `--- Tendances Email ---\n${emailResearch || "Non disponible"}\n` : "";
  const offersBlock = type === "offers" || type === "global" ? `--- Tendances Offres ---\n${offersResearch || "Non disponible"}\n` : "";

  const userPrompt = `=== CONTEXTE MARQUE ===
${CLIENT_CONTEXT.brand} — ${CLIENT_CONTEXT.description}
Produits : ${CLIENT_CONTEXT.products.map((p: any) => `${p.name} (${p.price}€)`).join(", ")}
Canaux : ${CLIENT_CONTEXT.channels.join(", ")}

=== PERSONAS ===
${personaDescriptions}

=== DONNÉES TERRAIN (30 derniers jours) ===
${JSON.stringify(personaData, null, 2)}
Métriques globales : ${JSON.stringify(globalMetrics)}

=== PERSONAS PRIORITAIRES ===
- ROI : ${priorities.best_roi?.code} (${priorities.best_roi?.name}) — valeur/session: ${priorities.best_roi_value}€
- Growth : ${priorities.best_growth?.code} (${priorities.best_growth?.name}) — CA potentiel: +${priorities.best_growth_ca}€
- LTV : ${priorities.best_ltv?.code} (${priorities.best_ltv?.name}) — score: ${priorities.best_ltv_score}

=== RECHERCHES MARCHÉ (${currentMonth} ${currentYear}) ===
${researchBlock}${emailBlock}${offersBlock}
=== BASE DE CONNAISSANCES (226 sources) ===
${(CLIENT_CONTEXT.sources_consulted || []).join(", ")} + 214 autres sources spécialisées.

Analyse ces données et produis ta synthèse analytique JSON.`;

  console.log(`[analyze-recommendations] Calling Gemini 3.1 Pro for ${type} analysis...`);

  const controller = new AbortController();
  // 120s timeout — we have full 150s budget for this function alone
  const timeout = setTimeout(() => controller.abort(), 120000);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-pro-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[analyze-recommendations] Gemini 3.1 Pro error:", response.status, errText);
    if (response.status === 429) throw new Error("RATE_LIMIT: AI Gateway rate limit exceeded");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED: AI credits exhausted");
    throw new Error(`Gemini 3.1 error ${response.status}: ${errText}`);
  }

  const aiResponse = await response.json();
  const rawContent = aiResponse.choices?.[0]?.message?.content;
  logUsage("gemini", "gemini-3.1-pro-preview", aiResponse.usage?.total_tokens || 0);

  if (!rawContent) throw new Error("Empty response from Gemini 3.1");

  try {
    return JSON.parse(cleanJsonResponse(rawContent));
  } catch (parseErr) {
    console.error("[analyze-recommendations] Gemini 3.1 JSON parse error. Raw:", rawContent.slice(0, 500));
    throw new Error(`Gemini 3.1 JSON parse error: ${(parseErr as Error).message}`);
  }
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: any = {};
    try { const text = await req.text(); if (text) body = JSON.parse(text); } catch (_) {}
    const { staging_id } = body;
    if (!staging_id) return new Response(JSON.stringify({ error: "staging_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[analyze-recommendations] POST staging_id="${staging_id}"`);

    // Read staging row
    const { data: staging, error: stagingErr } = await supabase
      .from("recommendation_staging")
      .select("*")
      .eq("id", staging_id)
      .single();

    if (stagingErr || !staging) {
      return new Response(JSON.stringify({ error: "Staging row not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (staging.status !== "step1_done") {
      return new Response(JSON.stringify({ error: `Invalid staging status: ${staging.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { persona_data: collectedData, perplexity_results: perplexityResearch, client_context: clientContext, generation_type: generationType } = staging;

    // Call Gemini analysis (non-fatal — we continue even if it fails)
    let geminiSynthesis: any = null;
    let geminiSuccess = false;
    try {
      geminiSynthesis = await callGeminiAnalysis(collectedData, perplexityResearch, clientContext, generationType as any);
      geminiSuccess = true;
      console.log("[analyze-recommendations] Gemini analysis done.");
    } catch (geminiErr) {
      const errMsg = geminiErr instanceof Error ? geminiErr.message : "unknown";
      console.error("[analyze-recommendations] Gemini FAILED:", errMsg);
      logUsage("gemini", "gemini-3.1-pro-preview", 0, { error: errMsg, step: "analysis" });
      // Non-fatal: Opus will use raw Perplexity data as fallback
    }

    // Update staging with synthesis
    const { error: updateErr } = await supabase
      .from("recommendation_staging")
      .update({
        status: "step2_done",
        gemini_synthesis: geminiSynthesis,
        ...(geminiSuccess ? {} : { error_message: "Gemini analysis failed — Opus will use raw Perplexity data" }),
      })
      .eq("id", staging_id);

    if (updateErr) throw new Error(`Staging update error: ${updateErr.message}`);

    console.log(`[analyze-recommendations] Done. staging_id=${staging_id} gemini_success=${geminiSuccess}`);
    return new Response(JSON.stringify({ staging_id, status: "step2_done", gemini_success: geminiSuccess }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    const errMsg = err?.message || "Unknown error";
    console.error("[analyze-recommendations] Fatal error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
