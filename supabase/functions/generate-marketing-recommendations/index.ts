import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ──────────────────────────────────────────────────────────
function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

function countOccurrences(arr: (string | null | undefined)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of arr) {
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

function topN(counts: Record<string, number>, n: number): { value: string; count: number }[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

function splitAndCount(values: (string | null | undefined)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    if (!v) continue;
    for (const item of v.split(",").map((s) => s.trim()).filter(Boolean)) {
      counts[item] = (counts[item] || 0) + 1;
    }
  }
  return counts;
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

const PRIORITY_LABELS: Record<string, string> = {
  efficacite: "Efficacité",
  ludique: "Côté ludique",
  clean: "Naturalité/Clean",
  autonomie: "Autonomie de l'enfant",
  science: "Validation scientifique",
};

const TRUST_LABELS: Record<string, string> = {
  ingredient_transparency: "Transparence des ingrédients",
  proof_results: "Preuves de résultats",
  parent_testimonials: "Témoignages de parents",
  scientific_validation: "Validation scientifique",
};

const FORMAT_LABELS: Record<string, string> = {
  visual: "Contenu visuel",
  short: "Contenu court et direct",
  complete: "Contenu détaillé",
};

const SOURCES_CONSULTED = [
  "motionapp.com", "klaviyo.com", "flighted.co", "triplewhale.com",
  "rebuyengine.com", "j7media.com", "commonthreadco.com", "chasedimond.com",
  "baymard.com", "growth.design", "shopify.com", "bigcommerce.com",
];

const CLIENT_CONTEXT = {
  sector: "cosmétique naturelle pour bébés et enfants",
  brand: "Ouate Paris",
  description: "Marque française premium de soins pour la peau des enfants de 4 à 11 ans. Fondée sur 3 piliers : efficacité dermatologique prouvée, formulations clean et naturalité (Made in France), expérience ludique et sensorielle.",
  products: [
    { name: "Mon Nettoyant Douceur", type: "gel nettoyant visage", price: 15 },
    { name: "Ma Crème de Jour", type: "hydratation quotidienne", price: 20 },
    { name: "Ma Crème de Nuit", type: "soin nocturne", price: 20 },
    { name: "Ma Potion à Bisous", type: "baume lèvres", price: 12 },
    { name: "Mon Sérum Magique", type: "soin ciblé imperfections", price: 22 },
    { name: "Mes Gummies Belle Peau", type: "compléments alimentaires", price: 18 },
  ],
  channels: ["Meta Ads (Instagram + Facebook)", "Klaviyo (email/SMS)", "Shopify e-commerce", "Diagnostic IA en ligne"],
  promoCode: "DIAG-15 (-15% première commande)",
  tone: "bienveillant, expert, naturel, rassurant pour les parents",
};


// ============================================
// STEP 1: COLLECT PERSONA DATA (INCHANGÉ)
// ============================================
async function collectPersonaData(supabase: any) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString();

  const { data: sessions, error: sessionsErr } = await supabase
    .from("diagnostic_sessions")
    .select("*, diagnostic_children(*)")
    .eq("status", "termine")
    .gte("created_at", fromDate);

  if (sessionsErr) throw new Error(`Sessions fetch error: ${sessionsErr.message}`);
  if (!sessions || sessions.length === 0) throw new Error("No completed sessions in last 30 days");

  const sessionCodes = sessions.map((s: any) => s.session_code);
  const { data: orders, error: ordersErr } = await supabase
    .from("shopify_orders")
    .select("*")
    .in("diagnostic_session_id", sessionCodes);

  if (ordersErr) throw new Error(`Orders fetch error: ${ordersErr.message}`);

  const ordersBySessionCode: Record<string, any[]> = {};
  for (const o of (orders || [])) {
    const sc = o.diagnostic_session_id;
    if (sc) {
      if (!ordersBySessionCode[sc]) ordersBySessionCode[sc] = [];
      ordersBySessionCode[sc].push(o);
    }
  }

  const childrenBySession: Record<string, any[]> = {};
  for (const s of sessions) {
    const kids = (s as any).diagnostic_children || [];
    if (kids.length > 0) childrenBySession[s.id] = kids;
  }

  const allOrders = orders || [];
  const globalConversion = sessions.length > 0 ? allOrders.length / sessions.length : 0;
  const globalAOV = allOrders.length > 0
    ? allOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0) / allOrders.length
    : 0;

  const { data: personaRows, error: personaErr } = await supabase
    .from("personas")
    .select("code, name, full_label, description, criteria, is_pool")
    .eq("is_active", true)
    .order("code");

  if (personaErr) throw new Error(`Personas fetch error: ${personaErr.message}`);

  const activePersonaCodes = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => p.code);

  const personaLabelMap: Record<string, string> = {};
  const personaDescMap: Record<string, string> = {};
  for (const p of (personaRows || [])) {
    personaLabelMap[p.code] = p.full_label;
    personaDescMap[p.code] = p.description || "";
  }

  const getPersonaFullLabel = (code: string) => personaLabelMap[code] || code;

  const personaData: Record<string, any> = {};

  for (const code of activePersonaCodes) {
    const pSessions = sessions.filter((s: any) => s.persona_code === code);
    const pSessionCodes = pSessions.map((s: any) => s.session_code);
    const pOrders = allOrders.filter((o: any) => pSessionCodes.includes(o.diagnostic_session_id));
    const pChildren: any[] = [];
    for (const s of pSessions) {
      if (childrenBySession[s.id]) pChildren.push(...childrenBySession[s.id]);
    }

    const volume = pSessions.length;
    const conversions = pOrders.length;
    const conversionRate = volume > 0 ? conversions / volume : 0;
    const totalRevenue = pOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0);
    const aov = conversions > 0 ? totalRevenue / conversions : 0;

    const ageRangeDist = countOccurrences(pChildren.map((c) => c.age_range));
    const numChildrenDist = countOccurrences(pSessions.map((s: any) => String(s.number_of_children || 1)));
    const multiChildPct = volume > 0
      ? pSessions.filter((s: any) => (s.number_of_children || 1) > 1).length / volume
      : 0;
    const reactivityDist = countOccurrences(pChildren.map((c) => c.skin_reactivity));
    const excludeFragrancePct = pChildren.length > 0
      ? pChildren.filter((c) => c.exclude_fragrance === true).length / pChildren.length
      : 0;
    const deviceDist = countOccurrences(pSessions.map((s: any) => s.device));

    const prioritiesList = pSessions
      .map((s: any) => s.priorities_ordered?.split(",").map((x: string) => x.trim())[0])
      .filter(Boolean);
    const prioritiesCounts = countOccurrences(prioritiesList);
    const topPriorities = topN(prioritiesCounts, 3).map((t) => ({
      code: t.value,
      label: PRIORITY_LABELS[t.value] || t.value,
      count: t.count,
      pct: volume > 0 ? Math.round((t.count / volume) * 100) : 0,
    }));

    const trustList = pSessions
      .map((s: any) => s.trust_triggers_ordered?.split(",").map((x: string) => x.trim())[0])
      .filter(Boolean);
    const trustCounts = countOccurrences(trustList);
    const topTrust = topN(trustCounts, 3).map((t) => ({
      code: t.value,
      label: TRUST_LABELS[t.value] || t.value,
      count: t.count,
      pct: volume > 0 ? Math.round((t.count / volume) * 100) : 0,
    }));

    const routineDist = countOccurrences(pSessions.map((s: any) => s.routine_size_preference));
    const avgDuration = volume > 0
      ? Math.round(pSessions.reduce((s: number, ss: any) => s + (ss.duration_seconds || 0), 0) / volume)
      : 0;
    const avgEngagement = volume > 0
      ? Math.round(pSessions.reduce((s: number, ss: any) => s + (ss.engagement_score || 0), 0) / volume)
      : 0;

    const formatDist = countOccurrences(pSessions.map((s: any) => s.content_format_preference));
    const dominantFormat = topN(formatDist, 1)[0];

    const optinEmailPct = volume > 0
      ? Math.round(pSessions.filter((s: any) => s.optin_email === true).length / volume * 100)
      : 0;
    const optinSmsPct = volume > 0
      ? Math.round(pSessions.filter((s: any) => s.optin_sms === true).length / volume * 100)
      : 0;

    const productCounts = splitAndCount(pSessions.map((s: any) => s.recommended_products));
    const topProducts = topN(productCounts, 5);

    const avgRecommendedCart = volume > 0
      ? Math.round(pSessions.reduce((s: number, ss: any) => s + (Number(ss.recommended_cart_amount) || 0), 0) / volume * 100) / 100
      : 0;
    const cartGap = aov > 0 ? Math.round((aov - avgRecommendedCart) * 100) / 100 : 0;

    const toneDist = countOccurrences(pSessions.map((s: any) => s.adapted_tone).filter(Boolean));
    const toneLabels: Record<string, string> = {
      playful: "Ludique", factual: "Factuel", empowering: "Autonomisant",
      transparent: "Transparent", expert: "Expert",
    };
    const toneDistPct: Record<string, number> = {};
    const toneTotal = Object.values(toneDist).reduce((a, b) => a + b, 0);
    for (const [t, n] of Object.entries(toneDist)) {
      toneDistPct[toneLabels[t] || t] = toneTotal > 0 ? Math.round((n / toneTotal) * 100) : 0;
    }
    const dominantTone = topN(toneDist, 1)[0];

    personaData[code] = {
      code,
      name: getPersonaFullLabel(code),
      business: {
        volume, conversions,
        conversion_rate: Math.round(conversionRate * 1000) / 10,
        aov: Math.round(aov * 100) / 100,
        total_revenue: Math.round(totalRevenue * 100) / 100,
      },
      profile: {
        age_range_distribution: ageRangeDist,
        num_children_distribution: numChildrenDist,
        multi_child_pct: Math.round(multiChildPct * 100),
        skin_reactivity_distribution: reactivityDist,
        exclude_fragrance_pct: Math.round(excludeFragrancePct * 100),
        dominant_device: topN(deviceDist, 1)[0]?.value || "unknown",
        device_distribution: deviceDist,
      },
      psychology: {
        top_priorities: topPriorities,
        top_trust_triggers: topTrust,
        routine_preference_distribution: routineDist,
      },
      behavior: {
        avg_duration_seconds: avgDuration,
        avg_engagement_score: avgEngagement,
        dominant_content_format: dominantFormat
          ? { code: dominantFormat.value, label: FORMAT_LABELS[dominantFormat.value] || dominantFormat.value }
          : null,
        content_format_distribution: formatDist,
        optin_email_pct: optinEmailPct,
        optin_sms_pct: optinSmsPct,
        dominant_tone: dominantTone ? (toneLabels[dominantTone.value] || dominantTone.value) : null,
        tone_distribution: toneDistPct,
      },
      products: {
        top_5_recommended: topProducts,
        avg_recommended_cart: avgRecommendedCart,
        cart_gap_vs_aov: cartGap,
      },
    };
  }

  // ── 3-category prioritization ──────────────────────────────────
  const activePersonas = Object.values(personaData).filter((p: any) => p.business.volume >= 1);

  let bestROI: any = null;
  let bestROIValue = 0;
  for (const p of activePersonas) {
    const valuePerSession = (p.business.conversion_rate / 100) * p.business.aov;
    if (valuePerSession > bestROIValue) { bestROIValue = valuePerSession; bestROI = p; }
  }

  let bestGrowth: any = null;
  let bestGrowthCA = 0;
  const globalConvPct = Math.round(globalConversion * 1000) / 10;
  for (const p of activePersonas) {
    if (p.business.conversion_rate >= globalConvPct || p.business.volume < 5) continue;
    const caManquant = ((globalConvPct - p.business.conversion_rate) / 100) * p.business.volume * p.business.aov;
    if (caManquant > bestGrowthCA) { bestGrowthCA = caManquant; bestGrowth = p; }
  }

  let bestLTV: any = null;
  let bestLTVScore = 0;
  for (const p of activePersonas) {
    const ageRangeDist = p.profile.age_range_distribution || {};
    let dominantAge: string | null = null;
    let maxAgeCount = 0;
    for (const [ar, count] of Object.entries(ageRangeDist)) {
      if ((count as number) > maxAgeCount) { dominantAge = ar; maxAgeCount = count as number; }
    }
    let scoreAge = 2;
    if (dominantAge === "4-6") scoreAge = 3;
    else if (dominantAge === "7-9") scoreAge = 2;
    else if (dominantAge === "10-11") scoreAge = 1;

    const coeffMulti = p.profile.multi_child_pct > 20 ? 1.5 : 1.0;
    const ltvScore = scoreAge * (p.behavior.optin_email_pct / 100) * coeffMulti;

    if (ltvScore > bestLTVScore) {
      bestLTVScore = ltvScore;
      bestLTV = { ...p, _ltvScore: Math.round(ltvScore * 100) / 100, _scoreAge: scoreAge, _dominantAge: dominantAge, _coeffMulti: coeffMulti };
    }
  }

  if (!bestROI) bestROI = activePersonas[0];
  if (!bestGrowth) bestGrowth = activePersonas.length > 1 ? activePersonas[1] : activePersonas[0];
  if (!bestLTV) bestLTV = activePersonas.length > 2 ? activePersonas[2] : activePersonas[0];

  // ── Global aggregates ──────────────────────────────────────────
  const allTrustTriggers = sessions
    .map((s: any) => s.trust_triggers_ordered?.split(",").map((x: string) => x.trim())[0])
    .filter(Boolean);
  const trustGlobalCounts = countOccurrences(allTrustTriggers);
  const trustGlobalTop = topN(trustGlobalCounts, 1)[0];
  const trustTriggerGlobalDominant = trustGlobalTop
    ? (TRUST_LABELS[trustGlobalTop.value] || trustGlobalTop.value)
    : "Transparence des ingrédients";

  const allFormats = sessions.map((s: any) => s.content_format_preference).filter(Boolean);
  const formatGlobalCounts = countOccurrences(allFormats);
  const formatGlobalTop = topN(formatGlobalCounts, 1)[0];
  const contentFormatGlobalDominant = formatGlobalTop
    ? (FORMAT_LABELS[formatGlobalTop.value] || formatGlobalTop.value)
    : "Contenu court et direct";

  const avgAovGlobal = Math.round(globalAOV);
  const personaAOVs = activePersonas
    .filter((p: any) => p.business.conversions > 0)
    .map((p: any) => p.business.aov);
  const aovMin = personaAOVs.length > 0 ? Math.round(Math.min(...personaAOVs)) : avgAovGlobal;
  const aovMax = personaAOVs.length > 0 ? Math.round(Math.max(...personaAOVs)) : avgAovGlobal;
  const aovRange = `${aovMin}€-${aovMax}€`;

  const allProductCounts = splitAndCount(sessions.map((s: any) => s.recommended_products));
  const top5ProductsGlobal = topN(allProductCounts, 5).map((p) => p.value).join(", ");

  const multiChildrenRateGlobal = sessions.length > 0
    ? Math.round(sessions.filter((s: any) => (s.number_of_children || 1) > 1).length / sessions.length * 100)
    : 0;

  const avgOptinEmailGlobal = sessions.length > 0
    ? Math.round(sessions.filter((s: any) => s.optin_email === true).length / sessions.length * 100)
    : 0;

  const personasByOptin = activePersonas
    .filter((p: any) => p.business.volume >= 3)
    .sort((a: any, b: any) => b.behavior.optin_email_pct - a.behavior.optin_email_pct)
    .slice(0, 3)
    .map((p: any) => `${p.name} (${p.behavior.optin_email_pct}%)`)
    .join(", ");

  return {
    personaData,
    personaRows,
    priorities: {
      best_roi: bestROI,
      best_roi_value: Math.round(bestROIValue * 100) / 100,
      best_growth: bestGrowth,
      best_growth_ca: Math.round(bestGrowthCA),
      best_ltv: bestLTV,
      best_ltv_score: Math.round(bestLTVScore * 100) / 100,
    },
    globalMetrics: {
      total_sessions: sessions.length,
      total_orders: allOrders.length,
      global_conversion_rate: Math.round(globalConversion * 1000) / 10,
      global_aov: Math.round(globalAOV * 100) / 100,
    },
    globalAggregates: {
      trustTriggerGlobalDominant,
      contentFormatGlobalDominant,
      avgAovGlobal,
      aovRange,
      top5ProductsGlobal,
      multiChildrenRateGlobal,
      avgOptinEmailGlobal,
      top3PersonasByOptin: personasByOptin,
    },
  };
}


// ============================================
// STEP 2: PERPLEXITY RESEARCH (enriched prompts)
// ============================================
async function callPerplexityResearch(globalAggregates: any): Promise<{ adsResearch: string; emailResearch: string; offersResearch: string }> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    console.warn("[generate-marketing] PERPLEXITY_API_KEY not configured — skipping web research (degraded mode)");
    return { adsResearch: "", emailResearch: "", offersResearch: "" };
  }

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();
  const currentWeek = `semaine du ${getMonday(now)}`;

  const {
    trustTriggerGlobalDominant,
    contentFormatGlobalDominant,
    avgAovGlobal,
    aovRange,
    multiChildrenRateGlobal,
    avgOptinEmailGlobal,
  } = globalAggregates;

  const TIMEOUT_MS = 30000;

  async function safeFetch(label: string, body: any): Promise<string> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[generate-marketing] Perplexity ${label} error ${response.status}: ${errText}`);
        return "";
      }
      const data = await response.json();
      const perplexityTokens = data.usage?.total_tokens || 0;
      logUsage("perplexity", "sonar-pro", perplexityTokens, { category: label });
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.error(`[generate-marketing] Perplexity ${label} failed:`, err instanceof Error ? err.message : err);
      logUsage("perplexity", "sonar-pro", 0, { category: label, error: err instanceof Error ? err.message : "unknown" });
      return "";
    }
  }

  const [adsResearch, emailResearch, offersResearch] = await Promise.all([
    safeFetch("ads", {
      model: "sonar-pro",
      messages: [
        { role: "system", content: "Tu es un analyste marketing spécialisé en publicités Meta Ads et TikTok Ads pour les marques e-commerce DTC beauté et skincare. Réponds de manière structurée avec des données chiffrées." },
        { role: "user", content: `Recherche les dernières tendances en publicité Meta/TikTok/Instagram pour le secteur ${CLIENT_CONTEXT.sector}. Inclure : formats qui performent le mieux en ce moment (Reels, Stories, Carrousel, Feed), hooks qui captent l'attention des mamans 25-45 ans, tendances de ciblage (Broad vs Lookalike vs Advantage+), coûts par résultat moyens en beauté DTC. Notre audience valorise "${trustTriggerGlobalDominant}" et préfère "${contentFormatGlobalDominant}". Focus sur les marques DTC similaires. ${currentWeek}, ${currentMonth} ${currentYear}.` },
      ],
    }),

    safeFetch("email", {
      model: "sonar-pro",
      messages: [
        { role: "system", content: "Tu es un expert en email marketing e-commerce et stratégie CRM Klaviyo. Réponds avec des benchmarks chiffrés (taux d'ouverture, taux de clic, CA par email)." },
        { role: "user", content: `Recherche les meilleures pratiques actuelles en email marketing e-commerce pour le secteur ${CLIENT_CONTEXT.sector}. Inclure : taux d'ouverture benchmarks beauté DTC, tendances de segmentation, innovations en flows automatisés Klaviyo (welcome, post-quiz, winback, replenishment), lignes d'objet qui performent pour les mamans. Notre taux d'opt-in email est de ${avgOptinEmailGlobal}%. Focus sur Klaviyo et les marques DTC. ${currentWeek}, ${currentMonth} ${currentYear}.` },
      ],
    }),

    safeFetch("offers", {
      model: "sonar-pro",
      messages: [
        { role: "system", content: "Tu es un expert en stratégie commerciale e-commerce DTC spécialisé en pricing, bundles, upsells et cross-sells. Réponds avec des données chiffrées et des exemples concrets." },
        { role: "user", content: `Recherche les stratégies d'offres, bundles et pricing qui fonctionnent en e-commerce ${CLIENT_CONTEXT.sector}. AOV moyen ${avgAovGlobal}€ (range: ${aovRange}), ${multiChildrenRateGlobal}% de clientes multi-enfants. Inclure : techniques de bundling (routine complète, découverte, saisonnier), prix psychologiques, stratégies de lancement, urgence et scarcity qui convertissent, upsells post-achat performants. Focus sur les marques DTC premium. ${currentWeek}, ${currentMonth} ${currentYear}.` },
      ],
    }),
  ]);

  const successCount = [adsResearch, emailResearch, offersResearch].filter((r) => r.length > 0).length;
  console.log(`[generate-marketing] Perplexity research: ${successCount}/3 calls succeeded`);

  return { adsResearch, emailResearch, offersResearch };
}


// ============================================
// STEP 3: GEMINI 3.1 PRO ANALYSIS (NEW)
// ============================================
async function callGeminiAnalysis(
  collectedData: any,
  perplexityResearch: { adsResearch: string; emailResearch: string; offersResearch: string },
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const { personaData, personaRows, priorities, globalMetrics } = collectedData;
  const { adsResearch, emailResearch, offersResearch } = perplexityResearch;

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();

  const systemPrompt = `Tu es un analyste marketing senior. Tu reçois :
- Des données terrain (personas, métriques, comportements) d'une marque e-commerce
- Des recherches de marché récentes (tendances ads, email, offres)
- Une base de connaissances marketing de 226 sources

Ta mission : produire une SYNTHÈSE ANALYTIQUE structurée qui identifie les opportunités les plus pertinentes pour cette marque cette semaine.

Tu ne génères PAS de recommandations actionnables. Tu identifies les PATTERNS, OPPORTUNITÉS et INSIGHTS qui serviront de base à la génération de recommandations.

Retourne un JSON avec cette structure exacte :
{
  "analyse_ads": {
    "tendances_marche": "string — résumé des tendances ads pertinentes pour la marque",
    "opportunites_formats": ["string — formats à exploiter et pourquoi"],
    "insights_ciblage": "string — observations sur le ciblage à partir des données personas",
    "angles_identifies": ["string — angles psychologiques pertinents identifiés"]
  },
  "analyse_email": {
    "tendances_marche": "string — résumé des tendances email",
    "opportunites_flows": ["string — flows à créer ou optimiser"],
    "insights_segmentation": "string — observations sur la segmentation à partir des personas",
    "benchmarks": "string — métriques de référence pour le secteur"
  },
  "analyse_offres": {
    "tendances_marche": "string — résumé des tendances offres/bundles",
    "opportunites_bundles": ["string — bundles à créer et pourquoi"],
    "insights_pricing": "string — observations sur le pricing à partir des données AOV/conversion",
    "calendrier_commercial": "string — événements ou périodes à exploiter"
  },
  "personas_prioritaires": {
    "persona_roi": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] },
    "persona_growth": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] },
    "persona_ltv": { "code": "string", "raison": "string", "actions_prioritaires": ["string"] }
  },
  "campagnes_suggerees": [
    { "nom": "string — nom de la campagne transversale suggérée", "objectif": "string", "persona": "string", "logique": "string — comment ads + offre + email s'articulent" }
  ]
}

Retourne UNIQUEMENT du JSON valide. Pas de markdown, pas de backticks, pas de texte avant ou après.`;

  const personaDescriptions = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => `- ${p.code} : ${p.full_label} : ${p.description || "Profil en cours de définition."}`)
    .join("\n");

  const userPrompt = `=== CONTEXTE MARQUE ===
${CLIENT_CONTEXT.brand} — ${CLIENT_CONTEXT.description}
Produits : ${CLIENT_CONTEXT.products.map(p => `${p.name} (${p.price}€)`).join(", ")}
Canaux : ${CLIENT_CONTEXT.channels.join(", ")}
Ton : ${CLIENT_CONTEXT.tone}

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

--- Tendances Ads ---
${adsResearch || "Non disponible"}

--- Tendances Email ---
${emailResearch || "Non disponible"}

--- Tendances Offres ---
${offersResearch || "Non disponible"}

=== BASE DE CONNAISSANCES (226 sources) ===
${SOURCES_CONSULTED.join(", ")} + 214 autres sources spécialisées en Meta Ads, Klaviyo, bundling DTC, psychologie cognitive et UX e-commerce.

Analyse ces données et produis ta synthèse analytique JSON.`;

  console.log("[generate-marketing] Calling Gemini 3.1 Pro for analysis...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
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
    console.error("[generate-marketing] Gemini 3.1 Pro error:", response.status, errText);
    if (response.status === 429) throw new Error("RATE_LIMIT: AI Gateway rate limit exceeded");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED: AI credits exhausted");
    throw new Error(`Gemini 3.1 error ${response.status}: ${errText}`);
  }

  const aiResponse = await response.json();
  const rawContent = aiResponse.choices?.[0]?.message?.content;
  const geminiTokens = aiResponse.usage?.total_tokens || 0;
  logUsage("gemini", "gemini-3.1-pro-preview", geminiTokens);

  if (!rawContent) throw new Error("Empty response from Gemini 3.1");

  try {
    return JSON.parse(cleanJsonResponse(rawContent));
  } catch (parseErr) {
    console.error("[generate-marketing] Gemini 3.1 JSON parse error. Raw:", rawContent.slice(0, 500));
    throw new Error(`Gemini 3.1 JSON parse error: ${(parseErr as Error).message}`);
  }
}


// ============================================
// STEP 4: CLAUDE OPUS GENERATION (NEW)
// ============================================
async function callClaudeOpus(
  geminiSynthesis: any,
  collectedData: any,
): Promise<any> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const { personaData, personaRows, priorities, globalMetrics } = collectedData;

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();

  const personaDescriptions = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => `- ${p.code} : ${p.full_label} : ${p.description || ""}`)
    .join("\n");

  const systemPrompt = `Tu es le directeur marketing IA d'Ask-It. Tu génères des recommandations marketing hebdomadaires pour des marques e-commerce.

TU DOIS RESPECTER CES RÈGLES ABSOLUES :
- Ne recommande JAMAIS un produit qui n'existe pas dans le catalogue de la marque
- Chaque recommandation doit être IMMÉDIATEMENT ACTIONNABLE — le client doit pouvoir agir sans interprétation
- Les scripts, hooks, ad copies et lignes d'objet doivent être rédigés EN FRANÇAIS, prêts à être utilisés tels quels
- Les prompts IA doivent être rédigés EN ANGLAIS (les outils de génération fonctionnent mieux en anglais)
- Les prix et montants doivent utiliser les vrais prix des produits de la marque
- Chaque recommandation doit cibler un persona spécifique identifié dans les données
- Les inspirations doivent citer des VRAIES marques connues avec des descriptions réalistes
- Ne pas inventer d'URLs — mettre null si tu n'as pas de lien vérifié
- Utilise le ton de voix de la marque : ${CLIENT_CONTEXT.tone}
- Les recommandations doivent être VARIÉES en formats, angles et personas ciblés
- NOMENCLATURE : Dans les textes visibles, utiliser TOUJOURS le prénom du persona. Les codes PX ne doivent apparaître QUE dans les champs techniques (persona_cible, etc.)
- INTERDICTION : emojis, caractères non-latins, termes internes ("Bloc A/B/C"), jargon non expliqué
- MÉTRIQUES LISIBLES : "ROAS 3.8:1" → "un retour de 3,80€ pour chaque euro dépensé"

CATALOGUE PRODUITS :
${CLIENT_CONTEXT.products.map(p => `- ${p.name} (${p.type}) — ${p.price}€`).join("\n")}

PERSONAS DISPONIBLES :
${personaDescriptions}

NOMBRE DE RECOMMANDATIONS À GÉNÉRER :
- ads_v2 : exactement 3 recommandations (varier les formats : au moins 1 vidéo et 1 statique ou carousel)
- offers_v2 : exactement 3 recommandations (varier les types : bundle, upsell, prix psychologique, etc.)
- emails_v2 : exactement 3 recommandations (varier les types : newsletter, flow, campagne, etc.)
- campaigns_overview : 1 à 2 campagnes qui lient certaines recos entre elles via des campaign_id partagés

POUR LES IDs : utilise "rec-ads-001", "rec-ads-002", "rec-offers-001", "rec-emails-001", "camp-001" etc.

Tu reçois une synthèse analytique et tu dois générer un JSON STRICT avec cette structure exacte. Aucun texte avant ou après le JSON. Pas de markdown, pas de commentaires, juste le JSON.

STRUCTURE JSON ATTENDUE :
{
  "ads_v2": [
    {
      "id": "rec-ads-001",
      "title": "string",
      "persona_cible": "PX",
      "format": "reel|story|carousel|static|ugc",
      "funnel_stage": "awareness|consideration|conversion|retention",
      "contenu_creatif": {
        "hook_text": "string ou null",
        "hook_audio": "string ou null",
        "script_complet": "string ou null",
        "descriptif_visuel": "string",
        "headline_image": "string ou null",
        "body_copy": "string ou null",
        "slides": null,
        "direction_artistique": "string"
      },
      "ad_copy": { "primary_text": "string", "headline": "string", "description": "string" },
      "cta": "string",
      "angle_psychologique": "string",
      "ciblage_detaille": {
        "audiences_suggested": ["string"],
        "exclusions": ["string"],
        "custom_audience_source": "string ou null"
      },
      "ab_test_suggestion": {
        "element_a_tester": "string",
        "variante_a": "string",
        "variante_b": "string",
        "raison": "string",
        "duree_test_recommandee": "string"
      },
      "landing_page_alignement": { "url_destination": null, "elements_coherence": ["string"] },
      "prompt_ia_generation": "string en anglais",
      "inspirations": [{ "description": "string", "marque": "string", "pourquoi": "string", "url": null }],
      "budget_suggere": "string",
      "placement": "string",
      "plateforme": "meta|tiktok|both",
      "kpi_attendu": "string",
      "campaign_id": "camp-001 ou null",
      "priorite": "haute|moyenne|basse",
      "sources_utilisees": ["string"]
    }
  ],
  "offers_v2": [
    {
      "id": "rec-offers-001",
      "title": "string",
      "persona_cible": "PX",
      "type_offre": "bundle|upsell|cross_sell|offre_limitee|prix_psychologique|fidelite",
      "concept": "string",
      "composition": [{ "produit": "string", "role_dans_bundle": "string" }],
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
      "urgency_trigger": "string ou null",
      "canal_distribution": "site|email|ads|tous",
      "periode_recommandee": "string",
      "metriques_succes": {
        "kpis_a_surveiller": ["string"],
        "seuil_succes": "string",
        "action_si_echec": "string"
      },
      "campaign_id": "camp-001 ou null",
      "priorite": "haute|moyenne|basse",
      "sources_utilisees": ["string"]
    }
  ],
  "emails_v2": [
    {
      "id": "rec-emails-001",
      "title": "string",
      "persona_cible": "PX",
      "type_email": "newsletter|flow_automation|campagne_promo|relance|post_diagnostic|winback",
      "objet": "string",
      "objet_variante": "string",
      "preview_text": "string",
      "structure_sections": [{ "section": "string", "contenu": "string", "conseil_design": "string" }],
      "messaging_principal": "string",
      "cta_principal": { "texte": "string", "url_destination": null, "couleur_suggeree": "string ou null" },
      "segment_klaviyo": "string",
      "trigger": "string ou null",
      "timing": "string",
      "position_dans_flow": {
        "flow_name": "string ou null",
        "position": "string ou null",
        "email_precedent": "string ou null",
        "email_suivant": "string ou null",
        "logique_branchement": "string ou null"
      },
      "dynamic_content_rules": [{ "bloc_concerne": "string", "regle": "string", "fallback": "string" }],
      "metriques_cibles": {
        "taux_ouverture_vise": "string",
        "taux_clic_vise": "string",
        "benchmark_industrie": "string"
      },
      "tone_of_voice": "string",
      "campaign_id": "camp-001 ou null",
      "priorite": "haute|moyenne|basse",
      "sources_utilisees": ["string"]
    }
  ],
  "campaigns_overview": [
    {
      "id": "camp-001",
      "nom": "string",
      "objectif": "string",
      "persona_principal": "PX",
      "duree": "string",
      "strategie_resumee": "string",
      "recos_ads_ids": ["rec-ads-001"],
      "recos_offers_ids": ["rec-offers-001"],
      "recos_emails_ids": ["rec-emails-001"],
      "timeline": [{ "jour": "string", "action": "string", "canal": "string" }]
    }
  ],
  "persona_focus": {
    "roi": { "code": "string", "name": "string", "reason": "string" },
    "growth": { "code": "string", "name": "string", "reason": "string" },
    "ltv": { "code": "string", "name": "string", "reason": "string" }
  },
  "checklist": [
    { "id": "task_1", "title": "string", "personas": ["PX"], "category": "ads|email|offers", "priority": "high|medium|low", "completed": false, "detail": {} }
  ]
}`;

  const userPrompt = `=== SYNTHÈSE ANALYTIQUE (Gemini 3.1 Pro) ===
${JSON.stringify(geminiSynthesis, null, 2)}

=== DONNÉES DES 3 PERSONAS PRIORITAIRES ===
ROI — ${priorities.best_roi?.code} (${priorities.best_roi?.name}):
${JSON.stringify(personaData[priorities.best_roi?.code] || {}, null, 2)}

Growth — ${priorities.best_growth?.code} (${priorities.best_growth?.name}):
${JSON.stringify(personaData[priorities.best_growth?.code] || {}, null, 2)}

LTV — ${priorities.best_ltv?.code} (${priorities.best_ltv?.name}):
${JSON.stringify(personaData[priorities.best_ltv?.code] || {}, null, 2)}

=== MÉTRIQUES GLOBALES ===
${JSON.stringify(globalMetrics)}

=== CONTEXTE TEMPOREL ===
${currentMonth} ${currentYear}

Génère les recommandations marketing v2 complètes. JSON uniquement, aucun texte autour.`;

  console.log("[generate-marketing] Calling Claude Opus 4 for generation...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-marketing] Claude Opus error:", response.status, errText);
    throw new Error(`Claude Opus error ${response.status}: ${errText}`);
  }

  const claudeResponse = await response.json();
  const rawContent = claudeResponse.content?.[0]?.text;
  const claudeTokens = (claudeResponse.usage?.input_tokens || 0) + (claudeResponse.usage?.output_tokens || 0);
  logUsage("anthropic", "claude-opus-4-20250514", claudeTokens);

  if (!rawContent) throw new Error("Empty response from Claude Opus");

  try {
    return JSON.parse(cleanJsonResponse(rawContent));
  } catch (parseErr) {
    console.error("[generate-marketing] Claude Opus JSON parse error. Raw:", rawContent.slice(0, 500));
    throw new Error(`Claude Opus JSON parse error: ${(parseErr as Error).message}`);
  }
}


// ============================================
// STEP 5: FALLBACK — LEGACY GEMINI 2.5 PRO (v1 only)
// ============================================
async function callGeminiLegacy(collectedData: any, perplexityResearch: any): Promise<any> {
  // This is the original callGemini function — used as fallback when Gemini 3.1 or Opus fails
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const { personaData, personaRows, priorities, globalMetrics, previousUncompletedTasks } = collectedData;
  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();
  const { adsResearch, emailResearch, offersResearch } = perplexityResearch;

  const personaDescriptions = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => `- ${p.code} : ${p.full_label} : ${p.description || ""}`)
    .join("\n");

  // Reuse the exact same massive system prompt from the original function
  const systemPrompt = `Tu es un directeur marketing senior spécialisé en e-commerce DTC skincare et cosmétiques pour enfants, avec 15 ans d'expérience en stratégie d'acquisition Meta Ads, email marketing Klaviyo et optimisation de panier moyen. Tu travailles comme consultant exclusif pour la marque Ouate Paris.

=== CONTEXTE MARQUE OUATE PARIS ===
${CLIENT_CONTEXT.brand} — ${CLIENT_CONTEXT.description}
Gamme : ${CLIENT_CONTEXT.products.map(p => `${p.name} (${p.type}) — ~${p.price}€`).join(", ")}
Routine complète (3+ produits) — entre 45€ et 65€
Positionnement : Made in France, dermatologiquement testé, 0% ingrédients controversés, packaging ludique et éco-responsable.

=== PERSONAS ===
${personaDescriptions}
P0 — Non attribué : Ne pas cibler.

=== INTELLIGENCE MARCHÉ (${currentMonth} ${currentYear}) ===
--- Ads ---
${adsResearch || "Non disponible"}
--- Email ---
${emailResearch || "Non disponible"}
--- Offres ---
${offersResearch || "Non disponible"}

=== RÈGLES ===
- Utiliser les prénoms des personas, jamais les codes PX dans les textes visibles
- Hooks en français, prêts à l'emploi
- Pas d'emojis, pas de caractères non-latins
- Métriques lisibles (pas de jargon)
- Chaque recommandation justifiée par donnée persona + framework marketing
- Varier les catégories checklist : min 2 ads, 1 email newsletter, 1 email flow, 1 offres`;

  const p = priorities;
  const userPrompt = `Données personas (30 jours) :
${JSON.stringify(personaData, null, 2)}

Métriques globales : ${JSON.stringify(globalMetrics)}

Personas prioritaires :
- ROI : ${p.best_roi?.code} ${p.best_roi?.name} — ${p.best_roi_value}€/session
- Growth : ${p.best_growth?.code} ${p.best_growth?.name} — +${p.best_growth_ca}€ potentiel
- LTV : ${p.best_ltv?.code} ${p.best_ltv?.name} — score ${p.best_ltv_score}

${previousUncompletedTasks?.length > 0 ? `Tâches non complétées à reconduire (max 2/5) :\n${previousUncompletedTasks.map((t: any, i: number) => `${i + 1}. [${t.category}] ${t.title}`).join("\n")}` : ""}

Contexte temporel : ${currentMonth} ${currentYear}.

Génère les recommandations v1. JSON uniquement :
{ "persona_focus": {...}, "checklist": [...], "ads_recommendations": {...}, "email_recommendations": {...}, "offers_recommendations": {...} }`;

  console.log("[generate-marketing] [FALLBACK] Calling Gemini 2.5 Pro...");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-marketing] [FALLBACK] Gemini 2.5 Pro error:", response.status, errText);
    throw new Error(`Fallback Gemini error ${response.status}: ${errText}`);
  }

  const aiResponse = await response.json();
  const rawContent = aiResponse.choices?.[0]?.message?.content;
  const geminiTokens = aiResponse.usage?.total_tokens || 0;
  logUsage("gemini", "gemini-2.5-pro", geminiTokens, { fallback: true });

  if (!rawContent) throw new Error("Empty response from fallback Gemini");

  try {
    return JSON.parse(cleanJsonResponse(rawContent));
  } catch (parseErr) {
    console.error("[generate-marketing] [FALLBACK] JSON parse error:", rawContent.slice(0, 500));
    throw new Error(`Fallback JSON parse error: ${(parseErr as Error).message}`);
  }
}


// ============================================
// STEP 6: V2 → V1 CONVERSION (FALLBACK)
// ============================================
function convertV2toV1(opusResult: any): { ads_recommendations: any; email_recommendations: any; offers_recommendations: any } {
  const ads = opusResult.ads_v2 || [];
  const emails = opusResult.emails_v2 || [];
  const offers = opusResult.offers_v2 || [];

  const ads_recommendations = {
    hooks_creatifs: ads.map((a: any) => ({
      text: a.contenu_creatif?.hook_text || a.title,
      personas: [a.persona_cible],
      rationale: a.angle_psychologique || "",
    })),
    concepts_video: ads.filter((a: any) => ["reel", "ugc", "story"].includes(a.format)).map((a: any) => ({
      title: a.title,
      personas: [a.persona_cible],
      description: a.contenu_creatif?.descriptif_visuel || a.contenu_creatif?.script_complet || "",
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

  const email_recommendations = {
    newsletters: emails.filter((e: any) => e.type_email === "newsletter").map((e: any) => ({
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
    flows_automatises: emails.filter((e: any) => e.type_email !== "newsletter").map((e: any) => ({
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
    bundles: offers.filter((o: any) => ["bundle", "offre_limitee"].includes(o.type_offre)).map((o: any) => ({
      name: o.title,
      personas: [o.persona_cible],
      produits: (o.composition || []).map((c: any) => c.produit).join(", "),
      prix: `${o.pricing_strategy?.prix_bundle || ""} (au lieu de ${o.pricing_strategy?.prix_unitaire_total || ""}, soit ${o.pricing_strategy?.economie_affichee || ""})`,
      rationale: o.concept,
    })),
    prix_psychologiques: offers.filter((o: any) => o.type_offre === "prix_psychologique").map((o: any) => ({
      strategie: o.concept,
      rationale: o.pricing_strategy?.ancrage_prix || "",
    })),
    upsells: offers.filter((o: any) => ["upsell", "cross_sell"].includes(o.type_offre)).map((o: any) => ({
      trigger: o.title,
      action: o.concept,
      taux_acceptation_estime: o.metriques_succes?.seuil_succes || "",
    })),
  };

  // Ensure at least empty arrays for v1 compatibility
  if (ads_recommendations.hooks_creatifs.length === 0) ads_recommendations.hooks_creatifs = [{ text: "", personas: [], rationale: "" }];
  if (email_recommendations.newsletters.length === 0) email_recommendations.newsletters = [];
  if (offers_recommendations.bundles.length === 0) offers_recommendations.bundles = [];

  return { ads_recommendations, email_recommendations, offers_recommendations };
}


// ============================================
// STEP 7: PERSISTENCE
// ============================================
async function saveRecommendations(
  supabase: any,
  result: any,
  config: {
    version: number;
    weekStart: string;
    generationDurationMs: number;
    modelsUsed: { research: string; analysis: string; generation: string };
    sessionsAnalyzed: number;
    personasCount: number;
    perplexityResearch: any;
  }
) {
  // Archive previous active recommendation
  await supabase
    .from("marketing_recommendations")
    .update({ status: "archived" })
    .eq("status", "active");

  if (config.version === 2) {
    // V2 insertion — full pipeline result
    const v1Data = convertV2toV1(result);

    // Aggregate all sources
    const allSources = new Set<string>([...SOURCES_CONSULTED]);
    for (const list of [result.ads_v2, result.offers_v2, result.emails_v2]) {
      for (const item of (list || [])) {
        for (const src of (item.sources_utilisees || [])) {
          allSources.add(src);
        }
      }
    }
    if (config.perplexityResearch.adsResearch) allSources.add("perplexity:ads_research");
    if (config.perplexityResearch.emailResearch) allSources.add("perplexity:email_research");
    if (config.perplexityResearch.offersResearch) allSources.add("perplexity:offers_research");

    const { data: inserted, error: insertErr } = await supabase
      .from("marketing_recommendations")
      .insert({
        week_start: config.weekStart,
        generated_at: new Date().toISOString(),
        status: "active",
        recommendation_version: 2,
        // V2 columns
        ads_v2: result.ads_v2 || [],
        offers_v2: result.offers_v2 || [],
        emails_v2: result.emails_v2 || [],
        campaigns_overview: result.campaigns_overview || [],
        // V1 columns (converted fallback)
        persona_focus: result.persona_focus || null,
        checklist: result.checklist || [],
        ads_recommendations: v1Data.ads_recommendations,
        email_recommendations: v1Data.email_recommendations,
        offers_recommendations: v1Data.offers_recommendations,
        sources_consulted: Array.from(allSources),
        // Meta
        generation_config: {
          models_used: config.modelsUsed,
          sources_count: allSources.size,
          personas_count: config.personasCount,
          sessions_analyzed: config.sessionsAnalyzed,
          generation_duration_ms: config.generationDurationMs,
        },
      })
      .select()
      .single();

    if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
    return inserted;

  } else {
    // V1 insertion — legacy fallback
    const sourcesWithPerplexity = [
      ...SOURCES_CONSULTED,
      ...(config.perplexityResearch.adsResearch ? ["perplexity:ads_research"] : []),
      ...(config.perplexityResearch.emailResearch ? ["perplexity:email_research"] : []),
      ...(config.perplexityResearch.offersResearch ? ["perplexity:offers_research"] : []),
    ];

    const { data: inserted, error: insertErr } = await supabase
      .from("marketing_recommendations")
      .insert({
        week_start: config.weekStart,
        generated_at: new Date().toISOString(),
        status: "active",
        recommendation_version: 1,
        persona_focus: result.persona_focus,
        checklist: result.checklist,
        ads_recommendations: result.ads_recommendations,
        email_recommendations: result.email_recommendations,
        offers_recommendations: result.offers_recommendations,
        sources_consulted: sourcesWithPerplexity,
        generation_config: {
          models_used: config.modelsUsed,
          sessions_analyzed: config.sessionsAnalyzed,
          personas_count: config.personasCount,
          generation_duration_ms: config.generationDurationMs,
          fallback: true,
        },
      })
      .select()
      .single();

    if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
    return inserted;
  }
}


// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ── GET: Return latest active recommendations ──
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("marketing_recommendations")
        .select("*")
        .eq("status", "active")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(
          JSON.stringify({ status: "empty", message: "Aucune recommandation générée" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST: Generate new recommendations ──
    if (req.method === "POST") {
      const startTime = Date.now();

      // Step 0: Fetch previous uncompleted tasks
      console.log("[generate-marketing] Step 0: Fetching previous uncompleted tasks...");
      const { data: prevRec } = await supabase
        .from("marketing_recommendations")
        .select("checklist")
        .eq("status", "archived")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousUncompletedTasks = (prevRec?.checklist || [])
        .filter((t: any) => t && !t.completed)
        .map((t: any) => ({ title: t.title, category: t.category, detail: t.detail, personas: t.personas }));

      // Step 1: Collect persona data
      console.log("[generate-marketing] Step 1: Collecting persona data...");
      const collectedData = await collectPersonaData(supabase);
      collectedData.previousUncompletedTasks = previousUncompletedTasks;
      console.log("[generate-marketing] Step 1 done. Sessions:", collectedData.globalMetrics.total_sessions);

      // Step 2: Perplexity research
      console.log("[generate-marketing] Step 2: Perplexity web research...");
      const perplexityResearch = await callPerplexityResearch(collectedData.globalAggregates);
      console.log("[generate-marketing] Step 2 done.");

      const weekStart = getMonday(new Date());
      const personasCount = Object.keys(collectedData.personaData).length;

      // Step 3: Try Gemini 3.1 Pro analysis
      let geminiSynthesis: any = null;
      let geminiSuccess = false;

      try {
        console.log("[generate-marketing] Step 3: Gemini 3.1 Pro analysis...");
        geminiSynthesis = await callGeminiAnalysis(collectedData, perplexityResearch);
        geminiSuccess = true;
        console.log("[generate-marketing] Step 3 done. Campaigns suggested:", geminiSynthesis.campagnes_suggerees?.length || 0);
      } catch (geminiErr) {
        const errMsg = geminiErr instanceof Error ? geminiErr.message : "unknown";
        console.error("[generate-marketing] Step 3 FAILED (Gemini 3.1):", errMsg);
        logUsage("gemini", "gemini-3.1-pro-preview", 0, { error: errMsg, step: "analysis" });

        // Check for rate limit / payment errors — propagate these
        if (errMsg.startsWith("RATE_LIMIT") || errMsg.startsWith("PAYMENT_REQUIRED")) {
          throw geminiErr;
        }
      }

      // Step 4: Try Claude Opus generation (only if Gemini succeeded)
      if (geminiSuccess && geminiSynthesis) {
        try {
          console.log("[generate-marketing] Step 4: Claude Opus generation...");
          const opusResult = await callClaudeOpus(geminiSynthesis, collectedData);
          console.log("[generate-marketing] Step 4 done. Ads:", opusResult.ads_v2?.length, "Offers:", opusResult.offers_v2?.length, "Emails:", opusResult.emails_v2?.length);

          // Validate required v2 fields
          if (!opusResult.ads_v2 || !opusResult.offers_v2 || !opusResult.emails_v2) {
            throw new Error("Opus response missing required v2 fields");
          }

          // Step 5: Save v2
          console.log("[generate-marketing] Step 5: Saving v2 recommendations...");
          const inserted = await saveRecommendations(supabase, opusResult, {
            version: 2,
            weekStart,
            generationDurationMs: Date.now() - startTime,
            modelsUsed: {
              research: "perplexity/sonar-pro",
              analysis: "google/gemini-3.1-pro-preview",
              generation: "anthropic/claude-opus-4-20250514",
            },
            sessionsAnalyzed: collectedData.globalMetrics.total_sessions,
            personasCount,
            perplexityResearch,
          });

          console.log("[generate-marketing] ✓ V2 generation complete. ID:", inserted.id);

          return new Response(JSON.stringify(inserted), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });

        } catch (opusErr) {
          const errMsg = opusErr instanceof Error ? opusErr.message : "unknown";
          console.error("[generate-marketing] Step 4 FAILED (Claude Opus):", errMsg);
          logUsage("anthropic", "claude-opus-4-20250514", 0, { error: errMsg, step: "generation" });
          // Fall through to legacy fallback
        }
      }

      // ── FALLBACK: Legacy Gemini 2.5 Pro (v1 only) ──
      console.log("[generate-marketing] FALLBACK: Using legacy Gemini 2.5 Pro pipeline...");
      try {
        const legacyResult = await callGeminiLegacy(collectedData, perplexityResearch);

        if (!legacyResult.persona_focus || !legacyResult.checklist || !legacyResult.ads_recommendations) {
          throw new Error("Legacy response missing required v1 fields");
        }

        const inserted = await saveRecommendations(supabase, legacyResult, {
          version: 1,
          weekStart,
          generationDurationMs: Date.now() - startTime,
          modelsUsed: {
            research: "perplexity/sonar-pro",
            analysis: "none (fallback)",
            generation: "google/gemini-2.5-pro",
          },
          sessionsAnalyzed: collectedData.globalMetrics.total_sessions,
          personasCount,
          perplexityResearch,
        });

        console.log("[generate-marketing] ✓ V1 fallback generation complete. ID:", inserted.id);

        return new Response(JSON.stringify(inserted), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (fallbackErr) {
        // Level 4: Everything failed — don't insert, keep old reco
        const errMsg = fallbackErr instanceof Error ? fallbackErr.message : "unknown";
        console.error("[generate-marketing] ALL PIPELINES FAILED:", errMsg);
        logUsage("system", "none", 0, { error: errMsg, step: "total_failure" });
        throw new Error(`All generation pipelines failed. Last error: ${errMsg}`);
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-marketing] Error:", message);

    let status = 500;
    if (message.startsWith("RATE_LIMIT")) status = 429;
    else if (message.startsWith("PAYMENT_REQUIRED")) status = 402;
    else if (message.includes("AI Gateway error") || message.includes("Claude Opus error")) status = 502;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
