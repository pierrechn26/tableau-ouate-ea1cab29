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

const PROJECT_ID = "ouate";


// ============================================
// QUOTA MANAGEMENT
// ============================================
async function checkAndUpdateQuota(
  supabase: any,
  generationType: "global" | "ads" | "offers" | "emails",
  recommendationId?: string,
  dryRun = false
): Promise<{ allowed: boolean; usage: any; countForType: number }> {
  const monthYear = getCurrentMonthYear();
  const countForType = generationType === "global" ? 9 : 3;

  // Upsert usage row for this project/month
  const { data: existing } = await supabase
    .from("recommendation_usage")
    .select("*")
    .eq("project_id", PROJECT_ID)
    .eq("month_year", monthYear)
    .maybeSingle();

  if (!existing) {
    // Create new row
    const { data: created, error } = await supabase
      .from("recommendation_usage")
      .insert({
        project_id: PROJECT_ID,
        month_year: monthYear,
        total_generated: 0,
        monthly_limit: 36,
        plan: "starter",
        generations_log: [],
      })
      .select()
      .single();
    if (error) throw new Error(`Quota create error: ${error.message}`);
    const usage = created;
    if (usage.total_generated + countForType > usage.monthly_limit) {
      return { allowed: false, usage, countForType };
    }
    if (!dryRun && recommendationId) {
      await supabase.from("recommendation_usage").update({
        total_generated: usage.total_generated + countForType,
        generations_log: [
          ...(usage.generations_log || []),
          {
            timestamp: new Date().toISOString(),
            type: generationType,
            count: countForType,
            recommendation_id: recommendationId,
          },
        ],
        updated_at: new Date().toISOString(),
      }).eq("project_id", PROJECT_ID).eq("month_year", monthYear);
    }
    return { allowed: true, usage: { ...usage, total_generated: usage.total_generated + countForType }, countForType };
  }

  // Check quota
  if (existing.total_generated + countForType > existing.monthly_limit) {
    return { allowed: false, usage: existing, countForType };
  }

  if (!dryRun && recommendationId) {
    await supabase.from("recommendation_usage").update({
      total_generated: existing.total_generated + countForType,
      generations_log: [
        ...(existing.generations_log || []),
        {
          timestamp: new Date().toISOString(),
          type: generationType,
          count: countForType,
          recommendation_id: recommendationId,
        },
      ],
      updated_at: new Date().toISOString(),
    }).eq("project_id", PROJECT_ID).eq("month_year", monthYear);
  }

  return { allowed: true, usage: existing, countForType };
}

async function getQuota(supabase: any) {
  const monthYear = getCurrentMonthYear();
  const { data } = await supabase
    .from("recommendation_usage")
    .select("*")
    .eq("project_id", PROJECT_ID)
    .eq("month_year", monthYear)
    .maybeSingle();

  const usage = data || { total_generated: 0, monthly_limit: 36, plan: "starter", generations_log: [] };
  return {
    total_generated: usage.total_generated,
    monthly_limit: usage.monthly_limit,
    remaining: usage.monthly_limit - usage.total_generated,
    plan: usage.plan,
    generations_log: usage.generations_log || [],
  };
}


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
  const personaAOVs = activePersonas.filter((p: any) => p.business.conversions > 0).map((p: any) => p.business.aov);
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
// STEP 2: PERPLEXITY RESEARCH (adapted by type)
// ============================================
async function callPerplexityResearch(
  globalAggregates: any,
  type: "global" | "ads" | "offers" | "emails"
): Promise<{ adsResearch: string; emailResearch: string; offersResearch: string }> {
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
      { role: "user", content: `Recherche les meilleures pratiques actuelles en email marketing e-commerce pour le secteur ${CLIENT_CONTEXT.sector}. Inclure : taux d'ouverture benchmarks beauté DTC, tendances de segmentation, innovations en flows automatisés Klaviyo (welcome, post-quiz, winback, replenishment), lignes d'objet qui performent pour les mamans. Notre taux d'opt-in email est de ${avgOptinEmailGlobal}%. Focus sur Klaviyo et les marques DTC. ${currentWeek}, ${currentMonth} ${currentYear}.` },
    ],
  }) : Promise.resolve("");

  const offersPromise = (type === "global" || type === "offers") ? safeFetch("offers", {
    model: "sonar-pro",
    messages: [
      { role: "system", content: "Tu es un expert en stratégie commerciale e-commerce DTC spécialisé en pricing, bundles, upsells et cross-sells. Réponds avec des données chiffrées et des exemples concrets." },
      { role: "user", content: `Recherche les stratégies d'offres, bundles et pricing qui fonctionnent en e-commerce ${CLIENT_CONTEXT.sector}. AOV moyen ${avgAovGlobal}€ (range: ${aovRange}), ${multiChildrenRateGlobal}% de clientes multi-enfants. Inclure : techniques de bundling (routine complète, découverte, saisonnier), prix psychologiques, stratégies de lancement, urgence et scarcity qui convertissent, upsells post-achat performants. Focus sur les marques DTC premium. ${currentWeek}, ${currentMonth} ${currentYear}.` },
    ],
  }) : Promise.resolve("");

  const [adsResearch, emailResearch, offersResearch] = await Promise.all([adsPromise, emailPromise, offersPromise]);

  const successCount = [adsResearch, emailResearch, offersResearch].filter((r) => r.length > 0).length;
  console.log(`[generate-marketing] Perplexity research: ${successCount}/3 calls succeeded`);

  return { adsResearch, emailResearch, offersResearch };
}


// ============================================
// STEP 3: GEMINI 3.1 PRO ANALYSIS
// ============================================
async function callGeminiAnalysis(
  collectedData: any,
  perplexityResearch: { adsResearch: string; emailResearch: string; offersResearch: string },
  type: "global" | "ads" | "offers" | "emails"
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const { personaData, personaRows, priorities, globalMetrics } = collectedData;
  const { adsResearch, emailResearch, offersResearch } = perplexityResearch;

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();

  // Build category-specific analysis structure
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
Produits : ${CLIENT_CONTEXT.products.map(p => `${p.name} (${p.price}€)`).join(", ")}
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
${SOURCES_CONSULTED.join(", ")} + 214 autres sources spécialisées.

Analyse ces données et produis ta synthèse analytique JSON.`;

  console.log(`[generate-marketing] Calling Gemini 3.1 Pro for ${type} analysis...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

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
// STEP 4: CLAUDE OPUS GENERATION (adapted by type)
// ============================================
async function callClaudeOpus(
  geminiSynthesis: any,
  collectedData: any,
  type: "global" | "ads" | "offers" | "emails"
): Promise<any> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const { personaData, personaRows, priorities } = collectedData;

  const personaDescriptions = (personaRows || [])
    .filter((p: any) => !p.is_pool)
    .map((p: any) => `- ${p.code} : ${p.full_label} : ${p.description || ""}`)
    .join("\n");

  // Type-specific generation counts and structure
  const typeInstructions = type === "global"
    ? `GÉNÉRER :
- ads_v2 : exactement 3 recommandations (varier les formats : au moins 1 vidéo et 1 statique ou carousel)
- offers_v2 : exactement 3 recommandations (varier les types : bundle, upsell, prix psychologique, etc.)
- emails_v2 : exactement 3 recommandations (varier les types : newsletter, flow, campagne, etc.)
- campaigns_overview : 1 à 2 campagnes qui lient certaines recos entre elles
- persona_focus : les 3 personas prioritaires
- checklist : 5 tâches actionnables variées (ads, email, offres)`
    : type === "ads"
    ? `GÉNÉRER :
- ads_v2 : exactement 3 recommandations (varier les formats : au moins 1 vidéo et 1 statique ou carousel)
- offers_v2 : [] (tableau vide)
- emails_v2 : [] (tableau vide)
- campaigns_overview : [] (tableau vide)
- persona_focus : les 3 personas prioritaires
- checklist : 2 tâches actionnables uniquement liées aux ads`
    : type === "offers"
    ? `GÉNÉRER :
- ads_v2 : [] (tableau vide)
- offers_v2 : exactement 3 recommandations (varier les types : bundle, upsell, prix psychologique, etc.)
- emails_v2 : [] (tableau vide)
- campaigns_overview : [] (tableau vide)
- persona_focus : les 3 personas prioritaires
- checklist : 2 tâches actionnables uniquement liées aux offres`
    : `GÉNÉRER :
- ads_v2 : [] (tableau vide)
- offers_v2 : [] (tableau vide)
- emails_v2 : exactement 3 recommandations (varier les types : newsletter, flow, campagne, etc.)
- campaigns_overview : [] (tableau vide)
- persona_focus : les 3 personas prioritaires
- checklist : 2 tâches actionnables uniquement liées à l'email marketing`;

  const systemPrompt = `Tu es le directeur marketing IA d'Ask-It. Tu génères des recommandations marketing pour des marques e-commerce.

RÈGLES ABSOLUES :
- Ne recommande JAMAIS un produit qui n'existe pas dans le catalogue
- Chaque recommandation doit être IMMÉDIATEMENT ACTIONNABLE
- Scripts, hooks, ad copies et lignes d'objet EN FRANÇAIS, prêts à l'emploi
- Prompts IA EN ANGLAIS
- Utilise les vrais prix des produits
- Cible un persona spécifique pour chaque recommandation
- Inspirations = VRAIES marques connues
- Ne pas inventer d'URLs — mettre null
- Ton : ${CLIENT_CONTEXT.tone}
- Recommandations VARIÉES en formats, angles et personas
- Prénoms des personas dans les textes visibles (pas les codes PX)
- INTERDICTION : emojis, jargon non expliqué

CATALOGUE :
${CLIENT_CONTEXT.products.map(p => `- ${p.name} (${p.type}) — ${p.price}€`).join("\n")}

PERSONAS :
${personaDescriptions}

${typeInstructions}

POUR LES IDs : "rec-ads-001", "rec-offers-001", "rec-emails-001", "camp-001" etc.

Retourne un JSON STRICT. Aucun texte avant ou après. Pas de markdown. Juste le JSON.

STRUCTURE JSON :
{
  "ads_v2": [{ "id":"string","title":"string","persona_cible":"PX","format":"reel|story|carousel|static|ugc","funnel_stage":"awareness|consideration|conversion|retention","contenu_creatif":{"hook_text":"string|null","hook_audio":"string|null","script_complet":"string|null","descriptif_visuel":"string","headline_image":"string|null","body_copy":"string|null","slides":null,"direction_artistique":"string"},"ad_copy":{"primary_text":"string","headline":"string","description":"string"},"cta":"string","angle_psychologique":"string","ciblage_detaille":{"audiences_suggested":["string"],"exclusions":["string"],"custom_audience_source":"string|null"},"ab_test_suggestion":{"element_a_tester":"string","variante_a":"string","variante_b":"string","raison":"string","duree_test_recommandee":"string"},"landing_page_alignement":{"url_destination":null,"elements_coherence":["string"]},"prompt_ia_generation":"string en anglais","inspirations":[{"description":"string","marque":"string","pourquoi":"string","url":null}],"budget_suggere":"string","placement":"string","plateforme":"meta|tiktok|both","kpi_attendu":"string","campaign_id":"string|null","priorite":"haute|moyenne|basse","sources_utilisees":["string"]}],
  "offers_v2": [{"id":"string","title":"string","persona_cible":"PX","type_offre":"bundle|upsell|cross_sell|offre_limitee|prix_psychologique|fidelite","concept":"string","composition":[{"produit":"string","role_dans_bundle":"string"}],"pricing_strategy":{"prix_unitaire_total":"string","prix_bundle":"string","economie_affichee":"string","ancrage_prix":"string"},"marge_estimee":{"cout_revient_estime":"string","marge_brute_pourcent":"string","commentaire":"string"},"plan_de_lancement":{"phase_teasing":{"duree":"string","actions":["string"]},"phase_lancement":{"duree":"string","actions":["string"]},"phase_relance":{"duree":"string","actions":["string"]}},"messaging_par_canal":{"ads":"string","email":"string","site":"string"},"angle_marketing":"string","urgency_trigger":"string|null","canal_distribution":"site|email|ads|tous","periode_recommandee":"string","metriques_succes":{"kpis_a_surveiller":["string"],"seuil_succes":"string","action_si_echec":"string"},"campaign_id":"string|null","priorite":"haute|moyenne|basse","sources_utilisees":["string"]}],
  "emails_v2": [{"id":"string","title":"string","persona_cible":"PX","type_email":"newsletter|flow_automation|campagne_promo|relance|post_diagnostic|winback","objet":"string","objet_variante":"string","preview_text":"string","structure_sections":[{"section":"string","contenu":"string","conseil_design":"string"}],"messaging_principal":"string","cta_principal":{"texte":"string","url_destination":null,"couleur_suggeree":"string"},"segment_klaviyo":"string","trigger":"string","timing":"string","position_dans_flow":{"flow_name":"string","position":"string","email_precedent":"string|null","email_suivant":"string|null","logique_branchement":"string"},"dynamic_content_rules":[{"bloc_concerne":"string","regle":"string","fallback":"string"}],"metriques_cibles":{"taux_ouverture_vise":"string","taux_clic_vise":"string","benchmark_industrie":"string"},"tone_of_voice":"string","campaign_id":"string|null","priorite":"haute|moyenne|basse","sources_utilisees":["string"]}],
  "campaigns_overview": [{"id":"string","nom":"string","objectif":"string","persona_principal":"string","duree":"string","strategie_resumee":"string","recos_ads_ids":["string"],"recos_offers_ids":["string"],"recos_emails_ids":["string"],"timeline":[{"jour":"string","action":"string","canal":"string"}]}],
  "persona_focus": {"roi":{"code":"string","name":"string","reason":"string"},"growth":{"code":"string","name":"string","reason":"string"},"ltv":{"code":"string","name":"string","reason":"string"}},
  "checklist": [{"id":"string","title":"string","category":"ads|email|offers","completed":false,"detail":{}}]
}`;

  const p = priorities;
  const userPrompt = `=== SYNTHÈSE ANALYTIQUE (Gemini) ===
${JSON.stringify(geminiSynthesis, null, 2)}

=== DONNÉES PERSONAS PRIORITAIRES ===
- ROI : ${p.best_roi?.code} ${p.best_roi?.name} — valeur/session: ${p.best_roi_value}€
- Growth : ${p.best_growth?.code} ${p.best_growth?.name} — CA potentiel: +${p.best_growth_ca}€
- LTV : ${p.best_ltv?.code} ${p.best_ltv?.name} — score: ${p.best_ltv_score}

=== CONTEXTE MARQUE ===
${CLIENT_CONTEXT.brand} — ${CLIENT_CONTEXT.description}
Produits : ${CLIENT_CONTEXT.products.map(p => `${p.name} (${p.price}€)`).join(", ")}
Code promo : ${CLIENT_CONTEXT.promoCode}

Génère les recommandations v2 au format JSON strict. Type de génération : ${type}.`;

  console.log(`[generate-marketing] Calling Claude Opus for ${type} generation...`);

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
  logUsage("anthropic", "claude-opus-4-20250514", claudeTokens, { generation_type: type });

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

  const systemPrompt = `Tu es un directeur marketing senior spécialisé en e-commerce DTC skincare et cosmétiques pour enfants.
${CLIENT_CONTEXT.brand} — ${CLIENT_CONTEXT.description}
Gamme : ${CLIENT_CONTEXT.products.map(p => `${p.name} (${p.type}) — ~${p.price}€`).join(", ")}

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

RÈGLES : Utiliser les prénoms des personas, hooks en français, pas d'emojis, métriques lisibles.`;

  const p = priorities;
  const userPrompt = `Données personas (30 jours) :
${JSON.stringify(personaData, null, 2)}
Métriques globales : ${JSON.stringify(globalMetrics)}
Personas prioritaires :
- ROI : ${p.best_roi?.code} ${p.best_roi?.name} — ${p.best_roi_value}€/session
- Growth : ${p.best_growth?.code} ${p.best_growth?.name} — +${p.best_growth_ca}€ potentiel
- LTV : ${p.best_ltv?.code} ${p.best_ltv?.name} — score ${p.best_ltv_score}
${previousUncompletedTasks?.length > 0 ? `\nTâches non complétées à reconduire (max 2/5) :\n${previousUncompletedTasks.map((t: any, i: number) => `${i + 1}. [${t.category}] ${t.title}`).join("\n")}` : ""}
Contexte temporel : ${currentMonth} ${currentYear}.
Génère les recommandations v1. JSON uniquement :
{ "persona_focus": {...}, "checklist": [...], "ads_recommendations": {...}, "email_recommendations": {...}, "offers_recommendations": {...} }`;

  console.log("[generate-marketing] [FALLBACK] Calling Gemini 2.5 Pro...");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
      title: e.title, personas: [e.persona_cible], type: "educatif",
      sujet: e.objet, contenu_cle: e.messaging_principal, cta: e.cta_principal?.texte || "",
      frequence: e.timing, segment: e.segment_klaviyo, justification: "",
    })),
    flows_automatises: emails.filter((e: any) => e.type_email !== "newsletter").map((e: any) => ({
      title: e.title, personas: [e.persona_cible],
      sequence: e.position_dans_flow?.position || "", trigger: e.trigger || "", justification: "",
    })),
    lignes_objet: emails.map((e: any) => ({ text: e.objet, personas: [e.persona_cible], context: e.type_email })),
    segmentation: emails.map((e: any) => ({ segment: e.segment_klaviyo, personas: [e.persona_cible], action: e.title })),
  };

  const offers_recommendations = {
    bundles: offers.filter((o: any) => ["bundle", "offre_limitee"].includes(o.type_offre)).map((o: any) => ({
      name: o.title, personas: [o.persona_cible],
      produits: (o.composition || []).map((c: any) => c.produit).join(", "),
      prix: `${o.pricing_strategy?.prix_bundle || ""} (au lieu de ${o.pricing_strategy?.prix_unitaire_total || ""}, soit ${o.pricing_strategy?.economie_affichee || ""})`,
      rationale: o.concept,
    })),
    prix_psychologiques: offers.filter((o: any) => o.type_offre === "prix_psychologique").map((o: any) => ({
      strategie: o.concept, rationale: o.pricing_strategy?.ancrage_prix || "",
    })),
    upsells: offers.filter((o: any) => ["upsell", "cross_sell"].includes(o.type_offre)).map((o: any) => ({
      trigger: o.title, action: o.concept, taux_acceptation_estime: o.metriques_succes?.seuil_succes || "",
    })),
  };

  if (ads_recommendations.hooks_creatifs.length === 0) ads_recommendations.hooks_creatifs = [{ text: "", personas: [], rationale: "" }];

  return { ads_recommendations, email_recommendations, offers_recommendations };
}


// ============================================
// STEP 7: PERSISTENCE (accumulate, don't replace)
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
    generationType: string;
    generatedCategories: string[];
  }
) {
  // NOTE: We no longer archive previous recs — recommendations accumulate
  // We only set the new one to 'active' status
  if (config.version === 2) {
    const v1Data = convertV2toV1(result);

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
        generation_type: config.generationType,
        generated_categories: config.generatedCategories,
        ads_v2: result.ads_v2 || [],
        offers_v2: result.offers_v2 || [],
        emails_v2: result.emails_v2 || [],
        campaigns_overview: result.campaigns_overview || [],
        persona_focus: result.persona_focus || null,
        checklist: result.checklist || [],
        ads_recommendations: v1Data.ads_recommendations,
        email_recommendations: v1Data.email_recommendations,
        offers_recommendations: v1Data.offers_recommendations,
        sources_consulted: Array.from(allSources),
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
        generation_type: config.generationType,
        generated_categories: config.generatedCategories,
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
    // ── GET: Return all active recommendations + quota ──
    if (req.method === "GET") {
      const [recsResult, quota] = await Promise.all([
        supabase
          .from("marketing_recommendations")
          .select("*")
          .eq("status", "active")
          .order("generated_at", { ascending: false }),
        getQuota(supabase),
      ]);

      if (recsResult.error) throw recsResult.error;

      const recommendations = recsResult.data || [];

      return new Response(JSON.stringify({ recommendations, quota }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST: Generate new recommendations ──
    if (req.method === "POST") {
      const startTime = Date.now();

      // Parse generation type
      let body: any = {};
      try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
      } catch (_) {}
      const generationType: "global" | "ads" | "offers" | "emails" = body.type || "global";
      const generatedCategories = generationType === "global"
        ? ["ads", "offers", "emails"]
        : [generationType];

      console.log(`[generate-marketing] POST type="${generationType}"`);

      // Step 0: Check quota (dry run — before generating)
      const quotaCheck = await checkAndUpdateQuota(supabase, generationType, undefined, true);
      if (!quotaCheck.allowed) {
        const q = quotaCheck.usage;
        return new Response(JSON.stringify({
          error: "quota_exceeded",
          current: q.total_generated,
          limit: q.monthly_limit,
          remaining: q.monthly_limit - q.total_generated,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Step 1: Collect persona data
      console.log("[generate-marketing] Step 1: Collecting persona data...");
      const collectedData = await collectPersonaData(supabase);
      console.log("[generate-marketing] Step 1 done. Sessions:", collectedData.globalMetrics.total_sessions);

      // Step 2: Perplexity research (filtered by type)
      console.log("[generate-marketing] Step 2: Perplexity web research...");
      const perplexityResearch = await callPerplexityResearch(collectedData.globalAggregates, generationType);
      console.log("[generate-marketing] Step 2 done.");

      const weekStart = getMonday(new Date());
      const personasCount = Object.keys(collectedData.personaData).length;

      // Step 3: Try Gemini 3.1 Pro analysis
      let geminiSynthesis: any = null;
      let geminiSuccess = false;

      try {
        console.log("[generate-marketing] Step 3: Gemini 3.1 Pro analysis...");
        geminiSynthesis = await callGeminiAnalysis(collectedData, perplexityResearch, generationType);
        geminiSuccess = true;
        console.log("[generate-marketing] Step 3 done.");
      } catch (geminiErr) {
        const errMsg = geminiErr instanceof Error ? geminiErr.message : "unknown";
        console.error("[generate-marketing] Step 3 FAILED (Gemini 3.1):", errMsg);
        logUsage("gemini", "gemini-3.1-pro-preview", 0, { error: errMsg, step: "analysis" });
        if (errMsg.startsWith("RATE_LIMIT") || errMsg.startsWith("PAYMENT_REQUIRED")) throw geminiErr;
      }

      // Step 4: Try Claude Opus generation
      if (geminiSuccess && geminiSynthesis) {
        try {
          console.log("[generate-marketing] Step 4: Claude Opus generation...");
          const opusResult = await callClaudeOpus(geminiSynthesis, collectedData, generationType);
          console.log("[generate-marketing] Step 4 done.");

          // Step 5: Save v2
          console.log("[generate-marketing] Step 5: Saving recommendations...");
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
            generationType,
            generatedCategories,
          });
          console.log("[generate-marketing] Step 5 done. ID:", inserted.id);

          // Update quota after successful save
          await checkAndUpdateQuota(supabase, generationType, inserted.id, false);

          // Return fresh data
          const [allRecs, freshQuota] = await Promise.all([
            supabase.from("marketing_recommendations").select("*").eq("status", "active").order("generated_at", { ascending: false }),
            getQuota(supabase),
          ]);

          return new Response(JSON.stringify({ recommendations: allRecs.data || [], quota: freshQuota, latest: inserted }), {
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

      // FALLBACK: Legacy Gemini 2.5 Pro (v1 only)
      console.log("[generate-marketing] FALLBACK: Using Gemini 2.5 Pro...");
      const previousUncompletedTasks: any[] = [];
      collectedData.previousUncompletedTasks = previousUncompletedTasks;

      const legacyResult = await callGeminiLegacy(collectedData, perplexityResearch);
      const insertedLegacy = await saveRecommendations(supabase, legacyResult, {
        version: 1,
        weekStart,
        generationDurationMs: Date.now() - startTime,
        modelsUsed: {
          research: "perplexity/sonar-pro",
          analysis: "google/gemini-2.5-pro",
          generation: "google/gemini-2.5-pro",
        },
        sessionsAnalyzed: collectedData.globalMetrics.total_sessions,
        personasCount,
        perplexityResearch,
        generationType,
        generatedCategories,
      });

      // Update quota for fallback too
      await checkAndUpdateQuota(supabase, generationType, insertedLegacy.id, false);

      const [allRecs, freshQuota] = await Promise.all([
        supabase.from("marketing_recommendations").select("*").eq("status", "active").order("generated_at", { ascending: false }),
        getQuota(supabase),
      ]);

      return new Response(JSON.stringify({ recommendations: allRecs.data || [], quota: freshQuota, latest: insertedLegacy }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    const errMsg = err?.message || "Unknown error";
    console.error("[generate-marketing] Fatal error:", errMsg);
    logUsage("system", "unknown", 0, { error: errMsg, fatal: true });
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
