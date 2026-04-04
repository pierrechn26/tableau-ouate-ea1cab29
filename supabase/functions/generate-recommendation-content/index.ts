// ============================================================
// generate-recommendation-content — Génère le contenu complet
// d'une recommandation à partir de son brief pré-calculé.
// Appelée au clic depuis le frontend.
// ============================================================
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

// ── Content schemas per category ──────────────────────────────────────

const CONTENT_SCHEMAS: Record<string, string> = {
  ads: `{
  "hook_text": "string — l'accroche texte",
  "hook_audio": "string|null — l'accroche audio si vidéo",
  "script_ou_descriptif": "string — script complet si vidéo, descriptif visuel si image",
  "ad_copy": { "primary_text": "string", "headline": "string", "description": "string" },
  "cta": "string",
  "format": "video_ugc|video_brand|image|carousel",
  "plateforme": "meta|tiktok|both"
}`,
  emails: `{
  "objet": "string",
  "objet_variante": "string",
  "contenu_sections": [{ "section": "string", "contenu": "string" }],
  "cta": { "texte": "string", "url": "string|null" },
  "type_email": "newsletter|flow|campagne|relance|winback",
  "segment_klaviyo": "string",
  "trigger": "string|null",
  "timing": "string"
}`,
  offers: `{
  "concept": "string — le concept de l'offre",
  "type_offre": "bundle|upsell|cross_sell|promo|programme_fidelite",
  "composition": [{ "produit": "string — VRAI produit du catalogue", "role": "string" }],
  "pricing": { "prix_normal": "string", "prix_offre": "string", "economie": "string" },
  "messaging": { "ads": "string", "email": "string", "site": "string" },
  "plan_lancement_resume": "string"
}`,
};

const TARGETING_SCHEMAS: Record<string, string> = {
  ads: `{ "audiences": ["string"], "budget_suggere": "string", "plateforme": "string", "kpi_attendu": { "ctr": "string", "cpc": "string", "roas": "string" }, "ab_test_suggestion": "string" }`,
  emails: `{ "segment": "string", "timing": "string", "position_dans_flow": "string|null", "kpi_attendu": { "taux_ouverture": "string", "taux_clic": "string", "conversions": "string" } }`,
  offers: `{ "canal": "string", "periode": "string", "duree": "string", "kpi_attendu": { "ventes": "string", "ca_genere": "string", "taux_conversion": "string" } }`,
};

// ── Claude Sonnet ─────────────────────────────────────────────────

const SONNET_MODEL = "claude-sonnet-4-20250514";

async function callSonnet(
  systemPrompt: string, userPrompt: string, maxTokens: number, timeoutMs = 90000
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
    return { text, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, model: actualModel };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    let body: any = {};
    try { const t = await req.text(); if (t) body = JSON.parse(t); } catch {}

    const { recommendation_id } = body;
    if (!recommendation_id) {
      return new Response(JSON.stringify({ error: "recommendation_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A) Read the recommendation
    const { data: rec, error: recErr } = await supabase
      .from("marketing_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .single();

    if (recErr || !rec) {
      return new Response(JSON.stringify({ error: "Recommendation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already complete → return directly
    if (rec.generation_status === "complete") {
      return new Response(JSON.stringify({
        status: "complete",
        recommendation: rec,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Currently generating → tell the client to wait
    if (rec.generation_status === "generating") {
      return new Response(JSON.stringify({ status: "generating" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // B) Mark as generating (prevent double calls)
    await supabase
      .from("marketing_recommendations")
      .update({ generation_status: "generating" })
      .eq("id", recommendation_id);

    const startTime = Date.now();

    // C) Load context from pre_calculated_context
    const ctx = rec.pre_calculated_context || {};
    const intelligenceId = ctx.market_intelligence_id;
    const geminiKey = ctx.gemini_analysis_key || "gemini_ads_analysis";

    // Load market intelligence and products in parallel
    const [intelRes, productsRes] = await Promise.all([
      intelligenceId
        ? supabase.from("market_intelligence").select("*").eq("id", intelligenceId).single()
        : supabase.from("market_intelligence").select("*").eq("status", "complete").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("ouate_products").select("title, handle, price_min, price_max, product_type, tags").eq("status", "active"),
    ]);

    const intelligence = intelRes.data;
    const products = productsRes.data || [];
    const catIntel = intelligence ? intelligence[geminiKey] : {};
    const clientContext = intelligence?.client_context || {};

    // D) Call Sonnet for full content
    const category = rec.category || "ads";
    const contentSchema = CONTENT_SCHEMAS[category] || CONTENT_SCHEMAS.ads;
    const targetingSchema = TARGETING_SCHEMAS[category] || TARGETING_SCHEMAS.ads;

    const systemPrompt = `Tu es le directeur marketing IA d'Ask-It. Tu génères le contenu COMPLET d'une recommandation marketing à partir d'un brief pré-validé.

RÈGLES :
1. Ne recommande JAMAIS un produit hors catalogue
2. Contenu rédigé EN FRANÇAIS, prêt à être utilisé tel quel
3. Utilise les VRAIS prix et noms de produits
4. N'invente JAMAIS d'ingrédients, de claims ou de données produit
5. Adapte le contenu au ton de la marque : bienveillant, expert, naturel, rassurant pour les parents
6. Le contenu doit être IMMÉDIATEMENT ACTIONNABLE — la marque doit pouvoir copier-coller
7. N'invente JAMAIS d'URLs — mettre null si pas de lien vérifié
8. INTERDICTION : emojis dans les textes, jargon non expliqué

Voici le brief de la recommandation :
Titre : ${rec.checklist?.[0]?.title || rec.brief?.slice(0, 80) || ""}
Brief : ${rec.brief || ""}
Catégorie : ${category}
Persona ciblé : ${rec.persona_cible || ""}
Format suggéré : ${ctx.format_suggere || ""}
Angle : ${ctx.angle || ""}
Produits à mettre en avant : ${JSON.stringify(ctx.produits_suggeres || [])}
Instructions : ${ctx.generation_instructions || ""}

Génère le contenu complet en JSON. Retourne UNIQUEMENT un JSON valide, sans backticks :
{
  "content": ${contentSchema},
  "targeting": ${targetingSchema},
  "sources_inspirations": [
    { "source_name": "string", "description": "string", "type": "source_marketing | inspiration_marque" }
  ]
}`;

    const userPrompt = `=== ANALYSE DE MARCHÉ ===
${JSON.stringify(catIntel?.analysis || catIntel || {}, null, 2).slice(0, 3000)}

=== PERSONA CIBLÉ ===
${JSON.stringify(ctx.persona_metrics || {}, null, 2)}

=== CONTEXTE MARQUE ===
${JSON.stringify(clientContext, null, 2).slice(0, 1000)}

=== CATALOGUE PRODUITS ===
${JSON.stringify(products.map((p: any) => ({
  title: p.title, prix: p.price_min !== p.price_max ? `${p.price_min}-${p.price_max}€` : `${p.price_min}€`,
  type: p.product_type,
})), null, 1)}

=== FEEDBACK PASSÉ POUR CETTE CATÉGORIE ===
${JSON.stringify(ctx.feedback_history || [], null, 1)}`;

    console.log(`[gen-content] Generating full content for ${recommendation_id} (${category}, ${rec.persona_cible})...`);

    const result = await callSonnet(systemPrompt, userPrompt, 4000, 90000);

    // Log usage
    try {
      await supabase.from("api_usage_logs").insert({
        edge_function: "generate-recommendation-content",
        api_provider: "anthropic",
        model: result.model,
        tokens_used: result.totalTokens,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        total_tokens: result.totalTokens,
        api_calls: 1,
        metadata: { recommendation_id, category, persona: rec.persona_cible, duration_ms: Date.now() - startTime },
      });
    } catch (e: any) {
      console.error("[gen-content] Usage log error:", e.message);
    }

    // E) Parse and persist
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonResponse(result.text));
    } catch (parseErr) {
      console.error("[gen-content] JSON parse failed:", result.text.slice(0, 500));
      // Mark as error so user can retry
      await supabase
        .from("marketing_recommendations")
        .update({ generation_status: "error" })
        .eq("id", recommendation_id);

      return new Response(JSON.stringify({
        status: "error",
        message: "La génération a échoué (parsing). Veuillez réessayer.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update the recommendation with full content
    const { error: updateErr } = await supabase
      .from("marketing_recommendations")
      .update({
        content: parsed.content || {},
        targeting: parsed.targeting || {},
        sources_inspirations: parsed.sources_inspirations || [],
        generation_status: "complete",
      })
      .eq("id", recommendation_id);

    if (updateErr) {
      console.error("[gen-content] Update failed:", updateErr.message);
      await supabase
        .from("marketing_recommendations")
        .update({ generation_status: "error" })
        .eq("id", recommendation_id);
      throw updateErr;
    }

    const durationMs = Date.now() - startTime;
    console.log(`[gen-content] ✓ ${recommendation_id} complete in ${durationMs}ms (${result.totalTokens} tokens)`);

    // Return full recommendation
    const { data: updated } = await supabase
      .from("marketing_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .single();

    return new Response(JSON.stringify({
      status: "complete",
      recommendation: updated,
      duration_ms: durationMs,
      tokens_used: result.totalTokens,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[gen-content] Unhandled error:", err);
    reportError("generate-recommendation-content", err, { type: "generation_failure", severity: "error" });
    return new Response(JSON.stringify({
      status: "error",
      message: err.message || "La génération a échoué. Veuillez réessayer.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
