import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GenerationType = "global" | "ads" | "offers" | "emails" | "single_ad" | "single_offer" | "single_email";

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

function logUsage(provider: string, model: string, tokens: number, metadata?: Record<string, any>) {
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    .from("api_usage_logs")
    .insert({ edge_function: "generate-marketing-recommendations", api_provider: provider, model, tokens_used: tokens, api_calls: 1, metadata: metadata || {} })
    .then(() => {}).catch(() => {});
}

/** Cost in credits per type */
function costForType(type: GenerationType): number {
  if (type === "global") return 9;
  if (type === "ads" || type === "offers" || type === "emails") return 3;
  return 1; // single_*
}

const SOURCES_CONSULTED = [
  "motionapp.com", "klaviyo.com", "flighted.co", "triplewhale.com",
  "rebuyengine.com", "j7media.com", "commonthreadco.com", "chasedimond.com",
  "baymard.com", "growth.design", "shopify.com", "bigcommerce.com",
];

const PROJECT_ID = "ouate";

// ── Schema fragments ──────────────────────────────────────────────────
const ADS_V2_SCHEMA = JSON.stringify({
  id: "string", title: "string", persona_cible: "PX",
  format: "reel|story|carousel|static|ugc",
  funnel_stage: "awareness|consideration|conversion|retention",
  contenu_creatif: { hook_text: "string|null", hook_audio: "string|null", script_complet: "string|null", descriptif_visuel: "string", headline_image: "string|null", body_copy: "string|null", slides: null, direction_artistique: "string" },
  ad_copy: { primary_text: "string", headline: "string", description: "string" },
  cta: "string", angle_psychologique: "string",
  ciblage_detaille: { audiences_suggested: ["string"], exclusions: ["string"], custom_audience_source: "string|null" },
  ab_test_suggestion: { element_a_tester: "string", variante_a: "string", variante_b: "string", raison: "string", duree_test_recommandee: "string" },
  landing_page_alignement: { url_destination: null, elements_coherence: ["string"] },
  prompt_ia_generation: "string en anglais",
  inspirations: [{ description: "string", marque: "string", pourquoi: "string", url: null }],
  budget_suggere: "string", placement: "string", plateforme: "meta|tiktok|both",
  kpi_attendu: "string", campaign_id: "string|null", priorite: "haute|moyenne|basse", sources_utilisees: ["string"],
});

const OFFERS_V2_SCHEMA = JSON.stringify({
  id: "string", title: "string", persona_cible: "PX",
  type_offre: "bundle|upsell|cross_sell|offre_limitee|prix_psychologique|fidelite",
  concept: "string",
  composition: [{ produit: "string", role_dans_bundle: "string" }],
  pricing_strategy: { prix_unitaire_total: "string", prix_bundle: "string", economie_affichee: "string", ancrage_prix: "string" },
  marge_estimee: { cout_revient_estime: "string", marge_brute_pourcent: "string", commentaire: "string" },
  plan_de_lancement: { phase_teasing: { duree: "string", actions: ["string"] }, phase_lancement: { duree: "string", actions: ["string"] }, phase_relance: { duree: "string", actions: ["string"] } },
  messaging_par_canal: { ads: "string", email: "string", site: "string" },
  angle_marketing: "string", urgency_trigger: "string|null",
  canal_distribution: "site|email|ads|tous", periode_recommandee: "string",
  metriques_succes: { kpis_a_surveiller: ["string"], seuil_succes: "string", action_si_echec: "string" },
  campaign_id: "string|null", priorite: "haute|moyenne|basse", sources_utilisees: ["string"],
});

const EMAILS_V2_SCHEMA = JSON.stringify({
  id: "string", title: "string", persona_cible: "PX",
  type_email: "newsletter|flow_automation|campagne_promo|relance|post_diagnostic|winback",
  objet: "string", objet_variante: "string", preview_text: "string",
  structure_sections: [{ section: "string", contenu: "string", conseil_design: "string" }],
  messaging_principal: "string",
  cta_principal: { texte: "string", url_destination: null, couleur_suggeree: "string" },
  segment_klaviyo: "string", trigger: "string", timing: "string",
  position_dans_flow: { flow_name: "string", position: "string", email_precedent: "string|null", email_suivant: "string|null", logique_branchement: "string" },
  dynamic_content_rules: [{ bloc_concerne: "string", regle: "string", fallback: "string" }],
  metriques_cibles: { taux_ouverture_vise: "string", taux_clic_vise: "string", benchmark_industrie: "string" },
  tone_of_voice: "string", campaign_id: "string|null", priorite: "haute|moyenne|basse", sources_utilisees: ["string"],
});

const CAMPAIGNS_SCHEMA = JSON.stringify({
  id: "string", nom: "string", objectif: "string", persona_principal: "string",
  duree: "string", strategie_resumee: "string",
  recos_ads_ids: ["string"], recos_offers_ids: ["string"], recos_emails_ids: ["string"],
  timeline: [{ jour: "string", action: "string", canal: "string" }],
});

// ============================================
// QUOTA
// ============================================
async function getQuota(supabase: any) {
  const monthYear = getCurrentMonthYear();
  const { data } = await supabase
    .from("recommendation_usage").select("*")
    .eq("project_id", PROJECT_ID).eq("month_year", monthYear).maybeSingle();
  const usage = data || { total_generated: 0, monthly_limit: 36, plan: "starter", generations_log: [] };
  return {
    total_generated: usage.total_generated,
    monthly_limit: usage.monthly_limit,
    remaining: usage.monthly_limit - usage.total_generated,
    plan: usage.plan,
    generations_log: usage.generations_log || [],
  };
}

async function updateQuota(supabase: any, type: GenerationType, recommendationId: string, actualCount: number) {
  const monthYear = getCurrentMonthYear();
  const { data: existing } = await supabase
    .from("recommendation_usage").select("*")
    .eq("project_id", PROJECT_ID).eq("month_year", monthYear).maybeSingle();
  const logEntry = { timestamp: new Date().toISOString(), type, count: actualCount, recommendation_id: recommendationId };
  if (!existing) {
    await supabase.from("recommendation_usage").insert({
      project_id: PROJECT_ID, month_year: monthYear, total_generated: actualCount,
      monthly_limit: 36, plan: "starter", generations_log: [logEntry],
    });
  } else {
    await supabase.from("recommendation_usage").update({
      total_generated: existing.total_generated + actualCount,
      generations_log: [...(existing.generations_log || []), logEntry],
      updated_at: new Date().toISOString(),
    }).eq("project_id", PROJECT_ID).eq("month_year", monthYear);
  }
}

// ============================================
// CLAUDE SONNET 4.6 — SINGLE SUB-CALL HELPER
// ============================================
async function callOpusSingle(systemPrompt: string, userPrompt: string, maxTokens: number, timeoutMs: number): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude Sonnet 4.6 ${response.status}: ${errText}`);
    }
    const data = await response.json();
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    logUsage("anthropic/claude-sonnet-4.6", "claude-sonnet-4-6", tokens);
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Empty response from Claude Sonnet 4.6");
    return text;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ============================================
// BASE SYSTEM PROMPT (shared)
// ============================================
function buildBaseSystemPrompt(clientContext: any, personaRows: any[]): string {
  const personaDescriptions = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => `- ${p.code} : ${p.full_label} : ${p.description || ""}`)
    .join("\n");
  return [
    `Tu es le directeur marketing IA d'Ask-It. Tu génères des recommandations marketing pour des marques e-commerce.`,
    ``,
    `RÈGLES ABSOLUES :`,
    `- Ne recommande JAMAIS un produit qui n'existe pas dans le catalogue`,
    `- Chaque recommandation doit être IMMÉDIATEMENT ACTIONNABLE`,
    `- Scripts, hooks, ad copies et lignes d'objet EN FRANÇAIS, prêts à l'emploi`,
    `- Prompts IA EN ANGLAIS`,
    `- Utilise les vrais prix des produits`,
    `- Cible un persona spécifique pour chaque recommandation`,
    `- Inspirations = VRAIES marques connues`,
    `- Ne pas inventer d'URLs — mettre null`,
    `- Ton : ${clientContext.tone}`,
    `- Recommandations VARIÉES en formats, angles et personas`,
    `- Prénoms des personas dans les textes visibles (pas les codes PX)`,
    `- INTERDICTION : emojis, jargon non expliqué`,
    ``,
    `CATALOGUE :`,
    clientContext.products.map((p: any) => `- ${p.name} (${p.type}) — ${p.price}€`).join("\n"),
    ``,
    `PERSONAS :`,
    personaDescriptions,
    ``,
    `Retourne un JSON STRICT. Aucun texte avant ou après. Pas de markdown. Juste le JSON.`,
  ].join("\n");
}

// ============================================
// COMMON CONTEXT BLOCK
// ============================================
function buildCommonContext(geminiSynthesis: any, perplexityResearch: any, collectedData: any, clientContext: any): string {
  const { priorities } = collectedData;
  const p = priorities;
  let contextBlock = "";
  if (geminiSynthesis) {
    contextBlock = `=== SYNTHÈSE ANALYTIQUE (Gemini) ===\n${JSON.stringify(geminiSynthesis, null, 2)}`;
  } else if (perplexityResearch) {
    const { adsResearch = "", emailResearch = "", offersResearch = "" } = perplexityResearch;
    contextBlock = [
      `=== DONNÉES MARCHÉ BRUTES (Perplexity) ===`,
      `--- Ads ---`, adsResearch || "Non disponible",
      `--- Email ---`, emailResearch || "Non disponible",
      `--- Offres ---`, offersResearch || "Non disponible",
    ].join("\n");
  }
  return [
    contextBlock,
    ``,
    `=== DONNÉES PERSONAS PRIORITAIRES ===`,
    `- ROI : ${p.best_roi?.code} ${p.best_roi?.name} — valeur/session: ${p.best_roi_value}€`,
    `- Growth : ${p.best_growth?.code} ${p.best_growth?.name} — CA potentiel: +${p.best_growth_ca}€`,
    `- LTV : ${p.best_ltv?.code} ${p.best_ltv?.name} — score: ${p.best_ltv_score}`,
    ``,
    `=== CONTEXTE MARQUE ===`,
    `${clientContext.brand} — ${clientContext.description}`,
    `Produits : ${clientContext.products.map((p: any) => `${p.name} (${p.price}€)`).join(", ")}`,
    `Code promo : ${clientContext.promoCode}`,
  ].join("\n");
}

// ============================================
// CLAUDE SONNET 4.6 — ORCHESTRATED GENERATION
// ============================================
async function callClaudeOpus(
  geminiSynthesis: any,
  collectedData: any,
  clientContext: any,
  perplexityResearch: any,
  type: GenerationType
): Promise<{ result: any; actualCount: number }> {
  const personaRows = collectedData?.personaRows || [];
  const baseSystem = buildBaseSystemPrompt(clientContext, personaRows);
  const commonCtx = buildCommonContext(geminiSynthesis, perplexityResearch, collectedData, clientContext);
  const ts = Date.now();

  // ── CASE 1: SINGLE GENERATION (1 reco, 1 crédit) ──────────────────
  if (type.startsWith("single_")) {
    const category = type.replace("single_", ""); // ad | offer | email
    console.log(`[generate-marketing] Sonnet 4.6: single ${category}...`);

    let schemaLine = "";
    let retKey = "";
    let schema = "";
    if (category === "ad") {
      retKey = "ads_v2";
      schema = ADS_V2_SCHEMA;
      schemaLine = [
        `GÉNÈRE EXACTEMENT 1 recommandation Ads. Choisis le format le plus pertinent.`,
        `id = "rec-ads-single-${ts}"`,
        `Retourne UNIQUEMENT : { "ads_v2": [ ... ] }`,
        `Schéma : ${schema}`,
      ].join("\n");
    } else if (category === "offer") {
      retKey = "offers_v2";
      schema = OFFERS_V2_SCHEMA;
      schemaLine = [
        `GÉNÈRE EXACTEMENT 1 recommandation Offre/Bundle. Choisis le type le plus pertinent.`,
        `id = "rec-offers-single-${ts}"`,
        `Retourne UNIQUEMENT : { "offers_v2": [ ... ] }`,
        `Schéma : ${schema}`,
      ].join("\n");
    } else {
      retKey = "emails_v2";
      schema = EMAILS_V2_SCHEMA;
      schemaLine = [
        `GÉNÈRE EXACTEMENT 1 recommandation Email. Choisis le type le plus pertinent.`,
        `id = "rec-emails-single-${ts}"`,
        `Retourne UNIQUEMENT : { "emails_v2": [ ... ] }`,
        `Schéma : ${schema}`,
      ].join("\n");
    }

    const sysPrompt = baseSystem + "\n\n" + schemaLine;
    const raw = await callOpusSingle(sysPrompt, commonCtx, 3000, 25000);
    const parsed = JSON.parse(cleanJsonResponse(raw));
    const items = parsed[retKey] || [];
    console.log(`[generate-marketing] Single ${category}: ${items.length} reco ✅`);

    return {
      result: {
        ads_v2: retKey === "ads_v2" ? items : [],
        offers_v2: retKey === "offers_v2" ? items : [],
        emails_v2: retKey === "emails_v2" ? items : [],
        campaigns_overview: [],
        checklist: [],
        persona_focus: {},
      },
      actualCount: items.length > 0 ? 1 : 0,
    };
  }

  // ── CASE 2: CATEGORY GENERATION (3 recos, 3 crédits) ──────────────
  if (type === "ads" || type === "offers" || type === "emails") {
    console.log(`[generate-marketing] Sonnet 4.6: category ${type}...`);

    let adsResult: any[] = [], offersResult: any[] = [], emailsResult: any[] = [];

    if (type === "ads") {
      const sys = baseSystem + [
        ``,
        `GÉNÈRE EXACTEMENT 3 recommandations Ads. Varie les formats (au moins 1 vidéo et 1 statique/carousel).`,
        `IDs : rec-ads-001, rec-ads-002, rec-ads-003`,
        `Retourne UNIQUEMENT : { "ads_v2": [ ... ] }`,
        `Schéma par reco : ${ADS_V2_SCHEMA}`,
      ].join("\n");
      const raw = await callOpusSingle(sys, commonCtx, 8000, 45000);
      adsResult = (JSON.parse(cleanJsonResponse(raw))).ads_v2 || [];
    } else if (type === "offers") {
      const sys = baseSystem + [
        ``,
        `GÉNÈRE EXACTEMENT 3 recommandations Offres & Bundles. Varie les types.`,
        `IDs : rec-offers-001, rec-offers-002, rec-offers-003`,
        `Retourne UNIQUEMENT : { "offers_v2": [ ... ] }`,
        `Schéma par reco : ${OFFERS_V2_SCHEMA}`,
      ].join("\n");
      const raw = await callOpusSingle(sys, commonCtx, 8000, 45000);
      offersResult = (JSON.parse(cleanJsonResponse(raw))).offers_v2 || [];
    } else {
      const sys = baseSystem + [
        ``,
        `GÉNÈRE EXACTEMENT 3 recommandations Email. Varie les types.`,
        `IDs : rec-emails-001, rec-emails-002, rec-emails-003`,
        `Retourne UNIQUEMENT : { "emails_v2": [ ... ] }`,
        `Schéma par reco : ${EMAILS_V2_SCHEMA}`,
      ].join("\n");
      const raw = await callOpusSingle(sys, commonCtx, 8000, 45000);
      emailsResult = (JSON.parse(cleanJsonResponse(raw))).emails_v2 || [];
    }

    // Mini checklist for the category
    let checklistResult: any[] = [], personaFocus: any = {};
    try {
      const catLabel = type === "ads" ? "publicités" : type === "offers" ? "offres" : "emails";
      const miniSys = baseSystem + [
        ``,
        `Génère 2 tâches actionnables liées aux ${catLabel} recommandées.`,
        `Retourne : { "checklist": [...], "persona_focus": { "roi": {"code":"string","name":"string","reason":"string"}, "growth": {"code":"string","name":"string","reason":"string"}, "ltv": {"code":"string","name":"string","reason":"string"} } }`,
      ].join("\n");
      const miniRaw = await callOpusSingle(miniSys, commonCtx, 1500, 25000);
      const mini = JSON.parse(cleanJsonResponse(miniRaw));
      checklistResult = mini.checklist || [];
      personaFocus = mini.persona_focus || {};
    } catch (e) {
      console.warn("[generate-marketing] Mini checklist failed:", (e as Error).message);
    }

    const recoCount = adsResult.length + offersResult.length + emailsResult.length;
    console.log(`[generate-marketing] Category ${type}: ${recoCount} recos ✅`);
    return {
      result: { ads_v2: adsResult, offers_v2: offersResult, emails_v2: emailsResult, campaigns_overview: [], checklist: checklistResult, persona_focus: personaFocus },
      actualCount: recoCount > 0 ? 3 : 0,
    };
  }

  // ── CASE 3: GLOBAL GENERATION (3+3+3 sub-calls + campaigns) ───────
  console.log("[generate-marketing] Sonnet 4.6: global generation (4 sub-calls)...");
  let adsResult: any[] = [], offersResult: any[] = [], emailsResult: any[] = [];
  let campaignsResult: any[] = [], checklistResult: any[] = [], personaFocus: any = {};

  // Sub-call 1/4: Ads
  try {
    console.log("[generate-marketing] Sub-call 1/4: Ads...");
    const sys = baseSystem + [
      ``,
      `GÉNÈRE EXACTEMENT 3 recommandations Ads. Varie les formats (au moins 1 vidéo et 1 statique/carousel).`,
      `IDs : rec-ads-001, rec-ads-002, rec-ads-003`,
      `Retourne UNIQUEMENT : { "ads_v2": [ ... ] }`,
      `Schéma : ${ADS_V2_SCHEMA}`,
    ].join("\n");
    const raw = await callOpusSingle(sys, commonCtx, 8000, 45000);
    adsResult = (JSON.parse(cleanJsonResponse(raw))).ads_v2 || [];
    console.log(`[generate-marketing] Ads: ${adsResult.length} ✅`);
  } catch (e) { console.error(`[generate-marketing] Ads FAILED:`, (e as Error).message); }

  // Sub-call 2/4: Offers
  try {
    console.log("[generate-marketing] Sub-call 2/4: Offers...");
    const sys = baseSystem + [
      ``,
      `GÉNÈRE EXACTEMENT 3 recommandations Offres & Bundles. Varie les types.`,
      `IDs : rec-offers-001, rec-offers-002, rec-offers-003`,
      `Retourne UNIQUEMENT : { "offers_v2": [ ... ] }`,
      `Schéma : ${OFFERS_V2_SCHEMA}`,
    ].join("\n");
    const raw = await callOpusSingle(sys, commonCtx, 8000, 45000);
    offersResult = (JSON.parse(cleanJsonResponse(raw))).offers_v2 || [];
    console.log(`[generate-marketing] Offers: ${offersResult.length} ✅`);
  } catch (e) { console.error(`[generate-marketing] Offers FAILED:`, (e as Error).message); }

  // Sub-call 3/4: Emails
  try {
    console.log("[generate-marketing] Sub-call 3/4: Emails...");
    const sys = baseSystem + [
      ``,
      `GÉNÈRE EXACTEMENT 3 recommandations Email. Varie les types.`,
      `IDs : rec-emails-001, rec-emails-002, rec-emails-003`,
      `Retourne UNIQUEMENT : { "emails_v2": [ ... ] }`,
      `Schéma : ${EMAILS_V2_SCHEMA}`,
    ].join("\n");
    const raw = await callOpusSingle(sys, commonCtx, 8000, 45000);
    emailsResult = (JSON.parse(cleanJsonResponse(raw))).emails_v2 || [];
    console.log(`[generate-marketing] Emails: ${emailsResult.length} ✅`);
  } catch (e) { console.error(`[generate-marketing] Emails FAILED:`, (e as Error).message); }

  // Sub-call 4/4: Campaigns + Checklist + Persona focus
  try {
    console.log("[generate-marketing] Sub-call 4/4: Campaigns & Checklist...");
    const recoSummary = [
      `Ads: ${JSON.stringify(adsResult.map((a: any) => ({ id: a.id, title: a.title, persona: a.persona_cible, format: a.format })))}`,
      `Offres: ${JSON.stringify(offersResult.map((o: any) => ({ id: o.id, title: o.title, persona: o.persona_cible, type: o.type_offre })))}`,
      `Emails: ${JSON.stringify(emailsResult.map((e: any) => ({ id: e.id, title: e.title, persona: e.persona_cible, type: e.type_email })))}`,
    ].join("\n");
    const sys = baseSystem + [
      ``,
      `Recos générées cette semaine :`,
      recoSummary,
      ``,
      `GÉNÈRE :`,
      `1. campaigns_overview : 1-2 campagnes transversales liant des recos.`,
      `   Schéma : ${CAMPAIGNS_SCHEMA}`,
      `   IDs : camp-001, camp-002`,
      `2. checklist : 5 tâches actionnables pour la semaine`,
      `   Schéma par tâche : {"id":"string","title":"string","category":"ads|email|offers","completed":false,"detail":{}}`,
      `3. persona_focus : {"roi":{"code":"string","name":"string","reason":"string"},"growth":{"code":"string","name":"string","reason":"string"},"ltv":{"code":"string","name":"string","reason":"string"}}`,
      `Retourne UNIQUEMENT : { "campaigns_overview": [...], "checklist": [...], "persona_focus": {...} }`,
    ].join("\n");
    const raw = await callOpusSingle(sys, commonCtx, 3000, 45000);
    const parsed = JSON.parse(cleanJsonResponse(raw));
    campaignsResult = parsed.campaigns_overview || [];
    checklistResult = parsed.checklist || [];
    personaFocus = parsed.persona_focus || {};
    // Link campaign IDs into reco items
    for (const camp of campaignsResult) {
      for (const id of (camp.recos_ads_ids || [])) { const r = adsResult.find((a: any) => a.id === id); if (r) r.campaign_id = camp.id; }
      for (const id of (camp.recos_offers_ids || [])) { const r = offersResult.find((o: any) => o.id === id); if (r) r.campaign_id = camp.id; }
      for (const id of (camp.recos_emails_ids || [])) { const r = emailsResult.find((e: any) => e.id === id); if (r) r.campaign_id = camp.id; }
    }
    console.log(`[generate-marketing] Campaigns: ${campaignsResult.length}, Checklist: ${checklistResult.length} ✅`);
  } catch (e) { console.error(`[generate-marketing] Campaigns FAILED:`, (e as Error).message); }

  const actualCount = adsResult.length + offersResult.length + emailsResult.length;
  console.log(`[generate-marketing] Global complete: ${actualCount} recos total`);
  return {
    result: { ads_v2: adsResult, offers_v2: offersResult, emails_v2: emailsResult, campaigns_overview: campaignsResult, checklist: checklistResult, persona_focus: personaFocus },
    actualCount,
  };
}

// ============================================
// FALLBACK: LEGACY GEMINI 2.5 PRO (v1 only)
// ============================================
async function callGeminiLegacy(collectedData: any, perplexityResearch: any, clientContext: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const { personaData, personaRows, priorities, globalMetrics } = collectedData;
  const CLIENT_CONTEXT = clientContext;
  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();
  const { adsResearch, emailResearch, offersResearch } = perplexityResearch || {};
  const personaDescriptions = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => `- ${p.code} : ${p.full_label} : ${p.description || ""}`)
    .join("\n");
  const systemPrompt = [
    `Tu es un directeur marketing senior spécialisé en e-commerce DTC skincare et cosmétiques pour enfants.`,
    `${CLIENT_CONTEXT.brand} — ${CLIENT_CONTEXT.description}`,
    `Gamme : ${CLIENT_CONTEXT.products.map((p: any) => `${p.name} (${p.type}) — ~${p.price}€`).join(", ")}`,
    ``,
    `=== PERSONAS ===`,
    personaDescriptions,
    `P0 — Non attribué : Ne pas cibler.`,
    ``,
    `=== INTELLIGENCE MARCHÉ (${currentMonth} ${currentYear}) ===`,
    `--- Ads ---`, adsResearch || "Non disponible",
    `--- Email ---`, emailResearch || "Non disponible",
    `--- Offres ---`, offersResearch || "Non disponible",
    ``,
    `RÈGLES : Utiliser les prénoms des personas, hooks en français, pas d'emojis, métriques lisibles.`,
  ].join("\n");
  const p = priorities;
  const userPrompt = [
    `Données personas (30 jours) :`,
    JSON.stringify(personaData, null, 2),
    `Métriques globales : ${JSON.stringify(globalMetrics)}`,
    `Personas prioritaires :`,
    `- ROI : ${p.best_roi?.code} ${p.best_roi?.name} — ${p.best_roi_value}€/session`,
    `- Growth : ${p.best_growth?.code} ${p.best_growth?.name} — +${p.best_growth_ca}€ potentiel`,
    `- LTV : ${p.best_ltv?.code} ${p.best_ltv?.name} — score ${p.best_ltv_score}`,
    `Contexte temporel : ${currentMonth} ${currentYear}.`,
    `Génère les recommandations v1. JSON uniquement :`,
    `{ "persona_focus": {...}, "checklist": [...], "ads_recommendations": {...}, "email_recommendations": {...}, "offers_recommendations": {...} }`,
  ].join("\n");
  console.log("[generate-marketing] [FALLBACK] Calling Gemini 2.5 Pro...");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) throw new Error(`Fallback Gemini error ${response.status}`);
  const aiResponse = await response.json();
  const rawContent = aiResponse.choices?.[0]?.message?.content;
  logUsage("gemini", "gemini-2.5-pro", aiResponse.usage?.total_tokens || 0, { fallback: true });
  if (!rawContent) throw new Error("Empty response from fallback Gemini");
  try { return JSON.parse(cleanJsonResponse(rawContent)); }
  catch (parseErr) { throw new Error(`Fallback JSON parse error: ${(parseErr as Error).message}`); }
}

// ============================================
// V2 → V1 CONVERSION
// ============================================
function convertV2toV1(opusResult: any): { ads_recommendations: any; email_recommendations: any; offers_recommendations: any } {
  const ads = opusResult.ads_v2 || [];
  const emails = opusResult.emails_v2 || [];
  const offers = opusResult.offers_v2 || [];
  const ads_recommendations = {
    hooks_creatifs: ads.map((a: any) => ({ text: a.contenu_creatif?.hook_text || a.title, personas: [a.persona_cible], rationale: a.angle_psychologique || "" })),
    concepts_video: ads.filter((a: any) => ["reel", "ugc", "story"].includes(a.format)).map((a: any) => ({ title: a.title, personas: [a.persona_cible], description: a.contenu_creatif?.descriptif_visuel || a.contenu_creatif?.script_complet || "" })),
    angles_psychologiques: ads.map((a: any) => ({ angle: a.angle_psychologique || "", personas: [a.persona_cible], source: a.sources_utilisees?.[0] || "" })),
    ciblage: ads.map((a: any) => ({ audience: (a.ciblage_detaille?.audiences_suggested || []).join(", "), personas: [a.persona_cible] })),
  };
  if (ads_recommendations.hooks_creatifs.length === 0) ads_recommendations.hooks_creatifs = [{ text: "", personas: [], rationale: "" }];
  const email_recommendations = {
    newsletters: emails.filter((e: any) => e.type_email === "newsletter").map((e: any) => ({ title: e.title, personas: [e.persona_cible], type: "educatif", sujet: e.objet, contenu_cle: e.messaging_principal, cta: e.cta_principal?.texte || "", frequence: e.timing, segment: e.segment_klaviyo, justification: "" })),
    flows_automatises: emails.filter((e: any) => e.type_email !== "newsletter").map((e: any) => ({ title: e.title, personas: [e.persona_cible], sequence: e.position_dans_flow?.position || "", trigger: e.trigger || "", justification: "" })),
    lignes_objet: emails.map((e: any) => ({ text: e.objet, personas: [e.persona_cible], context: e.type_email })),
    segmentation: emails.map((e: any) => ({ segment: e.segment_klaviyo, personas: [e.persona_cible], action: e.title })),
  };
  const offers_recommendations = {
    bundles: offers.filter((o: any) => ["bundle", "offre_limitee"].includes(o.type_offre)).map((o: any) => ({ name: o.title, personas: [o.persona_cible], produits: (o.composition || []).map((c: any) => c.produit).join(", "), prix: `${o.pricing_strategy?.prix_bundle || ""} (au lieu de ${o.pricing_strategy?.prix_unitaire_total || ""}, soit ${o.pricing_strategy?.economie_affichee || ""})`, rationale: o.concept })),
    prix_psychologiques: offers.filter((o: any) => o.type_offre === "prix_psychologique").map((o: any) => ({ strategie: o.concept, rationale: o.pricing_strategy?.ancrage_prix || "" })),
    upsells: offers.filter((o: any) => ["upsell", "cross_sell"].includes(o.type_offre)).map((o: any) => ({ trigger: o.title, action: o.concept, taux_acceptation_estime: o.metriques_succes?.seuil_succes || "" })),
  };
  return { ads_recommendations, email_recommendations, offers_recommendations };
}

// ============================================
// PERSISTENCE
// ============================================
async function saveRecommendations(
  supabase: any,
  result: any,
  config: {
    version: number; weekStart: string; generationDurationMs: number;
    modelsUsed: { research: string; analysis: string; generation: string };
    sessionsAnalyzed: number; personasCount: number;
    perplexityResearch: any; generationType: string; generatedCategories: string[];
  }
) {
  if (config.version === 2) {
    const v1Data = convertV2toV1(result);
    const allSources = new Set<string>([...SOURCES_CONSULTED]);
    for (const list of [result.ads_v2, result.offers_v2, result.emails_v2]) {
      for (const item of (list || [])) for (const src of (item.sources_utilisees || [])) allSources.add(src);
    }
    if (config.perplexityResearch?.adsResearch) allSources.add("perplexity:ads_research");
    if (config.perplexityResearch?.emailResearch) allSources.add("perplexity:email_research");
    if (config.perplexityResearch?.offersResearch) allSources.add("perplexity:offers_research");
    const { data: inserted, error: insertErr } = await supabase.from("marketing_recommendations").insert({
      week_start: config.weekStart, generated_at: new Date().toISOString(),
      status: "active", recommendation_version: 2,
      generation_type: config.generationType, generated_categories: config.generatedCategories,
      ads_v2: result.ads_v2 || [], offers_v2: result.offers_v2 || [], emails_v2: result.emails_v2 || [],
      campaigns_overview: result.campaigns_overview || [],
      persona_focus: result.persona_focus || null, checklist: result.checklist || [],
      ads_recommendations: v1Data.ads_recommendations,
      email_recommendations: v1Data.email_recommendations,
      offers_recommendations: v1Data.offers_recommendations,
      sources_consulted: Array.from(allSources),
      generation_config: {
        models_used: config.modelsUsed, sources_count: allSources.size,
        personas_count: config.personasCount, sessions_analyzed: config.sessionsAnalyzed,
        generation_duration_ms: config.generationDurationMs,
      },
    }).select().single();
    if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
    return inserted;
  } else {
    const { data: inserted, error: insertErr } = await supabase.from("marketing_recommendations").insert({
      week_start: config.weekStart, generated_at: new Date().toISOString(),
      status: "active", recommendation_version: 1,
      generation_type: config.generationType, generated_categories: config.generatedCategories,
      persona_focus: result.persona_focus, checklist: result.checklist,
      ads_recommendations: result.ads_recommendations,
      email_recommendations: result.email_recommendations,
      offers_recommendations: result.offers_recommendations,
      sources_consulted: [...SOURCES_CONSULTED],
      generation_config: {
        models_used: config.modelsUsed, sessions_analyzed: config.sessionsAnalyzed,
        personas_count: config.personasCount, generation_duration_ms: config.generationDurationMs, fallback: true,
      },
    }).select().single();
    if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
    return inserted;
  }
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // ── GET: Return all active recommendations + quota ──
    if (req.method === "GET") {
      const [recsResult, quota] = await Promise.all([
        supabase.from("marketing_recommendations").select("*").eq("status", "active").order("generated_at", { ascending: false }),
        getQuota(supabase),
      ]);
      if (recsResult.error) throw recsResult.error;
      return new Response(JSON.stringify({ recommendations: recsResult.data || [], quota }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST: Generation from staging data ──
    if (req.method === "POST") {
      const startTime = Date.now();
      let body: any = {};
      try { const text = await req.text(); if (text) body = JSON.parse(text); } catch (_) {}
      const { staging_id } = body;
      if (!staging_id) {
        return new Response(JSON.stringify({ error: "staging_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[generate-marketing] POST staging_id="${staging_id}"`);

      // Read staging row
      const { data: staging, error: stagingErr } = await supabase
        .from("recommendation_staging").select("*").eq("id", staging_id).single();

      if (stagingErr || !staging) {
        return new Response(JSON.stringify({ error: "Staging row not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (staging.status !== "step2_done") {
        return new Response(JSON.stringify({ error: `Invalid staging status: ${staging.status}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const {
        persona_data: collectedData,
        perplexity_results: perplexityResearch,
        gemini_synthesis: geminiSynthesis,
        client_context: clientContext,
        generation_type: generationType,
      } = staging;

      const type = generationType as GenerationType;
      const weekStart = getMonday(new Date());
      const personasCount = Object.keys(collectedData?.personaData || {}).length;

      // Determine generated_categories
      let generatedCategories: string[];
      if (type === "global") generatedCategories = ["ads", "offers", "emails"];
      else if (type === "ads" || type === "single_ad") generatedCategories = ["ads"];
      else if (type === "offers" || type === "single_offer") generatedCategories = ["offers"];
      else generatedCategories = ["emails"];

      // Try Claude Opus (sub-calls)
      let opusSuccess = false;
      try {
        console.log(`[generate-marketing] Opus generation type="${type}"...`);
        const { result: opusResult, actualCount } = await callClaudeOpus(geminiSynthesis, collectedData, clientContext, perplexityResearch, type);

        if (actualCount === 0) throw new Error("All Opus sub-calls failed — no content generated");

        const inserted = await saveRecommendations(supabase, opusResult, {
          version: 2, weekStart,
          generationDurationMs: Date.now() - startTime,
          modelsUsed: {
            research: perplexityResearch ? "perplexity/sonar-pro" : "none",
            analysis: geminiSynthesis ? "google/gemini-3.1-pro-preview" : "none",
            generation: "anthropic/claude-opus-4-20250514",
          },
          sessionsAnalyzed: collectedData?.globalMetrics?.total_sessions || 0,
          personasCount, perplexityResearch, generationType: type, generatedCategories,
        });
        console.log(`[generate-marketing] Saved. ID: ${inserted.id}, count: ${actualCount}`);

        await updateQuota(supabase, type, inserted.id, actualCount);
        await supabase.from("recommendation_staging").update({ status: "consumed" }).eq("id", staging_id);
        await supabase.from("recommendation_staging").delete().or(`status.eq.consumed,expires_at.lt.${new Date().toISOString()}`);

        opusSuccess = true;
        const [allRecs, freshQuota] = await Promise.all([
          supabase.from("marketing_recommendations").select("*").eq("status", "active").order("generated_at", { ascending: false }),
          getQuota(supabase),
        ]);
        return new Response(JSON.stringify({ recommendations: allRecs.data || [], quota: freshQuota, latest: inserted }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (opusErr) {
        const errMsg = opusErr instanceof Error ? opusErr.message : "unknown";
        console.error("[generate-marketing] Opus FAILED:", errMsg);
        logUsage("anthropic", "claude-opus-4-20250514", 0, { error: errMsg });
        await supabase.from("recommendation_staging").update({ status: "error", error_message: errMsg }).eq("id", staging_id);
      }

      // Fallback: Gemini 2.5 Pro legacy (v1) — only for non-single types
      if (!opusSuccess && !type.startsWith("single_")) {
        console.log("[generate-marketing] FALLBACK: Gemini 2.5 Pro...");
        try {
          const legacyResult = await callGeminiLegacy(collectedData, perplexityResearch, clientContext);
          const insertedLegacy = await saveRecommendations(supabase, legacyResult, {
            version: 1, weekStart,
            generationDurationMs: Date.now() - startTime,
            modelsUsed: { research: "perplexity/sonar-pro", analysis: "google/gemini-2.5-pro", generation: "google/gemini-2.5-pro" },
            sessionsAnalyzed: collectedData?.globalMetrics?.total_sessions || 0,
            personasCount, perplexityResearch, generationType: type, generatedCategories,
          });
          // No quota deduction for fallback (0 v2 credits)
          await supabase.from("recommendation_staging").update({ status: "consumed" }).eq("id", staging_id);
          const [allRecs, freshQuota] = await Promise.all([
            supabase.from("marketing_recommendations").select("*").eq("status", "active").order("generated_at", { ascending: false }),
            getQuota(supabase),
          ]);
          return new Response(JSON.stringify({ recommendations: allRecs.data || [], quota: freshQuota, latest: insertedLegacy }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (fallbackErr) {
          const errMsg = fallbackErr instanceof Error ? fallbackErr.message : "unknown";
          console.error("[generate-marketing] FALLBACK failed:", errMsg);
          return new Response(JSON.stringify({ error: `Generation failed: ${errMsg}` }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (!opusSuccess) {
        return new Response(JSON.stringify({ error: "Generation failed. Please retry." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    const errMsg = err?.message || "Unknown error";
    console.error("[generate-marketing] Fatal error:", errMsg);
    logUsage("system", "unknown", 0, { error: errMsg, fatal: true });
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
