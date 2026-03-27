// ============================================================
// generate-marketing-recommendations — Phase B (v3)
// Architecture : Intelligence pré-calculée (market_intelligence)
// + Claude Sonnet 4.6 pour génération finale
// UN SEUL appel Sonnet par invocation (~25-35s)
// Aucun appel Perplexity ni Gemini ici — tout est pré-calculé.
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
      body: JSON.stringify({ errors: [{ source: "edge_function", severity: context?.severity || "error", error_type: context?.type || "internal_error", function_name: functionName, message: (error as any)?.message || String(error), stack_trace: (error as any)?.stack || "", context: { ...context, timestamp: new Date().toISOString() } }] }),
    });
  } catch { /* fire-and-forget */ }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GenerationType =
  | "global"
  | "ads"
  | "offers"
  | "emails"
  | "single_ad"
  | "single_offer"
  | "single_email"
  | "finalize";

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
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

async function logUsage(
  supabase: any,
  provider: string,
  model: string,
  usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number } | number,
  metadata?: Record<string, any>
) {
  const inputTokens = typeof usage === "number" ? 0 : (usage.input_tokens || 0);
  const outputTokens = typeof usage === "number" ? 0 : (usage.output_tokens || 0);
  const totalTokens = typeof usage === "number" ? usage : (usage.total_tokens || (inputTokens + outputTokens));
  try {
    const { error } = await supabase
      .from("api_usage_logs")
      .insert({
        edge_function: "generate-marketing-recommendations",
        api_provider: provider,
        model,
        tokens_used: totalTokens,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        api_calls: 1,
        metadata: metadata || {},
      });
    if (error) console.error("LOG FAIL marketing:", model, error.message);
    else console.log("LOG OK:", model);
  } catch (e: any) {
    console.error("LOG EXCEPTION marketing:", model, e.message);
  }
}

const PROJECT_ID = "ouate";

// ── Schemas (for prompts) ──────────────────────────────────────────────

const ADS_V2_SCHEMA = `{
  "id": "string",
  "title": "string",
  "persona_cible": "code du persona ex: P1",
  "format": "reel|story_video|ugc_video|static_image|carousel|before_after",
  "funnel_stage": "tofu_awareness|mofu_consideration|bofu_conversion|retargeting",
  "contenu_creatif": {
    "hook_text": "string|null",
    "hook_audio": "string|null (si vidéo)",
    "script_complet": "string|null (si vidéo)",
    "descriptif_visuel": "string",
    "headline_image": "string|null (si statique)",
    "body_copy": "string|null (si statique)",
    "slides": [],
    "direction_artistique": "string"
  },
  "ad_copy": { "primary_text": "string", "headline": "string", "description": "string" },
  "cta": "string",
  "angle_psychologique": "string",
  "ciblage_detaille": {
    "audiences_suggested": ["string"],
    "exclusions": ["string"],
    "custom_audience_source": "string|null"
  },
  "ab_test_suggestion": {
    "element_a_tester": "string",
    "variante_a": "string",
    "variante_b": "string",
    "raison": "string",
    "duree_test_recommandee": "string"
  },
  "landing_page_alignement": { "url_destination": null, "elements_coherence": ["string"] },
  "prompt_ia_generation": "string EN ANGLAIS",
  "inspirations": [{ "description": "string", "marque": "string vraie marque", "pourquoi": "string", "url": null }],
  "budget_suggere": "string",
  "placement": "string",
  "plateforme": "meta|tiktok|both",
  "kpi_attendu": "string",
  "campaign_id": null,
  "priorite": "haute|moyenne|basse",
  "sources_utilisees": ["string"]
}`;

const OFFERS_V2_SCHEMA = `{
  "id": "string",
  "title": "string",
  "persona_cible": "code du persona",
  "type_offre": "bundle|upsell|cross_sell|offre_limitee|prix_psychologique|fidelite",
  "concept": "string",
  "composition": [{ "produit": "string (VRAI produit du catalogue)", "role_dans_bundle": "string" }],
  "pricing_strategy": {
    "prix_unitaire_total": "string",
    "prix_bundle": "string",
    "economie_affichee": "string",
    "ancrage_prix": "string"
  },
  "marge_estimee": { "cout_revient_estime": "string", "marge_brute_pourcent": "string", "commentaire": "string" },
  "plan_de_lancement": {
    "phase_teasing": { "duree": "string", "actions": ["string"] },
    "phase_lancement": { "duree": "string", "actions": ["string"] },
    "phase_relance": { "duree": "string", "actions": ["string"] }
  },
  "messaging_par_canal": { "ads": "string", "email": "string", "site": "string" },
  "angle_marketing": "string",
  "urgency_trigger": "string|null",
  "canal_distribution": "site|email|ads|tous",
  "periode_recommandee": "string",
  "metriques_succes": {
    "kpis_a_surveiller": ["string"],
    "seuil_succes": "string",
    "action_si_echec": "string"
  },
  "campaign_id": null,
  "priorite": "haute|moyenne|basse",
  "sources_utilisees": ["string"]
}`;

const EMAILS_V2_SCHEMA = `{
  "id": "string",
  "title": "string",
  "persona_cible": "code du persona",
  "type_email": "newsletter|flow_automation|campagne_promo|relance|post_diagnostic|winback",
  "objet": "string",
  "objet_variante": "string",
  "preview_text": "string",
  "structure_sections": [{ "section": "string", "contenu": "string", "conseil_design": "string" }],
  "messaging_principal": "string",
  "cta_principal": { "texte": "string", "url_destination": null, "couleur_suggeree": "string" },
  "segment_klaviyo": "string",
  "trigger": "string",
  "timing": "string",
  "position_dans_flow": {
    "flow_name": "string",
    "position": "string",
    "email_precedent": "string|null",
    "email_suivant": "string|null",
    "logique_branchement": "string"
  },
  "dynamic_content_rules": [{ "bloc_concerne": "string", "regle": "string", "fallback": "string" }],
  "metriques_cibles": { "taux_ouverture_vise": "string", "taux_clic_vise": "string", "benchmark_industrie": "string" },
  "tone_of_voice": "string",
  "campaign_id": null,
  "priorite": "haute|moyenne|basse",
  "sources_utilisees": ["string"]
}`;

const CAMPAIGNS_SCHEMA = `{
  "id": "string (camp-001, camp-002)",
  "nom": "string",
  "objectif": "string",
  "persona_principal": "string",
  "duree": "string",
  "strategie_resumee": "string",
  "recos_ads_ids": ["string"],
  "recos_offers_ids": ["string"],
  "recos_emails_ids": ["string"],
  "timeline": [{ "jour": "string", "action": "string", "canal": "string" }]
}`;

// ── Base system prompt ─────────────────────────────────────────────────

function buildBaseSystemPrompt(): string {
  return `Tu es le directeur marketing IA d'Ask-It. Tu génères des recommandations marketing ultra-détaillées et immédiatement actionnables pour des marques e-commerce DTC.

RÈGLES ABSOLUES :
1. Ne recommande JAMAIS un produit hors du catalogue fourni dans le contexte marque
2. Tout le contenu visible (scripts, hooks, ad copies, lignes d'objet) EN FRANÇAIS, prêt à l'emploi
3. Les prompts IA de génération visuelle doivent être EN ANGLAIS
4. Utilise les VRAIS prix des produits du catalogue
5. Cible un persona SPÉCIFIQUE identifié dans les données pour chaque recommandation
6. Ne pas inventer d'URLs — mettre null si pas de lien vérifié
7. Les inspirations doivent citer des VRAIES marques connues (pas fictives)
8. Ton de la marque : bienveillant, expert, naturel, rassurant pour les parents
9. INTERDICTION : emojis dans les textes, jargon non expliqué
10. Chaque recommandation doit être UNIQUE — formats, personas et angles variés

Retourne UNIQUEMENT un JSON valide. Pas de markdown, pas de backticks, pas de texte avant ou après.`;
}

// ── Quota helpers ──────────────────────────────────────────────────────
// Le quota est maintenant MENSUEL (pas hebdomadaire).
// Source de vérité : client_plan.recos_monthly_limit (24/60/240)
// Fallback legacy : recommendation_usage.monthly_limit

async function getQuota(supabase: any) {
  const monthYear = getCurrentMonthYear();

  // Lire le plan client pour avoir la vraie limite mensuelle
  const { data: planData } = await supabase
    .from("client_plan")
    .select("plan, recos_monthly_limit")
    .eq("project_id", PROJECT_ID)
    .maybeSingle();

  const planLimits: Record<string, number> = { starter: 24, growth: 60, scale: 240 };
  const planName = planData?.plan ?? "growth";
  const monthlyLimit = planData?.recos_monthly_limit ?? planLimits[planName] ?? 60;

  // Compter les recos générées ce mois dans marketing_recommendations (source unique)
  const now = new Date();
  const utcMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const utcNextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

  const { count: usedCount } = await supabase
    .from("marketing_recommendations")
    .select("*", { count: "exact", head: true })
    .gte("generated_at", utcMonthStart)
    .lt("generated_at", utcNextMonthStart);

  const totalGenerated = usedCount ?? 0;

  // Aussi récupérer le log depuis recommendation_usage pour backward compat
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

async function updateQuota(
  supabase: any,
  type: string,
  recommendationId: string,
  count: number
) {
  const monthYear = getCurrentMonthYear();
  const { data: existing } = await supabase
    .from("recommendation_usage")
    .select("*")
    .eq("project_id", PROJECT_ID)
    .eq("month_year", monthYear)
    .maybeSingle();
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    count,
    recommendation_id: recommendationId,
  };
  if (!existing) {
    await supabase.from("recommendation_usage").insert({
      project_id: PROJECT_ID,
      month_year: monthYear,
      total_generated: count,
      monthly_limit: 36,
      plan: "starter",
      generations_log: [logEntry],
    });
  } else {
    await supabase
      .from("recommendation_usage")
      .update({
        total_generated: existing.total_generated + count,
        generations_log: [...(existing.generations_log || []), logEntry],
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", PROJECT_ID)
      .eq("month_year", monthYear);
  }
}

// ── Claude Sonnet 4.6 ─────────────────────────────────────────────────

async function callSonnet(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  timeoutMs = 120000,
  sonnetModel = "claude-sonnet-4-6"
): Promise<{ text: string; tokens: number; inputTokens: number; outputTokens: number; modelUsed: string }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

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
        model: sonnetModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude Sonnet 4.6 error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    const tokens =
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Empty response from Claude Sonnet 4.6");
    return { text, tokens, inputTokens, outputTokens, modelUsed: sonnetModel };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── V2 → V1 conversion (backward compat) ──────────────────────────────

function convertV2toV1(result: any) {
  const ads = result.ads_v2 || [];
  const emails = result.emails_v2 || [];
  const offers = result.offers_v2 || [];

  const ads_recommendations = {
    hooks_creatifs: ads.map((a: any) => ({
      text: a.contenu_creatif?.hook_text || a.title,
      personas: [a.persona_cible],
      rationale: a.angle_psychologique || "",
    })),
    concepts_video: ads
      .filter((a: any) => ["reel", "ugc_video", "story_video"].includes(a.format))
      .map((a: any) => ({
        title: a.title,
        personas: [a.persona_cible],
        description:
          a.contenu_creatif?.descriptif_visuel ||
          a.contenu_creatif?.script_complet ||
          "",
      })),
    angles_psychologiques: ads.map((a: any) => ({
      angle: a.angle_psychologique || "",
      personas: [a.persona_cible],
      source: a.sources_utilisees?.[0] || "",
    })),
    ciblage: ads.map((a: any) => ({
      audience: (a.ciblage_detaille?.audiences_suggested || []).join(", "),
      personas: [a.persona_cible],
    })),
  };
  if (ads_recommendations.hooks_creatifs.length === 0) {
    ads_recommendations.hooks_creatifs = [{ text: "", personas: [], rationale: "" }];
  }

  const email_recommendations = {
    newsletters: emails
      .filter((e: any) => e.type_email === "newsletter")
      .map((e: any) => ({
        title: e.title,
        personas: [e.persona_cible],
        type: "educatif",
        sujet: e.objet,
        contenu_cle: e.messaging_principal,
        cta: e.cta_principal?.texte || "",
        frequence: e.timing,
        segment: e.segment_klaviyo,
        justification: "",
      })),
    flows_automatises: emails
      .filter((e: any) => e.type_email !== "newsletter")
      .map((e: any) => ({
        title: e.title,
        personas: [e.persona_cible],
        sequence: e.position_dans_flow?.position || "",
        trigger: e.trigger || "",
        justification: "",
      })),
    lignes_objet: emails.map((e: any) => ({
      text: e.objet,
      personas: [e.persona_cible],
      context: e.type_email,
    })),
    segmentation: emails.map((e: any) => ({
      segment: e.segment_klaviyo,
      personas: [e.persona_cible],
      action: e.title,
    })),
  };

  const offers_recommendations = {
    bundles: offers
      .filter((o: any) => ["bundle", "offre_limitee"].includes(o.type_offre))
      .map((o: any) => ({
        name: o.title,
        personas: [o.persona_cible],
        produits: (o.composition || []).map((c: any) => c.produit).join(", "),
        prix: `${o.pricing_strategy?.prix_bundle || ""} (au lieu de ${o.pricing_strategy?.prix_unitaire_total || ""}, soit ${o.pricing_strategy?.economie_affichee || ""})`,
        rationale: o.concept,
      })),
    prix_psychologiques: offers
      .filter((o: any) => o.type_offre === "prix_psychologique")
      .map((o: any) => ({
        strategie: o.concept,
        rationale: o.pricing_strategy?.ancrage_prix || "",
      })),
    upsells: offers
      .filter((o: any) => ["upsell", "cross_sell"].includes(o.type_offre))
      .map((o: any) => ({
        trigger: o.title,
        action: o.concept,
        taux_acceptation_estime: o.metriques_succes?.seuil_succes || "",
      })),
  };

  return { ads_recommendations, email_recommendations, offers_recommendations };
}

// ── Build user prompt from market intelligence ─────────────────────────

function buildUserPrompt(
  type: GenerationType,
  intelligence: any
): string {
  const { gemini_ads_analysis, gemini_email_analysis, gemini_offers_analysis, personas_snapshot, client_context } = intelligence;

  const personasStr = JSON.stringify(personas_snapshot || {}, null, 2);
  const clientStr = JSON.stringify(client_context || {}, null, 2);

  const contextFooter = `\n\n=== PERSONAS DE LA MARQUE ===\n${personasStr}\n\n=== CONTEXTE MARQUE (produits, prix, positionnement) ===\n${clientStr}`;

  if (type === "single_ad" || type === "ads") {
    const count = type === "single_ad" ? 1 : 3;
    const idBase = type === "single_ad" ? `rec-ads-single-${Date.now()}` : "rec-ads-001, rec-ads-002, rec-ads-003";
    return `Voici l'analyse de marché Ads pour le secteur de la marque :

=== ANALYSE ADS (Gemini 3.1 Pro) ===
${JSON.stringify(gemini_ads_analysis?.analysis || {}, null, 2)}

=== INSIGHTS PAR PERSONA (Ads) ===
${JSON.stringify(gemini_ads_analysis?.personas_insights || [], null, 2)}
${contextFooter}

Génère EXACTEMENT ${count} recommandation${count > 1 ? "s" : ""} Ads complète${count > 1 ? "s" : ""} et actionnable${count > 1 ? "s" : ""}.
${count > 1 ? "Varie les formats (au moins 1 vidéo et 1 statique/carousel), les personas ciblés, et les funnel stages." : "Choisis le format le plus pertinent."}
IDs : ${idBase}

Retourne UNIQUEMENT : { "ads_v2": [ ... ] }
Schéma par recommandation :
${ADS_V2_SCHEMA}`;
  }

  if (type === "single_offer" || type === "offers") {
    const count = type === "single_offer" ? 1 : 3;
    const idBase = type === "single_offer" ? `rec-offers-single-${Date.now()}` : "rec-offers-001, rec-offers-002, rec-offers-003";
    return `Voici l'analyse de marché Offres & Bundles pour le secteur de la marque :

=== ANALYSE OFFRES (Gemini 3.1 Pro) ===
${JSON.stringify(gemini_offers_analysis?.analysis || {}, null, 2)}

=== INSIGHTS PAR PERSONA (Offres) ===
${JSON.stringify(gemini_offers_analysis?.personas_insights || [], null, 2)}
${contextFooter}

Génère EXACTEMENT ${count} recommandation${count > 1 ? "s" : ""} Offres & Bundles complète${count > 1 ? "s" : ""} et actionnable${count > 1 ? "s" : ""}.
${count > 1 ? "Varie les types d'offres (bundle, upsell, prix psychologique, offre limitée, etc.)." : "Choisis le type d'offre le plus pertinent."}
IDs : ${idBase}

Retourne UNIQUEMENT : { "offers_v2": [ ... ] }
Schéma par recommandation :
${OFFERS_V2_SCHEMA}`;
  }

  if (type === "single_email" || type === "emails") {
    const count = type === "single_email" ? 1 : 3;
    const idBase = type === "single_email" ? `rec-emails-single-${Date.now()}` : "rec-emails-001, rec-emails-002, rec-emails-003";
    return `Voici l'analyse de marché Email Marketing pour le secteur de la marque :

=== ANALYSE EMAIL (Gemini 3.1 Pro) ===
${JSON.stringify(gemini_email_analysis?.analysis || {}, null, 2)}

=== INSIGHTS PAR PERSONA (Email) ===
${JSON.stringify(gemini_email_analysis?.personas_insights || [], null, 2)}
${contextFooter}

Génère EXACTEMENT ${count} recommandation${count > 1 ? "s" : ""} Email complète${count > 1 ? "s" : ""} et actionnable${count > 1 ? "s" : ""}.
${count > 1 ? "Varie les types (newsletter, flow automation, campagne promo, winback, etc.)." : "Choisis le type d'email le plus pertinent."}
IDs : ${idBase}

Retourne UNIQUEMENT : { "emails_v2": [ ... ] }
Schéma par recommandation :
${EMAILS_V2_SCHEMA}`;
  }

  return "";
}

// ── Finalize prompt ───────────────────────────────────────────────────

function buildFinalizePrompt(
  rec: any,
  intelligence: any
): string {
  const adsSummary = (rec.ads_v2 || []).map((a: any) => ({
    id: a.id, title: a.title, persona: a.persona_cible, format: a.format,
  }));
  const offersSummary = (rec.offers_v2 || []).map((o: any) => ({
    id: o.id, title: o.title, persona: o.persona_cible, type: o.type_offre,
  }));
  const emailsSummary = (rec.emails_v2 || []).map((e: any) => ({
    id: e.id, title: e.title, persona: e.persona_cible, type: e.type_email,
  }));

  return `Voici les 9 recommandations générées cette semaine pour la marque :

=== ADS (3) ===
${JSON.stringify(adsSummary, null, 2)}

=== OFFRES (3) ===
${JSON.stringify(offersSummary, null, 2)}

=== EMAILS (3) ===
${JSON.stringify(emailsSummary, null, 2)}

=== CONTEXTE MARQUE ===
${JSON.stringify(intelligence.client_context || {}, null, 2)}

=== PERSONAS ===
${JSON.stringify(intelligence.personas_snapshot || {}, null, 2)}

GÉNÈRE :
1. campaigns_overview : 1-2 campagnes transversales liant les recommandations entre elles (IDs : camp-001, camp-002)
   Schéma par campagne : ${CAMPAIGNS_SCHEMA}
2. checklist : 5 tâches actionnables et prioritaires pour la semaine
   Schéma par tâche : {"id":"string","title":"string","category":"ads|email|offers","completed":false,"detail":{}}
3. persona_focus : les 3 personas prioritaires
   Schéma : {"roi":{"code":"string","name":"string","reason":"string"},"growth":{"code":"string","name":"string","reason":"string"},"ltv":{"code":"string","name":"string","reason":"string"}}

Retourne UNIQUEMENT : { "campaigns_overview": [...], "checklist": [...], "persona_focus": {...} }`;
}

// ── Mini checklist for category generation ─────────────────────────────

function buildMiniChecklistPrompt(
  type: "ads" | "offers" | "emails",
  generatedItems: any[],
  intelligence: any
): string {
  const catLabel =
    type === "ads" ? "publicités" : type === "offers" ? "offres" : "emails";
  const summary = generatedItems.map((i: any) => ({
    id: i.id,
    title: i.title,
    persona: i.persona_cible,
  }));
  return `Voici les ${generatedItems.length} recommandations ${catLabel} générées :
${JSON.stringify(summary, null, 2)}

=== CONTEXTE MARQUE ===
${JSON.stringify(intelligence.client_context || {}, null, 2)}

Génère 2 tâches actionnables directement liées à ces recommandations ${catLabel}.
Retourne UNIQUEMENT : {
  "checklist": [{"id":"string","title":"string","category":"${type}","completed":false,"detail":{}}],
  "persona_focus": {"roi":{"code":"string","name":"string","reason":"string"},"growth":{"code":"string","name":"string","reason":"string"},"ltv":{"code":"string","name":"string","reason":"string"}}
}`;
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
    // GET — Retourne toutes les recommandations + quota
    // ════════════════════════════════════════════════════════
    if (req.method === "GET") {
      const [recsResult, quota, intelligenceResult] = await Promise.all([
        supabase
          .from("marketing_recommendations")
          .select("*")
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
    // POST — Génération de recommandations
    // ════════════════════════════════════════════════════════
    if (req.method === "POST") {
      const startTime = Date.now();
      let body: any = {};
      try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
      } catch (_) {}

      const { type, recommendation_id } = body as {
        type: GenerationType;
        recommendation_id?: string;
      };

      if (!type) {
        return new Response(
          JSON.stringify({ error: "type is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[generate-marketing] POST type="${type}" recommendation_id="${recommendation_id || "new"}"`);

      // ── STEP 1 : VÉRIFICATION QUOTA ────────────────────────────────
      // Pour finalize : pas de check quota (déjà déduit lors de l'appel ads initial)
      if (type !== "finalize") {
        const creditsNeeded =
          type === "global" ? 9 : type.startsWith("single_") ? 1 : 3;
        const quota = await getQuota(supabase);

        if (quota.total_generated + creditsNeeded > quota.monthly_limit) {
          return new Response(
            JSON.stringify({
              error: "quota_exceeded",
              current: quota.total_generated,
              limit: quota.monthly_limit,
              remaining: quota.remaining,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // ── STEP 2 : LECTURE MARKET_INTELLIGENCE ──────────────────────
      const { data: intelligence, error: intelligenceError } = await supabase
        .from("market_intelligence")
        .select("*")
        .eq("project_id", PROJECT_ID)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intelligenceError || !intelligence) {
        console.error("[generate-marketing] No market intelligence found");
        return new Response(
          JSON.stringify({
            error: "no_intelligence",
            message:
              "Aucune analyse de marché disponible. Lancez d'abord l'intelligence mensuelle via monthly-market-intelligence.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[generate-marketing] Using market_intelligence from ${intelligence.month_year} (status: ${intelligence.status})`);

      const weekStart = getMonday(new Date());

      // ── STEP 3 : APPEL CLAUDE SONNET 4.6 ─────────────────────────
      const baseSystem = buildBaseSystemPrompt();

      // ── Case: FINALIZE ──────────────────────────────────────────
      if (type === "finalize") {
        if (!recommendation_id) {
          return new Response(
            JSON.stringify({ error: "recommendation_id required for finalize" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: existingRec, error: recErr } = await supabase
          .from("marketing_recommendations")
          .select("*")
          .eq("id", recommendation_id)
          .single();

        if (recErr || !existingRec) {
          return new Response(
            JSON.stringify({ error: "Recommendation not found", id: recommendation_id }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("[generate-marketing] Finalize: generating campaigns + checklist...");
        const finalizePrompt = buildFinalizePrompt(existingRec, intelligence);

        const { text, tokens, inputTokens, outputTokens, modelUsed } = await callSonnet(baseSystem, finalizePrompt, 16000, 130000);
        await logUsage(supabase, "anthropic", modelUsed, { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: tokens }, { type: "finalize", rec_id: recommendation_id });

        let parsed: any;
        try {
          parsed = JSON.parse(cleanJsonResponse(text));
        } catch (parseErr) {
          console.error("[generate-marketing] Finalize JSON parse error:", text.slice(0, 500));
          return new Response(
            JSON.stringify({ error: "parse_failed", message: "La réponse IA n'a pas pu être interprétée", step: "finalize" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const campaignsResult = parsed.campaigns_overview || [];
        const checklistResult = parsed.checklist || [];
        const personaFocus = parsed.persona_focus || {};

        // Link campaign IDs into reco items
        const updatedAds = [...(existingRec.ads_v2 || [])];
        const updatedOffers = [...(existingRec.offers_v2 || [])];
        const updatedEmails = [...(existingRec.emails_v2 || [])];
        for (const camp of campaignsResult) {
          for (const id of camp.recos_ads_ids || []) {
            const r = updatedAds.find((a: any) => a.id === id);
            if (r) r.campaign_id = camp.id;
          }
          for (const id of camp.recos_offers_ids || []) {
            const r = updatedOffers.find((o: any) => o.id === id);
            if (r) r.campaign_id = camp.id;
          }
          for (const id of camp.recos_emails_ids || []) {
            const r = updatedEmails.find((e: any) => e.id === id);
            if (r) r.campaign_id = camp.id;
          }
        }

        const v1Data = convertV2toV1({ ads_v2: updatedAds, offers_v2: updatedOffers, emails_v2: updatedEmails });

        const { error: updateErr } = await supabase
          .from("marketing_recommendations")
          .update({
            ads_v2: updatedAds,
            offers_v2: updatedOffers,
            emails_v2: updatedEmails,
            campaigns_overview: campaignsResult,
            checklist: checklistResult,
            persona_focus: personaFocus,
            generated_at: new Date().toISOString(),
            generated_categories: ["ads", "offers", "emails"],
            generation_type: "global",
            ...v1Data,
          })
          .eq("id", recommendation_id);

        if (updateErr) throw new Error(`Finalize update error: ${updateErr.message}`);

        // Update quota for the full global (9 credits)
        await updateQuota(supabase, "global", recommendation_id, 9);

        console.log(`[generate-marketing] Finalize done: ${campaignsResult.length} campaigns, ${checklistResult.length} checklist items`);

        const { data: recommendations } = await supabase
          .from("marketing_recommendations")
          .select("*")
          .eq("status", "active")
          .order("generated_at", { ascending: false });

        const quota = await getQuota(supabase);

        return new Response(
          JSON.stringify({
            success: true,
            recommendation_id,
            duration_ms: Date.now() - startTime,
            recommendations: recommendations || [],
            quota,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── Case: CATEGORY OR SINGLE with optional recommendation_id ──

      // Validate type
      const validTypes: GenerationType[] = ["ads", "offers", "emails", "single_ad", "single_offer", "single_email"];
      if (!validTypes.includes(type)) {
        return new Response(
          JSON.stringify({ error: `Invalid type: ${type}. Use one of: ${validTypes.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userPrompt = buildUserPrompt(type, intelligence);
      const isSingle = type.startsWith("single_");
      const maxTokens = 16000;

      console.log(`[generate-marketing] Calling Sonnet 4.6 for type="${type}" maxTokens=${maxTokens}...`);

      let sonnetText: string;
      let sonnetTokens: number;
      let sonnetInputTokens: number;
      let sonnetOutputTokens: number;
      let sonnetModelUsed: string;

      try {
        const result = await callSonnet(baseSystem, userPrompt, maxTokens, 130000);
        sonnetText = result.text;
        sonnetTokens = result.tokens;
        sonnetInputTokens = result.inputTokens;
        sonnetOutputTokens = result.outputTokens;
        sonnetModelUsed = result.modelUsed;
      } catch (sonnetErr: any) {
        console.error("[generate-marketing] Sonnet failed:", sonnetErr.message);
        return new Response(
          JSON.stringify({
            error: "generation_failed",
            message: sonnetErr.message || "La génération IA a échoué. Veuillez réessayer.",
            step: "sonnet",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await logUsage(supabase, "anthropic", sonnetModelUsed!, { input_tokens: sonnetInputTokens!, output_tokens: sonnetOutputTokens!, total_tokens: sonnetTokens! }, { type, has_rec_id: !!recommendation_id });

      // ── Parse ─────────────────────────────────────────────────────
      let parsed: any;
      try {
        parsed = JSON.parse(cleanJsonResponse(sonnetText));
      } catch (parseErr) {
        console.error("[generate-marketing] JSON parse error:", sonnetText.slice(0, 500));
        return new Response(
          JSON.stringify({ error: "parse_failed", message: "La réponse IA n'a pas pu être interprétée" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adsItems: any[] = parsed.ads_v2 || [];
      const offersItems: any[] = parsed.offers_v2 || [];
      const emailsItems: any[] = parsed.emails_v2 || [];

      const category =
        type === "ads" || type === "single_ad"
          ? "ads"
          : type === "offers" || type === "single_offer"
          ? "offers"
          : "emails";

      const actualCount = adsItems.length + offersItems.length + emailsItems.length;
      console.log(`[generate-marketing] Sonnet returned ${actualCount} items for type="${type}"`);

      // ── Persist ───────────────────────────────────────────────────
      const generationConfig = {
        models_used: {
          intelligence: "perplexity/sonar-pro + google/gemini-3.1-pro-preview",
          generation: "anthropic/claude-sonnet-4-6",
        },
        market_intelligence_id: intelligence.id,
        market_intelligence_month: intelligence.month_year,
        generation_duration_ms: Date.now() - startTime,
        type,
      };

      let savedRecId: string;

      if (recommendation_id) {
        // UPDATE existing row (part of a global flow)
        const { data: existingRec } = await supabase
          .from("marketing_recommendations")
          .select("ads_v2, offers_v2, emails_v2, generated_categories")
          .eq("id", recommendation_id)
          .single();

        const existingCategories: string[] = Array.isArray(existingRec?.generated_categories)
          ? existingRec.generated_categories
          : [];
        const newCategories = existingCategories.includes(category)
          ? existingCategories
          : [...existingCategories, category];

        const updatePayload: any = {
          generated_categories: newCategories,
          generation_config: generationConfig,
        };
        if (category === "ads") updatePayload.ads_v2 = adsItems;
        if (category === "offers") updatePayload.offers_v2 = offersItems;
        if (category === "emails") updatePayload.emails_v2 = emailsItems;

        const { error: updateErr } = await supabase
          .from("marketing_recommendations")
          .update(updatePayload)
          .eq("id", recommendation_id);

        if (updateErr) throw new Error(`Update error: ${updateErr.message}`);
        savedRecId = recommendation_id;
        console.log(`[generate-marketing] Updated existing rec ${recommendation_id} with ${category}`);
      } else {
        // CREATE new row
        let checklistItems: any[] = [];
        let personaFocus: any = {};

        // Mini checklist only for category (not single)
        if (!isSingle) {
          try {
            const items = category === "ads" ? adsItems : category === "offers" ? offersItems : emailsItems;
            const miniPrompt = buildMiniChecklistPrompt(category as any, items, intelligence);
            const { text: miniText, tokens: miniTokens, inputTokens: miniInput, outputTokens: miniOutput, modelUsed: miniModel } = await callSonnet(baseSystem, miniPrompt, 1500, 30000);
            await logUsage(supabase, "anthropic", miniModel, { input_tokens: miniInput, output_tokens: miniOutput, total_tokens: miniTokens }, { type: "mini_checklist", category });
            const mini = JSON.parse(cleanJsonResponse(miniText));
            checklistItems = mini.checklist || [];
            personaFocus = mini.persona_focus || {};
          } catch (miniErr) {
            console.warn("[generate-marketing] Mini checklist failed (non-blocking):", (miniErr as Error).message);
          }
        }

        const v1Data = convertV2toV1({ ads_v2: adsItems, offers_v2: offersItems, emails_v2: emailsItems });

        const { data: inserted, error: insertErr } = await supabase
          .from("marketing_recommendations")
          .insert({
            week_start: weekStart,
            generated_at: new Date().toISOString(),
            status: "active",
            recommendation_version: 2,
            generation_type: type,
            generated_categories: [category],
            ads_v2: adsItems,
            offers_v2: offersItems,
            emails_v2: emailsItems,
            campaigns_overview: [],
            checklist: checklistItems,
            persona_focus: personaFocus,
            sources_consulted: [],
            generation_config: generationConfig,
            ...v1Data,
          })
          .select()
          .single();

        if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
        savedRecId = inserted.id;
        console.log(`[generate-marketing] Created new rec ${savedRecId} for type="${type}"`);

        // Update quota for standalone category/single
        const creditsUsed = isSingle ? 1 : 3;
        await updateQuota(supabase, type, savedRecId, creditsUsed);
      }

      // ── Return ─────────────────────────────────────────────────────
      const [recsResult, quotaResult] = await Promise.all([
        supabase
          .from("marketing_recommendations")
          .select("*")
          .eq("status", "active")
          .order("generated_at", { ascending: false }),
        getQuota(supabase),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          recommendation_id: savedRecId,
          type,
          category,
          items_count: actualCount,
          duration_ms: Date.now() - startTime,
          recommendations: recsResult.data || [],
          quota: quotaResult,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[generate-marketing] Unhandled error:", err);
    reportEdgeFunctionError("generate-marketing-recommendations", err, { type: "cron_failure", severity: "critical" });
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
