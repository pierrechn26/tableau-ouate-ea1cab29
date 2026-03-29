// ============================================================
// weekly-recommendations — Cron hebdomadaire (lundi 07:00 UTC)
// Génère automatiquement les recommandations marketing V3
// Architecture : market_intelligence pré-calculée + Claude Sonnet
// Chaque recommandation = 1 ligne = 1 appel Sonnet
// BATCH MODE: max 3 recos per invocation (~135s) to stay within
// Supabase 150s timeout. Re-invoke to generate more.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROJECT_ID = "ouate";
const MAX_RECOS_PER_INVOCATION = 3;

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
  systemPrompt: string, userPrompt: string, maxTokens: number, timeoutMs = 120000
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
    console.log(`[weekly-recs] Sonnet response: ${inputTokens} in / ${outputTokens} out tokens`);
    return { text, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, model: actualModel };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
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
  "contenu_sections": [{ "section": "string — nom de la section", "contenu": "string — contenu rédigé" }],
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
  "plan_lancement_resume": "string — les 3 phases en 3 lignes max"
}`,
};

const TARGETING_SCHEMAS: Record<string, string> = {
  ads: `{ "audiences": ["string"], "budget_suggere": "string", "plateforme": "string", "kpi_attendu": { "ctr": "string", "cpc": "string", "roas": "string" }, "ab_test_suggestion": "string" }`,
  emails: `{ "segment": "string", "timing": "string", "position_dans_flow": "string|null", "kpi_attendu": { "taux_ouverture": "string", "taux_clic": "string", "conversions": "string" } }`,
  offers: `{ "canal": "string", "periode": "string", "duree": "string", "kpi_attendu": { "ventes": "string", "ca_genere": "string", "taux_conversion": "string" } }`,
};

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
  console.log(`[weekly-recs] Starting. force=${isForce}`);

  try {
    // ════════════════════════════════════════════════════════
    // STEP 1 : CHARGEMENT DU CONTEXTE
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
    const existingByCategory: Record<string, number> = { ads: 0, emails: 0, offers: 0 };
    (existingRecos || []).forEach((r: any) => {
      if (r.category && existingByCategory[r.category] !== undefined) {
        existingByCategory[r.category]++;
      }
    });

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

    // How many still needed this week, capped by monthly quota and batch limit
    const stillNeeded = Math.min(weeklyTarget - existingCount, monthlyRemaining);
    const recosThisBatch = Math.min(stillNeeded, MAX_RECOS_PER_INVOCATION);

    if (recosThisBatch <= 0) {
      console.log("[weekly-recs] Nothing to generate this batch");
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
    const [personasRes, feedbackRes, sourcesRes, productsRes] = await Promise.all([
      supabase.from("personas")
        .select("code, name, full_label, description, criteria, session_count, avg_matching_score, is_existing_client_persona")
        .eq("is_active", true)
        .order("session_count", { ascending: false }),
      supabase.from("marketing_recommendations")
        .select("category, persona_code, content, targeting, feedback_score, feedback_notes, feedback_results")
        .not("feedback_score", "is", null)
        .order("completed_at", { ascending: false })
        .limit(20),
      supabase.from("marketing_sources")
        .select("category, source_name, source_url, description, tier")
        .eq("is_active", true).eq("project_id", PROJECT_ID)
        .order("tier", { ascending: true }).limit(50),
      supabase.from("ouate_products")
        .select("title, handle, price_min, price_max, product_type, tags, status")
        .eq("status", "active"),
    ]);

    const personas = personasRes.data || [];
    const pastFeedback = feedbackRes.data || [];
    const marketingSources = sourcesRes.data || [];
    const products = productsRes.data || [];

    console.log(`[weekly-recs] Context: ${personas.length} personas, ${pastFeedback.length} feedback, ${marketingSources.length} sources, ${products.length} products. Intelligence: ${intelligence.month_year}`);
    console.log(`[weekly-recs] Week ${weekStart}: ${existingCount} existing, ${stillNeeded} needed, generating ${recosThisBatch} this batch`);

    // ════════════════════════════════════════════════════════
    // STEP 2 : RÉPARTITION INTELLIGENTE
    // ════════════════════════════════════════════════════════

    const feedbackSummary = (pastFeedback || []).map((f: any) => ({
      category: f.category,
      persona: f.persona_code,
      score: f.feedback_score,
      notes: f.feedback_notes,
    }));

    const distributionPrompt = `Tu reçois des données sur une marque e-commerce. Détermine la répartition optimale de ${recosToGenerate} recommandations marketing cette semaine entre 3 catégories : ads, emails, offers.

Base ta décision sur :
1. Les performances des personas : ${JSON.stringify((personas || []).map((p: any) => ({ code: p.code, name: p.name, sessions: p.session_count, score: p.avg_matching_score })))}
2. Le contexte de marché (tendances identifiées) : mois=${intelligence.month_year}
3. Les résultats passés : ${JSON.stringify(feedbackSummary)}
4. Le calendrier commercial : date du jour = ${new Date().toISOString().slice(0, 10)}
5. L'équilibre — ne jamais mettre 0 dans une catégorie sauf si c'est vraiment justifié et que le total est < 3

Retourne UNIQUEMENT un JSON : { "ads": N, "emails": N, "offers": N, "reasoning": "string — 1 phrase" }`;

    const distResult = await callSonnet(
      "Tu es un stratège marketing IA. Retourne UNIQUEMENT du JSON valide.",
      distributionPrompt,
      200,
      15000
    );

    await logUsage(supabase, "anthropic", "claude-sonnet-4-6", distResult, { step: "distribution", recos_total: recosToGenerate });

    let distribution: { ads: number; emails: number; offers: number; reasoning: string };
    let totalTokensUsed = 0;

    if (existingCount === 0) {
      // Full distribution for the whole week
      const feedbackSummary = pastFeedback.map((f: any) => ({
        category: f.category, persona: f.persona_code, score: f.feedback_score, notes: f.feedback_notes,
      }));

      const distributionPrompt = `Tu reçois des données sur une marque e-commerce de skincare enfants. Détermine la répartition optimale de ${weeklyTarget} recommandations marketing cette semaine entre 3 catégories : ads, emails, offers.

Base ta décision sur :
1. Les performances des personas : ${JSON.stringify(personas.map((p: any) => ({ code: p.code, name: p.name, sessions: p.session_count, score: p.avg_matching_score })))}
2. Le contexte de marché (tendances identifiées) : mois=${intelligence.month_year}
3. Les résultats passés : ${JSON.stringify(feedbackSummary)}
4. Le calendrier commercial : date du jour = ${new Date().toISOString().slice(0, 10)}
5. L'équilibre — ne jamais mettre 0 dans une catégorie sauf si total < 3

Retourne UNIQUEMENT un JSON : { "ads": N, "emails": N, "offers": N, "reasoning": "string — 1 phrase" }`;

      const distResult = await callSonnet(
        "Tu es un stratège marketing IA. Retourne UNIQUEMENT du JSON valide, sans backticks.",
        distributionPrompt, 200, 15000
      );

      await logUsage(supabase, "anthropic", distResult.model, distResult, { step: "distribution", recos_total: weeklyTarget });
      totalTokensUsed += distResult.totalTokens;

      try {
        distribution = JSON.parse(cleanJsonResponse(distResult.text));
      } catch {
        const third = Math.floor(weeklyTarget / 3);
        const remainder = weeklyTarget - third * 3;
        distribution = { ads: third + (remainder > 0 ? 1 : 0), emails: third + (remainder > 1 ? 1 : 0), offers: third, reasoning: "Répartition par défaut (parsing échoué)" };
      }

      // Validate sum
      const distTotal = distribution.ads + distribution.emails + distribution.offers;
      if (distTotal !== weeklyTarget) {
        distribution.ads += weeklyTarget - distTotal;
      }

      console.log(`[weekly-recs] Distribution: ads=${distribution.ads}, emails=${distribution.emails}, offers=${distribution.offers}. Reasoning: ${distribution.reasoning}`);
    } else {
      // Continue from where we left off — compute remaining
      const targetAds = Math.ceil(weeklyTarget * 0.4);
      const targetEmails = Math.ceil(weeklyTarget * 0.33);
      const targetOffers = weeklyTarget - targetAds - targetEmails;
      distribution = {
        ads: Math.max(0, targetAds - existingByCategory.ads),
        emails: Math.max(0, targetEmails - existingByCategory.emails),
        offers: Math.max(0, targetOffers - existingByCategory.offers),
        reasoning: `Continuation: ${existingCount} already generated`,
      };
      console.log(`[weekly-recs] Continuing. Remaining: ads=${distribution.ads}, emails=${distribution.emails}, offers=${distribution.offers}`);
    }

    // ════════════════════════════════════════════════════════
    // STEP 3 : GÉNÉRATION SÉQUENTIELLE (max 3 per batch)
    // ════════════════════════════════════════════════════════

    const generatedIds: string[] = [];
    const generatedBriefs: { id: string; category: string; persona: string; brief: string; time_ms: number }[] = [];

    const baseSystem = `Tu es le directeur marketing IA d'Ask-It. Tu génères UNE recommandation marketing pour Ouate Paris, marque de skincare enfants.

RÈGLES :
1. Ne recommande JAMAIS un produit hors catalogue fourni
2. Contenu rédigé EN FRANÇAIS, prêt à être utilisé tel quel
3. Utilise les VRAIS prix et noms de produits
4. Cible un persona SPÉCIFIQUE avec son prénom (pas de code P1/P2)
5. N'invente JAMAIS d'ingrédients, de claims ou de données
6. Adapte le contenu au ton de la marque : bienveillant, expert, naturel, rassurant pour les parents
7. Si des recommandations passées du même type ont eu un mauvais résultat, évite les mêmes approches
8. Priorise les approches qui ont donné de bons résultats dans le passé
9. INTERDICTION : emojis dans les textes, jargon non expliqué
10. N'invente JAMAIS d'URLs — mettre null si pas de lien vérifié

Retourne UNIQUEMENT un JSON valide. Pas de markdown, pas de backticks.`;

    const contextBlock = `
=== CATALOGUE PRODUITS ===
${JSON.stringify(products.map((p: any) => ({ title: p.title, prix: p.price_min !== p.price_max ? `${p.price_min}-${p.price_max}€` : `${p.price_min}€`, type: p.product_type })), null, 1)}

=== PERSONAS ===
${JSON.stringify(personas.map((p: any) => ({ code: p.code, nom: p.name, label: p.full_label, sessions: p.session_count, description: p.description })), null, 1)}

=== SOURCES MARKETING (top 20) ===
${JSON.stringify(marketingSources.slice(0, 20).map((s: any) => ({ nom: s.source_name, categorie: s.category, url: s.source_url })), null, 1)}`;

    // Build queue for THIS BATCH only
    const recoQueue: { category: string; index: number; catTotal: number }[] = [];
    let batchCount = 0;
    for (const cat of ["ads", "emails", "offers"] as const) {
      const needed = distribution[cat];
      for (let i = 0; i < needed && batchCount < recosThisBatch; i++) {
        recoQueue.push({ category: cat, index: existingByCategory[cat] + i + 1, catTotal: existingByCategory[cat] + needed });
        batchCount++;
      }
    }

    for (const { category, index, catTotal } of recoQueue) {
      const recoStart = Date.now();

      // Category-specific intelligence
      const catIntel = category === "ads"
        ? intelligence.gemini_ads_analysis
        : category === "emails"
        ? intelligence.gemini_email_analysis
        : intelligence.gemini_offers_analysis;

      // Past feedback for this category
      const catFeedback = pastFeedback.filter((f: any) => f.category === category);
      const goodPatterns = catFeedback.filter((f: any) => f.feedback_score === "good").map((f: any) => f.feedback_notes || "").filter(Boolean);
      const poorPatterns = catFeedback.filter((f: any) => f.feedback_score === "poor").map((f: any) => f.feedback_notes || "").filter(Boolean);

      const userPrompt = `Génère la recommandation #${index}/${catTotal} de la catégorie "${category}" pour la semaine du ${weekStart}.

=== ANALYSE MARCHÉ ${category.toUpperCase()} ===
${JSON.stringify(catIntel?.analysis || catIntel || {}, null, 2)}

=== INSIGHTS PAR PERSONA ===
${JSON.stringify(catIntel?.personas_insights || [], null, 2)}
${contextBlock}
${goodPatterns.length > 0 ? `\n=== CE QUI A BIEN MARCHÉ (à reproduire) ===\n${goodPatterns.join("\n")}` : ""}
${poorPatterns.length > 0 ? `\n=== CE QUI A MAL MARCHÉ (à éviter) ===\n${poorPatterns.join("\n")}` : ""}

Retourne UNIQUEMENT ce JSON :
{
  "title": "string — titre court et clair",
  "brief": "string — 2-3 phrases : problématique + solution",
  "persona_cible": "string — prénom du persona (ex: Clara)",
  "persona_code": "string — code technique (ex: P1)",
  "priority": 1|2|3,
  "content": ${CONTENT_SCHEMAS[category]},
  "targeting": ${TARGETING_SCHEMAS[category]},
  "sources_inspirations": [{ "source_name": "string", "description": "string", "url": "string|null", "type": "source_marketing|inspiration_marque|ad_concurrent|email_concurrent|offre_concurrent" }],
  "kpi_attendu": { ... }
}`;

      try {
        console.log(`[weekly-recs] Generating ${category} #${index}/${catTotal}...`);
        const result = await callSonnet(baseSystem, userPrompt, 4000, 90000);

        await logUsage(supabase, "anthropic", result.model, result, {
          step: "generation", category, index, total: catTotal,
        });
        totalTokensUsed += result.totalTokens;

        let parsed: any;
        try {
          parsed = JSON.parse(cleanJsonResponse(result.text));
        } catch (parseErr) {
          console.error(`[weekly-recs] JSON parse failed for ${category} #${index}:`, result.text.slice(0, 300));
          continue;
        }

        // ── STEP 4: PERSIST immediately ────────────────────────
        const { data: inserted, error: insertErr } = await supabase
          .from("marketing_recommendations")
          .insert({
            week_start: weekStart,
            generated_at: new Date().toISOString(),
            status: "active",
            recommendation_version: 3,
            generation_type: "auto_weekly",
            category,
            brief: parsed.brief || parsed.title || "",
            content: parsed.content || {},
            targeting: parsed.targeting || {},
            sources_inspirations: parsed.sources_inspirations || [],
            persona_cible: parsed.persona_cible || null,
            persona_code: parsed.persona_code || null,
            priority: parsed.priority || 1,
            action_status: "todo",
            ads_v2: [],
            offers_v2: [],
            emails_v2: [],
            campaigns_overview: [],
            checklist: [{ id: `task-${category}-${index}`, title: parsed.title, category, completed: false }],
            persona_focus: null,
            generation_config: {
              models_used: { generation: `anthropic/${result.model}` },
              market_intelligence_id: intelligence.id,
              market_intelligence_month: intelligence.month_year,
              distribution,
              reco_index: index,
              reco_total: catTotal,
            },
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error(`[weekly-recs] Insert failed for ${category} #${index}:`, insertErr.message);
          continue;
        }

        const elapsed = Date.now() - recoStart;
        generatedIds.push(inserted.id);
        generatedBriefs.push({
          id: inserted.id, category, persona: parsed.persona_cible || "?",
          brief: parsed.brief || parsed.title || "", time_ms: elapsed,
        });
        console.log(`[weekly-recs] ✓ ${category} #${index} → ${inserted.id} (${parsed.persona_cible}, ${elapsed}ms)`);

      } catch (err: any) {
        console.error(`[weekly-recs] Error generating ${category} #${index}:`, err.message);
        reportError("weekly-recommendations", err, { step: "generation", category, index });
      }
    }

    // ════════════════════════════════════════════════════════
    // STEP 5 : UPDATE QUOTA
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
        type: "auto_weekly",
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
    const totalExisting = existingCount + generatedIds.length;
    const isComplete = totalExisting >= weeklyTarget;

    console.log(`[weekly-recs] Batch done. Generated ${generatedIds.length} recos in ${durationMs}ms. Week total: ${totalExisting}/${weeklyTarget}. Tokens: ${totalTokensUsed}`);

    return new Response(JSON.stringify({
      status: isComplete ? "complete" : "partial",
      generated_this_batch: generatedIds.length,
      total_this_week: totalExisting,
      weekly_target: weeklyTarget,
      distribution,
      briefs: generatedBriefs,
      generated_ids: generatedIds,
      duration_ms: durationMs,
      total_tokens: totalTokensUsed,
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
