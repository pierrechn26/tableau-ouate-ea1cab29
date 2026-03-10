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

function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

function logUsage(provider: string, model: string, tokens: number, metadata?: Record<string, any>) {
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    .from("api_usage_logs")
    .insert({ edge_function: "prepare-recommendations", api_provider: provider, model, tokens_used: tokens, api_calls: 1, metadata: metadata || {} })
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

export const CLIENT_CONTEXT = {
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

const PROJECT_ID = "ouate";

// ============================================
// QUOTA CHECK (dry run only — no update)
// ============================================
async function checkQuota(
  supabase: any,
  generationType: "global" | "ads" | "offers" | "emails"
): Promise<{ allowed: boolean; usage: any; countForType: number }> {
  const monthYear = getCurrentMonthYear();
  const countForType = generationType === "global" ? 9 : 3;

  const { data: existing } = await supabase
    .from("recommendation_usage")
    .select("*")
    .eq("project_id", PROJECT_ID)
    .eq("month_year", monthYear)
    .maybeSingle();

  if (!existing) {
    // No row yet — quota is fine
    return { allowed: true, usage: { total_generated: 0, monthly_limit: 36, plan: "starter" }, countForType };
  }

  const allowed = existing.total_generated + countForType <= existing.monthly_limit;
  return { allowed, usage: existing, countForType };
}

// ============================================
// STEP 1: COLLECT PERSONA DATA
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
    const multiChildPct = volume > 0 ? pSessions.filter((s: any) => (s.number_of_children || 1) > 1).length / volume : 0;
    const reactivityDist = countOccurrences(pChildren.map((c) => c.skin_reactivity));
    const excludeFragrancePct = pChildren.length > 0 ? pChildren.filter((c) => c.exclude_fragrance === true).length / pChildren.length : 0;
    const deviceDist = countOccurrences(pSessions.map((s: any) => s.device));

    const prioritiesList = pSessions.map((s: any) => s.priorities_ordered?.split(",").map((x: string) => x.trim())[0]).filter(Boolean);
    const prioritiesCounts = countOccurrences(prioritiesList);
    const topPriorities = topN(prioritiesCounts, 3).map((t) => ({
      code: t.value, label: PRIORITY_LABELS[t.value] || t.value,
      count: t.count, pct: volume > 0 ? Math.round((t.count / volume) * 100) : 0,
    }));

    const trustList = pSessions.map((s: any) => s.trust_triggers_ordered?.split(",").map((x: string) => x.trim())[0]).filter(Boolean);
    const trustCounts = countOccurrences(trustList);
    const topTrust = topN(trustCounts, 3).map((t) => ({
      code: t.value, label: TRUST_LABELS[t.value] || t.value,
      count: t.count, pct: volume > 0 ? Math.round((t.count / volume) * 100) : 0,
    }));

    const routineDist = countOccurrences(pSessions.map((s: any) => s.routine_size_preference));
    const avgDuration = volume > 0 ? Math.round(pSessions.reduce((s: number, ss: any) => s + (ss.duration_seconds || 0), 0) / volume) : 0;
    const avgEngagement = volume > 0 ? Math.round(pSessions.reduce((s: number, ss: any) => s + (ss.engagement_score || 0), 0) / volume) : 0;
    const formatDist = countOccurrences(pSessions.map((s: any) => s.content_format_preference));
    const dominantFormat = topN(formatDist, 1)[0];
    const optinEmailPct = volume > 0 ? Math.round(pSessions.filter((s: any) => s.optin_email === true).length / volume * 100) : 0;
    const optinSmsPct = volume > 0 ? Math.round(pSessions.filter((s: any) => s.optin_sms === true).length / volume * 100) : 0;
    const productCounts = splitAndCount(pSessions.map((s: any) => s.recommended_products));
    const topProducts = topN(productCounts, 5);
    const avgRecommendedCart = volume > 0 ? Math.round(pSessions.reduce((s: number, ss: any) => s + (Number(ss.recommended_cart_amount) || 0), 0) / volume * 100) / 100 : 0;
    const cartGap = aov > 0 ? Math.round((aov - avgRecommendedCart) * 100) / 100 : 0;
    const toneDist = countOccurrences(pSessions.map((s: any) => s.adapted_tone).filter(Boolean));
    const toneLabels: Record<string, string> = { playful: "Ludique", factual: "Factuel", empowering: "Autonomisant", transparent: "Transparent", expert: "Expert" };
    const toneDistPct: Record<string, number> = {};
    const toneTotal = Object.values(toneDist).reduce((a, b) => a + b, 0);
    for (const [t, n] of Object.entries(toneDist)) {
      toneDistPct[toneLabels[t] || t] = toneTotal > 0 ? Math.round((n / toneTotal) * 100) : 0;
    }
    const dominantTone = topN(toneDist, 1)[0];

    personaData[code] = {
      code, name: getPersonaFullLabel(code),
      business: { volume, conversions, conversion_rate: Math.round(conversionRate * 1000) / 10, aov: Math.round(aov * 100) / 100, total_revenue: Math.round(totalRevenue * 100) / 100 },
      profile: { age_range_distribution: ageRangeDist, num_children_distribution: numChildrenDist, multi_child_pct: Math.round(multiChildPct * 100), skin_reactivity_distribution: reactivityDist, exclude_fragrance_pct: Math.round(excludeFragrancePct * 100), dominant_device: topN(deviceDist, 1)[0]?.value || "unknown", device_distribution: deviceDist },
      psychology: { top_priorities: topPriorities, top_trust_triggers: topTrust, routine_preference_distribution: routineDist },
      behavior: { avg_duration_seconds: avgDuration, avg_engagement_score: avgEngagement, dominant_content_format: dominantFormat ? { code: dominantFormat.value, label: FORMAT_LABELS[dominantFormat.value] || dominantFormat.value } : null, content_format_distribution: formatDist, optin_email_pct: optinEmailPct, optin_sms_pct: optinSmsPct, dominant_tone: dominantTone ? (toneLabels[dominantTone.value] || dominantTone.value) : null, tone_distribution: toneDistPct },
      products: { top_5_recommended: topProducts, avg_recommended_cart: avgRecommendedCart, cart_gap_vs_aov: cartGap },
    };
  }

  const activePersonas = Object.values(personaData).filter((p: any) => p.business.volume >= 1);

  let bestROI: any = null, bestROIValue = 0;
  for (const p of activePersonas) {
    const v = (p.business.conversion_rate / 100) * p.business.aov;
    if (v > bestROIValue) { bestROIValue = v; bestROI = p; }
  }
  const globalConvPct = Math.round(globalConversion * 1000) / 10;
  let bestGrowth: any = null, bestGrowthCA = 0;
  for (const p of activePersonas) {
    if (p.business.conversion_rate >= globalConvPct || p.business.volume < 5) continue;
    const ca = ((globalConvPct - p.business.conversion_rate) / 100) * p.business.volume * p.business.aov;
    if (ca > bestGrowthCA) { bestGrowthCA = ca; bestGrowth = p; }
  }
  let bestLTV: any = null, bestLTVScore = 0;
  for (const p of activePersonas) {
    const ar = p.profile.age_range_distribution || {};
    let dominantAge: string | null = null, maxAgeCount = 0;
    for (const [a, c] of Object.entries(ar)) { if ((c as number) > maxAgeCount) { dominantAge = a; maxAgeCount = c as number; } }
    let scoreAge = 2;
    if (dominantAge === "4-6") scoreAge = 3;
    else if (dominantAge === "7-9") scoreAge = 2;
    else if (dominantAge === "10-11") scoreAge = 1;
    const coeffMulti = p.profile.multi_child_pct > 20 ? 1.5 : 1.0;
    const ltvScore = scoreAge * (p.behavior.optin_email_pct / 100) * coeffMulti;
    if (ltvScore > bestLTVScore) { bestLTVScore = ltvScore; bestLTV = { ...p, _ltvScore: Math.round(ltvScore * 100) / 100, _scoreAge: scoreAge, _dominantAge: dominantAge, _coeffMulti: coeffMulti }; }
  }
  if (!bestROI) bestROI = activePersonas[0];
  if (!bestGrowth) bestGrowth = activePersonas.length > 1 ? activePersonas[1] : activePersonas[0];
  if (!bestLTV) bestLTV = activePersonas.length > 2 ? activePersonas[2] : activePersonas[0];

  const allTrustTriggers = sessions.map((s: any) => s.trust_triggers_ordered?.split(",").map((x: string) => x.trim())[0]).filter(Boolean);
  const trustGlobalTop = topN(countOccurrences(allTrustTriggers), 1)[0];
  const trustTriggerGlobalDominant = trustGlobalTop ? (TRUST_LABELS[trustGlobalTop.value] || trustGlobalTop.value) : "Transparence des ingrédients";

  const allFormats = sessions.map((s: any) => s.content_format_preference).filter(Boolean);
  const formatGlobalTop = topN(countOccurrences(allFormats), 1)[0];
  const contentFormatGlobalDominant = formatGlobalTop ? (FORMAT_LABELS[formatGlobalTop.value] || formatGlobalTop.value) : "Contenu court et direct";

  const avgAovGlobal = Math.round(globalAOV);
  const personaAOVs = activePersonas.filter((p: any) => p.business.conversions > 0).map((p: any) => p.business.aov);
  const aovMin = personaAOVs.length > 0 ? Math.round(Math.min(...personaAOVs)) : avgAovGlobal;
  const aovMax = personaAOVs.length > 0 ? Math.round(Math.max(...personaAOVs)) : avgAovGlobal;
  const aovRange = `${aovMin}€-${aovMax}€`;
  const allProductCounts = splitAndCount(sessions.map((s: any) => s.recommended_products));
  const top5ProductsGlobal = topN(allProductCounts, 5).map((p) => p.value).join(", ");
  const multiChildrenRateGlobal = sessions.length > 0 ? Math.round(sessions.filter((s: any) => (s.number_of_children || 1) > 1).length / sessions.length * 100) : 0;
  const avgOptinEmailGlobal = sessions.length > 0 ? Math.round(sessions.filter((s: any) => s.optin_email === true).length / sessions.length * 100) : 0;
  const personasByOptin = activePersonas.filter((p: any) => p.business.volume >= 3).sort((a: any, b: any) => b.behavior.optin_email_pct - a.behavior.optin_email_pct).slice(0, 3).map((p: any) => `${p.name} (${p.behavior.optin_email_pct}%)`).join(", ");

  return {
    personaData, personaRows,
    priorities: { best_roi: bestROI, best_roi_value: Math.round(bestROIValue * 100) / 100, best_growth: bestGrowth, best_growth_ca: Math.round(bestGrowthCA), best_ltv: bestLTV, best_ltv_score: Math.round(bestLTVScore * 100) / 100 },
    globalMetrics: { total_sessions: sessions.length, total_orders: allOrders.length, global_conversion_rate: Math.round(globalConversion * 1000) / 10, global_aov: Math.round(globalAOV * 100) / 100 },
    globalAggregates: { trustTriggerGlobalDominant, contentFormatGlobalDominant, avgAovGlobal, aovRange, top5ProductsGlobal, multiChildrenRateGlobal, avgOptinEmailGlobal, top3PersonasByOptin: personasByOptin },
  };
}

// ============================================
// STEP 2: PERPLEXITY RESEARCH
// ============================================
async function callPerplexityResearch(
  globalAggregates: any,
  type: "global" | "ads" | "offers" | "emails"
): Promise<{ adsResearch: string; emailResearch: string; offersResearch: string }> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    console.warn("[prepare-recommendations] PERPLEXITY_API_KEY not configured — degraded mode");
    return { adsResearch: "", emailResearch: "", offersResearch: "" };
  }

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();
  const currentWeek = `semaine du ${getMonday(now)}`;
  const { trustTriggerGlobalDominant, contentFormatGlobalDominant, avgAovGlobal, aovRange, multiChildrenRateGlobal, avgOptinEmailGlobal } = globalAggregates;

  const TIMEOUT_MS = 30000;

  async function safeFetch(label: string, body: any): Promise<string> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) { console.error(`[prepare-recommendations] Perplexity ${label} error ${response.status}`); return ""; }
      const data = await response.json();
      logUsage("perplexity", "sonar-pro", data.usage?.total_tokens || 0, { category: label });
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.error(`[prepare-recommendations] Perplexity ${label} failed:`, err instanceof Error ? err.message : err);
      return "";
    }
  }

  const adsPromise = (type === "global" || type === "ads") ? safeFetch("ads", {
    model: "sonar-pro",
    messages: [
      { role: "system", content: "Tu es un analyste marketing spécialisé en publicités Meta Ads et TikTok Ads pour les marques e-commerce DTC beauté et skincare. Réponds de manière structurée avec des données chiffrées." },
      { role: "user", content: `Recherche les dernières tendances en publicité Meta/TikTok/Instagram pour le secteur ${CLIENT_CONTEXT.sector}. Inclure : formats qui performent le mieux en ce moment (Reels, Stories, Carrousel, Feed), hooks qui captent l'attention des mamans 25-45 ans, tendances de ciblage (Broad vs Lookalike vs Advantage+), coûts par résultat moyens en beauté DTC. Notre audience valorise "${trustTriggerGlobalDominant}" et préfère "${contentFormatGlobalDominant}". Focus sur les marques DTC similaires. ${currentWeek}, ${currentMonth} ${currentYear}.` },
    ],
  }) : Promise.resolve("");

  const emailPromise = (type === "global" || type === "emails") ? safeFetch("email", {
    model: "sonar-pro",
    messages: [
      { role: "system", content: "Tu es un expert en email marketing e-commerce et stratégie CRM Klaviyo. Réponds avec des benchmarks chiffrés (taux d'ouverture, taux de clic, CA par email)." },
      { role: "user", content: `Recherche les meilleures pratiques actuelles en email marketing e-commerce pour le secteur ${CLIENT_CONTEXT.sector}. Inclure : taux d'ouverture benchmarks beauté DTC, tendances de segmentation, innovations en flows automatisés Klaviyo, lignes d'objet qui performent pour les mamans. Notre taux d'opt-in email est de ${avgOptinEmailGlobal}%. Focus sur Klaviyo et les marques DTC. ${currentWeek}, ${currentMonth} ${currentYear}.` },
    ],
  }) : Promise.resolve("");

  const offersPromise = (type === "global" || type === "offers") ? safeFetch("offers", {
    model: "sonar-pro",
    messages: [
      { role: "system", content: "Tu es un expert en stratégie commerciale e-commerce DTC spécialisé en pricing, bundles, upsells et cross-sells. Réponds avec des données chiffrées et des exemples concrets." },
      { role: "user", content: `Recherche les stratégies d'offres, bundles et pricing qui fonctionnent en e-commerce ${CLIENT_CONTEXT.sector}. AOV moyen ${avgAovGlobal}€ (range: ${aovRange}), ${multiChildrenRateGlobal}% de clientes multi-enfants. Inclure : techniques de bundling, prix psychologiques, urgence et scarcity qui convertissent, upsells post-achat performants. ${currentWeek}, ${currentMonth} ${currentYear}.` },
    ],
  }) : Promise.resolve("");

  const [adsResearch, emailResearch, offersResearch] = await Promise.all([adsPromise, emailPromise, offersPromise]);
  const successCount = [adsResearch, emailResearch, offersResearch].filter((r) => r.length > 0).length;
  console.log(`[prepare-recommendations] Perplexity research: ${successCount}/3 calls succeeded`);
  return { adsResearch, emailResearch, offersResearch };
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
    const generationType: "global" | "ads" | "offers" | "emails" = body.type || "global";

    console.log(`[prepare-recommendations] POST type="${generationType}"`);

    // Step 0: Check quota (dry run)
    const quotaCheck = await checkQuota(supabase, generationType);
    if (!quotaCheck.allowed) {
      const q = quotaCheck.usage;
      return new Response(JSON.stringify({
        error: "quota_exceeded",
        current: q.total_generated,
        limit: q.monthly_limit,
        remaining: q.monthly_limit - q.total_generated,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Clean up expired staging rows
    await supabase.from("recommendation_staging").delete().lt("expires_at", new Date().toISOString());

    // Step 1: Create staging row
    const { data: stagingRow, error: createErr } = await supabase
      .from("recommendation_staging")
      .insert({ status: "step1_pending", generation_type: generationType })
      .select()
      .single();
    if (createErr) throw new Error(`Staging create error: ${createErr.message}`);
    const stagingId = stagingRow.id;

    // Step 2: Collect persona data
    console.log("[prepare-recommendations] Step 1: Collecting persona data...");
    const collectedData = await collectPersonaData(supabase);
    console.log("[prepare-recommendations] Step 1 done. Sessions:", collectedData.globalMetrics.total_sessions);

    // Step 3: Perplexity research
    console.log("[prepare-recommendations] Step 2: Perplexity web research...");
    const perplexityResearch = await callPerplexityResearch(collectedData.globalAggregates, generationType);
    console.log("[prepare-recommendations] Step 2 done.");

    // Step 4: Save to staging
    const { error: updateErr } = await supabase
      .from("recommendation_staging")
      .update({
        status: "step1_done",
        persona_data: collectedData,
        perplexity_results: perplexityResearch,
        client_context: { ...CLIENT_CONTEXT, sources_consulted: SOURCES_CONSULTED },
      })
      .eq("id", stagingId);
    if (updateErr) throw new Error(`Staging update error: ${updateErr.message}`);

    console.log(`[prepare-recommendations] Done. staging_id=${stagingId}`);
    return new Response(JSON.stringify({ staging_id: stagingId, status: "step1_done" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    const errMsg = err?.message || "Unknown error";
    console.error("[prepare-recommendations] Fatal error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
