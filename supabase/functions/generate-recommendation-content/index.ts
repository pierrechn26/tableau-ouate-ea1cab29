// ============================================================
// generate-recommendation-content — On-demand full generation
// POST { category: "ads"|"emails"|"offers" } → 1 complete reco
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROJECT_ID = "ouate";
const SONNET_MODEL = "claude-sonnet-4-20250514";

function getMonday(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function robustJsonParse(raw: string): any {
  const trimmed = raw.trim();
  // A) Direct parse
  try { return JSON.parse(trimmed); } catch {}
  // B) Clean markdown backticks
  let cleaned = trimmed;
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();
  try { return JSON.parse(cleaned); } catch {}
  // C) Extract first {...} block
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(raw.slice(firstBrace, lastBrace + 1)); } catch {}
  }
  // D) Fail
  return null;
}

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
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Empty response from Sonnet");
    return {
      text,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      model: data.model || SONNET_MODEL,
    };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── Date formatting ──────────────────────────────────────────────────

function formatDateFR(d: Date): string {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── System prompt builder ────────────────────────────────────────────

function buildSystemPrompt(category: string, dateFR: string): string {
  const baseRules = `Tu es le directeur marketing IA d'Ask-It. Tu génères UNE recommandation marketing complète et immédiatement actionnable pour une marque e-commerce.

RÈGLES ABSOLUES :
1. Ne recommande JAMAIS un produit hors du catalogue de la marque
2. Contenu rédigé EN FRANÇAIS, prêt à être copié-collé et utilisé tel quel
3. Utilise les VRAIS prix et noms de produits
4. N'invente JAMAIS d'ingrédients, de claims ou de données produit
5. Si tu ne connais pas une info produit (composition, claim), ne l'invente pas
6. Adapte le contenu au ton de la marque : bienveillant, expert, naturel, rassurant pour les parents
7. Les scripts, témoignages et situations décrites sont des EXEMPLES À ADAPTER — précise-le en note
8. Priorise les approches qui ont donné de bons résultats (feedback 'good') et évite celles qui ont mal marché ('poor')
9. Ne propose PAS une recommandation similaire à celles déjà générées cette semaine (titres et angles différents)

CIBLAGE — PERSONA OU GROUPE :
Tu peux cibler SOIT un persona individuel (ex: Clara) SOIT un groupe de personas partageant des caractéristiques communes. Utilise les groupes quand la recommandation s'applique à plusieurs profils ou que le volume d'un seul persona est insuffisant.
Quand tu cibles un groupe, indique le nom du groupe dans persona_cible et les codes séparés par virgules dans persona_code.
IMPORTANT : n'utilise JAMAIS les codes techniques (P1, P2...) dans le contenu visible. Utilise uniquement les prénoms.

MARGE ET PRICING :
La marque réalise entre 60% et 70% de marge brute. Les offres doivent TOUJOURS préserver une marge positive :
- Pas de remise supérieure à 25%
- Privilégier la création de valeur (cadeau avec achat, contenu exclusif, accès anticipé) plutôt que les remises directes

INTERPRÉTATION DES MÉTRIQUES :
- Taux de conversion e-commerce : < 1% faible, 1-3% moyenne, 3-5% bon, 5-10% très bon, > 10% exceptionnel
- Ne dis JAMAIS qu'un taux > 10% est 'limité'
- Contextualise chaque chiffre
- Précise toujours DE QUOI on parle quand tu cites un volume

SOURCES ET FAITS :
- N'invente JAMAIS d'actualité, d'étude ou d'enquête
- Si tu cites une tendance, formule-la comme observation sans inventer de source datée

DATE : Nous sommes le ${dateFR}. Adapte au calendrier commercial (événements dans les 4-6 prochaines semaines).`;

  const categorySchemas: Record<string, string> = {
    ads: `
FORMATS ADS — VARIÉTÉ OBLIGATOIRE :
Varie les formats : vidéo UGC, vidéo brand, image statique, carrousel, before/after, story, collection.

Retourne un JSON avec cette structure adaptée au FORMAT choisi :

Si format VIDÉO :
{
  "title": "string",
  "brief": "string — 2-3 phrases : **problématique** + **solution** + pourquoi maintenant",
  "persona_cible": "string",
  "persona_code": "string",
  "priority": 1|2|3,
  "category": "ads",
  "content": {
    "hook": "string — le hook principal (3 premières secondes)",
    "script": "string — script structuré par scènes avec timing",
    "texte_principal": "string — texte Meta Ads",
    "titre": "string — titre court Meta Ads",
    "description": "string — description Meta Ads",
    "cta": "string",
    "format": "video_ugc|video_brand|story",
    "plateforme": "string",
    "note_production": "string — 2-3 conseils tournage"
  },
  "targeting": {
    "type_audience": "string — Audience froide — Acquisition | Audience tiède — Retargeting | Audience chaude — Conversion | Audience fidèle — Rétention",
    "suggestions_audiences": ["string"],
    "budget_suggere": "string",
    "plateforme": "string",
    "kpi_attendu": { "metrique": "CTR", "valeur_cible": "1.5-2.5%", "metrique_secondaire": "ROAS", "valeur_secondaire": "2.5-4x" },
    "ab_test": "string"
  },
  "sources_inspirations": [{ "source_name": "string", "description": "string", "type": "source_marketing|inspiration_marque" }]
}

Si format IMAGE :
{
  ...mêmes champs title/brief/persona/priority/category...
  "content": {
    "concept_visuel": "string — description détaillée du visuel",
    "texte_principal": "string",
    "titre": "string",
    "description": "string",
    "cta": "string",
    "format": "image",
    "plateforme": "string"
  },
  "targeting": { ...même structure... },
  "sources_inspirations": [...]
}

Si format CARROUSEL :
{
  ...mêmes champs...
  "content": {
    "slides": [{ "numero": 1, "visuel": "string", "texte_slide": "string" }],
    "texte_principal": "string",
    "titre": "string",
    "description": "string",
    "cta": "string",
    "format": "carousel",
    "plateforme": "string"
  },
  "targeting": { ...même structure... },
  "sources_inspirations": [...]
}`,
    emails: `
SEGMENTS EMAIL — PAS QUE DES PERSONAS :
Ne cible PAS toujours un seul persona. Utilise aussi des segments comportementaux : 'Engagés 90j non-acheteurs', 'Acheteurs all time', 'Abandons panier 7j', 'VIP top 20% LTV', 'Nouveaux inscrits 30j'.

Retourne :
{
  "title": "string",
  "brief": "string — 2-3 phrases avec **mots clés en gras**",
  "persona_cible": "string — prénom persona OU nom de segment comportemental",
  "persona_code": "string — code(s) ou 'segment'",
  "priority": 1|2|3,
  "category": "emails",
  "content": {
    "objet": "string",
    "objet_variante": "string",
    "type_email": "string — newsletter|flow|campagne|relance|winback",
    "contenu_sections": [{ "section": "string", "contenu": "string — 2-3 phrases MAX par section" }],
    "cta": { "texte": "string", "url": null }
  },
  "targeting": {
    "segment": "string",
    "timing": "string",
    "trigger": "string ou null",
    "position_dans_flow": "string ou null",
    "kpi_attendu": { "taux_ouverture_vise": "25-35%", "taux_clic_vise": "3-5%" }
  },
  "sources_inspirations": [...]
}`,
    offers: `
TYPES D'OFFRES — VARIÉTÉ :
Ne propose PAS uniquement des bundles. Varie : offre de lancement, programme fidélité, offre parrainage, upsell post-achat, cross-sell, offre saisonnière, vente privée, cadeau avec achat.

Retourne :
{
  "title": "string",
  "brief": "string",
  "persona_cible": "string",
  "persona_code": "string",
  "priority": 1|2|3,
  "category": "offers",
  "content": {
    "concept": "string",
    "type_offre": "string — bundle|upsell|cross_sell|offre_lancement|programme_fidelite|offre_saisonniere|cadeau_avec_achat|vente_privee|parrainage",
    "composition": [{ "produit": "string", "role": "string" }],
    "pricing": { "prix_normal": "string", "prix_offre": "string", "economie": "string" },
    "messaging": { "ads": "string", "email": "string", "site": "string" },
    "plan_lancement_resume": "string — 3 phases en 3 lignes max"
  },
  "targeting": {
    "canal": "string",
    "periode": "string",
    "duree": "string",
    "kpi_attendu": { "metrique": "Taux de conversion", "valeur_cible": "3-5%", "metrique_secondaire": "AOV impact", "valeur_secondaire": "+10-15%" }
  },
  "sources_inspirations": [...]
}`,
  };

  return `${baseRules}\n\n${categorySchemas[category] || categorySchemas.ads}\n\nJSON UNIQUEMENT. Pas de markdown, pas de texte avant ou après.`;
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

    const { category } = body;
    if (!category || !["ads", "emails", "offers"].includes(category)) {
      return new Response(JSON.stringify({ error: "category is required (ads|emails|offers)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const startTime = Date.now();
    const weekStart = getMonday(now);
    const dateFR = formatDateFR(now);

    // ── STEP 1: QUOTA CHECK ──
    const utcMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const utcNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

    const [planRes, countRes] = await Promise.all([
      supabase.from("client_plan").select("plan, recos_monthly_limit").eq("project_id", PROJECT_ID).maybeSingle(),
      supabase.from("marketing_recommendations").select("*", { count: "exact", head: true })
        .eq("recommendation_version", 3).gte("generated_at", utcMonthStart).lt("generated_at", utcNextMonth),
    ]);

    const planLimits: Record<string, number> = { starter: 24, growth: 60, scale: 240 };
    const planName = planRes.data?.plan ?? "growth";
    const monthlyLimit = planRes.data?.recos_monthly_limit ?? planLimits[planName] ?? 60;
    const currentCount = countRes.count ?? 0;

    if (currentCount >= monthlyLimit) {
      return new Response(JSON.stringify({
        error: "quota_exceeded",
        current: currentCount,
        limit: monthlyLimit,
        remaining: 0,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── STEP 2: LOAD CONTEXT ──
    const geminiKey = category === "ads" ? "gemini_ads_analysis" : category === "emails" ? "gemini_email_analysis" : "gemini_offers_analysis";

    const [intelRes, personasRes, feedbackRes, weekRecosRes, productsRes] = await Promise.all([
      supabase.from("market_intelligence").select("*").eq("status", "complete").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("personas").select("code, name, full_label, session_count, avg_matching_score, criteria, description").eq("is_active", true),
      supabase.from("marketing_recommendations").select("category, title, brief, persona_cible, feedback_score, feedback_results, feedback_notes")
        .not("feedback_score", "is", null).order("completed_at", { ascending: false }).limit(15),
      supabase.from("marketing_recommendations").select("title, persona_cible, content")
        .eq("category", category).eq("week_start", weekStart).eq("recommendation_version", 3),
      supabase.from("ouate_products").select("title, handle, price_min, price_max, product_type, tags").eq("status", "active"),
    ]);

    const intelligence = intelRes.data;
    const catIntel = intelligence ? (intelligence as any)[geminiKey] : {};
    const weeklyTrends = intelligence?.weekly_trends_refresh;
    const personasSnapshot = intelligence?.personas_snapshot;
    const clientContext = intelligence?.client_context || {};
    const personas = personasRes.data || [];
    const feedback = feedbackRes.data || [];
    const weekRecos = weekRecosRes.data || [];
    const products = productsRes.data || [];

    console.log(`[gen-content] Generating ${category} reco. Context: intel=${!!intelligence}, personas=${personas.length}, feedback=${feedback.length}, weekRecos=${weekRecos.length}`);

    // ── STEP 3: CALL SONNET ──
    const systemPrompt = buildSystemPrompt(category, dateFR);

    const userPrompt = `=== ANALYSE DE MARCHÉ (${category}) ===
${JSON.stringify(catIntel?.analysis || catIntel || {}, null, 2).slice(0, 3000)}

${weeklyTrends ? `=== TENDANCES DE LA SEMAINE ===\n${JSON.stringify(weeklyTrends, null, 1).slice(0, 800)}\n` : ""}
=== PERSONAS ACTIFS ===
${JSON.stringify(personasSnapshot?.metrics || personas.reduce((acc: any, p: any) => {
  acc[p.code] = { name: p.name, full_label: p.full_label, sessions: p.session_count, score: p.avg_matching_score };
  return acc;
}, {}), null, 1).slice(0, 2000)}

=== FEEDBACK DES 15 DERNIÈRES RECOMMANDATIONS ===
${feedback.length > 0 ? JSON.stringify(feedback, null, 1).slice(0, 1500) : "Aucun feedback disponible."}

=== RECOMMANDATIONS DÉJÀ GÉNÉRÉES CETTE SEMAINE (${category}) — NE PAS DUPLIQUER ===
${weekRecos.length > 0 ? weekRecos.map((r: any) => `- "${r.title}" (${r.persona_cible})`).join("\n") : "Aucune."}

=== CONTEXTE MARQUE ===
${JSON.stringify(clientContext, null, 1).slice(0, 800)}

=== CATALOGUE PRODUITS ===
${JSON.stringify(products.map((p: any) => ({
  title: p.title,
  prix: p.price_min !== p.price_max ? `${p.price_min}-${p.price_max}€` : `${p.price_min}€`,
  type: p.product_type,
})), null, 1)}`;

    const result = await callSonnet(systemPrompt, userPrompt, 8000, 90000);

    // ── STEP 4: PARSE & PERSIST ──
    const parsed = robustJsonParse(result.text);
    if (!parsed) {
      console.error("[gen-content] JSON parse failed. Raw (500 chars):", result.text.slice(0, 500));
      // Do NOT deduct credit
      return new Response(JSON.stringify({
        error: "parse_failed",
        message: "La génération a échoué (parsing). Réessayez.",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert recommendation
    const recoRow = {
      title: parsed.title || "Recommandation",
      brief: parsed.brief || "",
      category,
      persona_cible: parsed.persona_cible || "",
      persona_code: parsed.persona_code || "",
      priority: parsed.priority || 2,
      content: parsed.content || {},
      targeting: parsed.targeting || {},
      sources_inspirations: parsed.sources_inspirations || [],
      generation_status: "complete",
      action_status: "todo",
      recommendation_version: 3,
      generation_type: "on_demand",
      week_start: weekStart,
      generated_at: now.toISOString(),
      status: "active",
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("marketing_recommendations")
      .insert(recoRow)
      .select()
      .single();

    if (insertErr) {
      console.error("[gen-content] Insert error:", insertErr.message);
      throw insertErr;
    }

    // Update quota
    const monthYear = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const { data: usageRow } = await supabase
      .from("recommendation_usage")
      .select("id, total_generated, generations_log")
      .eq("project_id", PROJECT_ID)
      .eq("month_year", monthYear)
      .maybeSingle();

    if (usageRow) {
      const log = Array.isArray(usageRow.generations_log) ? usageRow.generations_log : [];
      log.push({ at: now.toISOString(), category, id: inserted.id });
      await supabase.from("recommendation_usage").update({
        total_generated: (usageRow.total_generated || 0) + 1,
        generations_log: log,
      }).eq("id", usageRow.id);
    } else {
      await supabase.from("recommendation_usage").insert({
        project_id: PROJECT_ID,
        month_year: monthYear,
        total_generated: 1,
        monthly_limit: monthlyLimit,
        plan: planName,
        generations_log: [{ at: now.toISOString(), category, id: inserted.id }],
      });
    }

    // Log usage
    const durationMs = Date.now() - startTime;
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
        metadata: { recommendation_id: inserted.id, category, persona: parsed.persona_cible, duration_ms: durationMs },
      });
    } catch (e: any) {
      console.error("[gen-content] Usage log error:", e.message);
    }

    console.log(`[gen-content] ✓ ${inserted.id} (${category}) complete in ${durationMs}ms (${result.totalTokens} tokens)`);

    return new Response(JSON.stringify({
      status: "complete",
      recommendation: inserted,
      duration_ms: durationMs,
      tokens_used: result.totalTokens,
      quota: { used: currentCount + 1, limit: monthlyLimit, remaining: monthlyLimit - currentCount - 1 },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[gen-content] Unhandled error:", err);
    return new Response(JSON.stringify({
      error: "generation_failed",
      message: err.message || "La génération a échoué.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
