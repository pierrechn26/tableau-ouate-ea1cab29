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

const PERSONA_PROFILES: Record<string, { displayName: string; title: string; description: string }> = {
  P1: { displayName: "Clara", title: "La Novice Imperfections", description: "Nouvelle cliente dont l'enfant de 4-9 ans présente des imperfections cutanées. Elle découvre ce sujet pour la première fois et cherche une solution efficace, rassurante et adaptée à la peau jeune." },
  P2: { displayName: "Nathalie", title: "La Novice Pré-ado", description: "Maman d'un pré-ado de 10-11 ans qui voit apparaître les premiers boutons. Elle veut des soins adaptés à cet âge charnière, ni trop enfantins ni trop agressifs." },
  P3: { displayName: "Amandine", title: "La Novice Atopique", description: "Maman très protectrice dont l'enfant a une peau atopique diagnostiquée. Experte en lecture d'étiquettes, elle ne fait confiance qu'aux produits cliniquement testés, hypoallergéniques et sans parfum." },
  P4: { displayName: "Julie", title: "La Novice Sensible", description: "Maman précautionneuse face à la peau sensible et réactive de son enfant. Elle privilégie les formulations minimalistes et douces." },
  P5: { displayName: "Stéphanie", title: "La Multi-enfants", description: "Maman de plusieurs enfants aux types de peau différents. Elle cherche des routines simples, des produits polyvalents et un bon rapport qualité-prix." },
  P6: { displayName: "Camille", title: "La Novice Découverte", description: "Jeune maman enthousiaste qui découvre l'univers des soins pour enfants. Réceptive aux conseils et aux nouveautés, elle apprécie les parcours guidés." },
  P7: { displayName: "Sandrine", title: "L'Insatisfaite", description: "Maman exigeante qui a déjà testé plusieurs marques sans satisfaction. Devenue sceptique, elle a besoin de preuves concrètes d'efficacité et de transparence totale." },
  P8: { displayName: "Virginie", title: "La Fidèle Imperfections", description: "Cliente fidèle de Ouate qui revient régulièrement pour cibler les imperfections de son enfant. Elle fait confiance à la marque et est ouverte aux recommandations complémentaires." },
  P9: { displayName: "Marine", title: "La Fidèle Exploratrice", description: "Cliente fidèle et curieuse qui aime explorer les nouveautés Ouate. Ambassadrice naturelle, elle partage son expérience et recherche l'innovation." },
};

const getPersonaFullLabel = (code: string) => {
  const p = PERSONA_PROFILES[code];
  return p ? `${p.displayName} — ${p.title}` : code;
};

const SOURCES_CONSULTED = [
  "motionapp.com", "klaviyo.com", "flighted.co", "triplewhale.com",
  "rebuyengine.com", "j7media.com", "commonthreadco.com", "chasedimond.com",
  "baymard.com", "growth.design", "shopify.com", "bigcommerce.com",
];

// ── Step 1: Collect persona data ─────────────────────────────────────
async function collectPersonaData(supabase: any) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString();

  // Fetch completed sessions from last 30 days
  const { data: sessions, error: sessionsErr } = await supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("status", "termine")
    .gte("created_at", fromDate);

  if (sessionsErr) throw new Error(`Sessions fetch error: ${sessionsErr.message}`);
  if (!sessions || sessions.length === 0) throw new Error("No completed sessions in last 30 days");

  // Fetch children for these sessions
  const sessionIds = sessions.map((s: any) => s.id);
  const { data: children, error: childErr } = await supabase
    .from("diagnostic_children")
    .select("*")
    .in("session_id", sessionIds);

  if (childErr) throw new Error(`Children fetch error: ${childErr.message}`);

  // Fetch orders
  const sessionCodes = sessions.map((s: any) => s.session_code);
  const { data: orders, error: ordersErr } = await supabase
    .from("shopify_orders")
    .select("*")
    .in("diagnostic_session_id", sessionCodes);

  if (ordersErr) throw new Error(`Orders fetch error: ${ordersErr.message}`);

  // Build order lookup by session_code
  const ordersBySessionCode: Record<string, any[]> = {};
  for (const o of (orders || [])) {
    const sc = o.diagnostic_session_id;
    if (sc) {
      if (!ordersBySessionCode[sc]) ordersBySessionCode[sc] = [];
      ordersBySessionCode[sc].push(o);
    }
  }

  // Children lookup by session_id
  const childrenBySession: Record<string, any[]> = {};
  for (const c of (children || [])) {
    if (!childrenBySession[c.session_id]) childrenBySession[c.session_id] = [];
    childrenBySession[c.session_id].push(c);
  }

  // Global metrics for comparison
  const allOrders = orders || [];
  const globalConversion = sessions.length > 0
    ? allOrders.length / sessions.length
    : 0;
  const globalAOV = allOrders.length > 0
    ? allOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0) / allOrders.length
    : 0;

  // Build per-persona data
  const personaCodes = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"];
  const personaData: Record<string, any> = {};

  for (const code of personaCodes) {
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

    // Age range distribution
    const ageRangeDist = countOccurrences(pChildren.map((c) => c.age_range));

    // Number of children distribution
    const numChildrenDist = countOccurrences(pSessions.map((s: any) => String(s.number_of_children || 1)));
    const multiChildPct = volume > 0
      ? pSessions.filter((s: any) => (s.number_of_children || 1) > 1).length / volume
      : 0;

    // Skin reactivity
    const reactivityDist = countOccurrences(pChildren.map((c) => c.skin_reactivity));

    // Exclude fragrance
    const excludeFragrancePct = pChildren.length > 0
      ? pChildren.filter((c) => c.exclude_fragrance === true).length / pChildren.length
      : 0;

    // Device
    const deviceDist = countOccurrences(pSessions.map((s: any) => s.device));

    // Priorities (split comma-separated, take first elements)
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

    // Trust triggers
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

    // Routine size preference
    const routineDist = countOccurrences(pSessions.map((s: any) => s.routine_size_preference));

    // Behavior
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

    // Products
    const productCounts = splitAndCount(pSessions.map((s: any) => s.recommended_products));
    const topProducts = topN(productCounts, 5);

    const avgRecommendedCart = volume > 0
      ? Math.round(pSessions.reduce((s: number, ss: any) => s + (Number(ss.recommended_cart_amount) || 0), 0) / volume * 100) / 100
      : 0;

    const cartGap = aov > 0 ? Math.round((aov - avgRecommendedCart) * 100) / 100 : 0;

    personaData[code] = {
      code,
      name: getPersonaFullLabel(code),
      business: {
        volume,
        conversions,
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

  // Category 1: Best ROI Acquisition
  let bestROI: any = null;
  let bestROIValue = 0;
  for (const p of activePersonas) {
    const valuePerSession = (p.business.conversion_rate / 100) * p.business.aov;
    if (valuePerSession > bestROIValue) {
      bestROIValue = valuePerSession;
      bestROI = p;
    }
  }

  // Category 2: Biggest Growth Lever
  let bestGrowth: any = null;
  let bestGrowthCA = 0;
  const globalConvPct = Math.round(globalConversion * 1000) / 10;
  for (const p of activePersonas) {
    if (p.business.conversion_rate >= globalConvPct || p.business.volume < 5) continue;
    const caManquant = ((globalConvPct - p.business.conversion_rate) / 100) * p.business.volume * p.business.aov;
    if (caManquant > bestGrowthCA) {
      bestGrowthCA = caManquant;
      bestGrowth = p;
    }
  }

  // Category 3: Best LTV Potential
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

  // Fallbacks
  if (!bestROI) bestROI = activePersonas[0];
  if (!bestGrowth) bestGrowth = activePersonas.length > 1 ? activePersonas[1] : activePersonas[0];
  if (!bestLTV) bestLTV = activePersonas.length > 2 ? activePersonas[2] : activePersonas[0];

  // ── Global aggregates for Perplexity queries ──────────────────
  // Trust trigger global dominant
  const allTrustTriggers = sessions
    .map((s: any) => s.trust_triggers_ordered?.split(",").map((x: string) => x.trim())[0])
    .filter(Boolean);
  const trustGlobalCounts = countOccurrences(allTrustTriggers);
  const trustGlobalTop = topN(trustGlobalCounts, 1)[0];
  const trustTriggerGlobalDominant = trustGlobalTop
    ? (TRUST_LABELS[trustGlobalTop.value] || trustGlobalTop.value)
    : "Transparence des ingrédients";

  // Content format global dominant
  const allFormats = sessions.map((s: any) => s.content_format_preference).filter(Boolean);
  const formatGlobalCounts = countOccurrences(allFormats);
  const formatGlobalTop = topN(formatGlobalCounts, 1)[0];
  const contentFormatGlobalDominant = formatGlobalTop
    ? (FORMAT_LABELS[formatGlobalTop.value] || formatGlobalTop.value)
    : "Contenu court et direct";

  // AOV global average
  const avgAovGlobal = Math.round(globalAOV);

  // AOV range across personas
  const personaAOVs = activePersonas
    .filter((p: any) => p.business.conversions > 0)
    .map((p: any) => p.business.aov);
  const aovMin = personaAOVs.length > 0 ? Math.round(Math.min(...personaAOVs)) : avgAovGlobal;
  const aovMax = personaAOVs.length > 0 ? Math.round(Math.max(...personaAOVs)) : avgAovGlobal;
  const aovRange = `${aovMin}€-${aovMax}€`;

  // Top 5 products global
  const allProductCounts = splitAndCount(sessions.map((s: any) => s.recommended_products));
  const top5ProductsGlobal = topN(allProductCounts, 5).map((p) => p.value).join(", ");

  // Multi children rate global
  const multiChildrenRateGlobal = sessions.length > 0
    ? Math.round(sessions.filter((s: any) => (s.number_of_children || 1) > 1).length / sessions.length * 100)
    : 0;

  // Avg optin email global
  const avgOptinEmailGlobal = sessions.length > 0
    ? Math.round(sessions.filter((s: any) => s.optin_email === true).length / sessions.length * 100)
    : 0;

  // Top 3 personas by optin email
  const personasByOptin = activePersonas
    .filter((p: any) => p.business.volume >= 3)
    .sort((a: any, b: any) => b.behavior.optin_email_pct - a.behavior.optin_email_pct)
    .slice(0, 3)
    .map((p: any) => `${p.name} (${p.behavior.optin_email_pct}%)`)
    .join(", ");

  return {
    personaData,
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

// ── Step 2: Perplexity research calls ────────────────────────────────
async function callPerplexityResearch(globalAggregates: any): Promise<{ adsResearch: string; emailResearch: string; offersResearch: string }> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    console.warn("[generate-marketing] PERPLEXITY_API_KEY not configured — skipping web research (degraded mode)");
    return { adsResearch: "", emailResearch: "", offersResearch: "" };
  }

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();

  const {
    trustTriggerGlobalDominant,
    contentFormatGlobalDominant,
    avgAovGlobal,
    aovRange,
    multiChildrenRateGlobal,
    avgOptinEmailGlobal,
    top3PersonasByOptin,
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
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.error(`[generate-marketing] Perplexity ${label} failed:`, err instanceof Error ? err.message : err);
      return "";
    }
  }

  // Run all 3 calls in parallel
  const [adsResearch, emailResearch, offersResearch] = await Promise.all([
    // CALL 1: Ads & Creatives
    safeFetch("ads", {
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: "Tu es un analyste marketing spécialisé en publicités Meta Ads et TikTok Ads pour les marques e-commerce DTC beauté et skincare. Réponds de manière structurée avec des données chiffrées quand disponibles. Structure ta réponse en sections avec pour chaque stratégie ou format : description, benchmarks chiffrés (CTR, CPA, ROAS si disponibles), secteurs où ça fonctionne, conditions de succès. Ne cite que des stratégies ayant fait leurs preuves sur plusieurs mois, pas des micro-tendances éphémères.",
        },
        {
          role: "user",
          content: `Nous sommes en ${currentMonth} ${currentYear}. Recherche les informations suivantes pour une marque DTC de skincare pour enfants ciblant des mamans de 25-45 ans :

1. FORMATS PUBLICITAIRES : Quels formats de publicités Meta Ads et TikTok Ads ont généré les meilleurs ROAS de manière consistante sur les 12 derniers mois pour les marques DTC beauté/skincare ? Donne des benchmarks chiffrés par format (Reels, Stories, Feed, Carrousel).

2. HOOKS VIDÉO : Quels types de hooks vidéo convertissent le mieux auprès d'audiences mamans et parentalité ? Notre audience valorise principalement la "${trustTriggerGlobalDominant}" comme facteur de réassurance. Quels hooks exploitent le mieux ce levier psychologique avec des données à l'appui ?

3. FORMATS CRÉATIFS PERFORMANTS : Quels formats créatifs (UGC authentique, avant/après, témoignages, unboxing, tuto, ASMR) ont les meilleurs taux d'engagement et de conversion en beauté/skincare DTC ? Notre audience préfère le format "${contentFormatGlobalDominant}".

4. CIBLAGE : Quelles stratégies de ciblage Meta Ads fonctionnent le mieux actuellement pour les marques beauté DTC ? (Broad vs Interest-based vs Lookalike vs Advantage+)

5. TENDANCES ÉMERGENTES : Quels nouveaux formats publicitaires ou approches créatives émergent et montrent des résultats prometteurs en beauté/parentalité DTC ?`,
        },
      ],
    }),

    // CALL 2: Email Marketing (Newsletters + Flows)
    safeFetch("email", {
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en email marketing e-commerce et stratégie CRM. Réponds de manière structurée avec des benchmarks chiffrés (taux d'ouverture, taux de clic, CA généré par email) quand disponibles. Couvre autant les flows automatisés que les campagnes newsletters. Structure ta réponse en sections claires avec données chiffrées.",
        },
        {
          role: "user",
          content: `Nous sommes en ${currentMonth} ${currentYear}. Recherche les informations suivantes pour une marque e-commerce beauté/skincare DTC ciblant des mamans de 25-45 ans :

NEWSLETTERS À FORT ENGAGEMENT : Quels types de newsletters e-commerce beauté/parentalité génèrent le plus d'engagement et de CA sur les 12 derniers mois ? Compare les formats : éducatif (conseils peau, routines), storytelling (coulisses marque, fondatrice), communautaire (témoignages clientes, avant/après), promotionnel (offres exclusives, ventes privées), saisonnier (rentrée, hiver, été), curation (sélections produits par besoin). Donne des benchmarks de taux d'ouverture, taux de clic et contribution au CA par format.

FRÉQUENCE ET CALENDRIER : Quelle fréquence d'envoi newsletter optimise l'engagement sans provoquer de fatigue en beauté DTC ? Quels jours et heures fonctionnent le mieux pour les audiences mamans ? Quelle est la répartition idéale entre contenu éducatif, promotionnel et communautaire ?

FLOWS AUTOMATISÉS PERFORMANTS : Quels flows email automatisés (welcome, post-achat, winback, cross-sell, abandon panier, post-quiz, anniversaire, replenishment) génèrent le plus de CA en e-commerce beauté DTC ? Donne des benchmarks par flow.

SEGMENTATION ET PERSONNALISATION : Quelles stratégies de segmentation newsletter génèrent le plus de résultats ? (par type de peau, par âge enfant, par historique achat, par engagement, par étape du cycle de vie). Notre taux d'opt-in email moyen est de ${avgOptinEmailGlobal}%.

LIGNES D'OBJET ET CONTENU : Quelles formules de lignes d'objet newsletter obtiennent les meilleurs taux d'ouverture en beauté/parentalité ? Quels éléments de contenu newsletter augmentent le taux de clic ? (GIFs, countdown, personnalisation prénom enfant, quiz intégré, UGC, avant/après)`,
        },
      ],
    }),

    // CALL 3: Offers & Bundles
    safeFetch("offers", {
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en stratégie commerciale e-commerce DTC spécialisé en pricing, bundles, upsells et cross-sells. Réponds avec des données chiffrées et des exemples concrets de marques beauté DTC. Structure ta réponse en sections avec pour chaque stratégie : description, impact chiffré sur l'AOV, conditions de succès, exemples.",
        },
        {
          role: "user",
          content: `Nous sommes en ${currentMonth} ${currentYear}. Recherche les informations suivantes pour une marque de skincare pour enfants avec un AOV moyen de ${avgAovGlobal}€ (range : ${aovRange}) et ${multiChildrenRateGlobal}% de clientes multi-enfants :

1. BUNDLING : Quelles stratégies de bundling ont généré les meilleures augmentations d'AOV de manière prouvée sur les 12 derniers mois en e-commerce beauté DTC ? Quels types de bundles fonctionnent le mieux (routine complète, découverte, saisonnier, personnalisé) ?

2. SEUILS ET PRIX PSYCHOLOGIQUES : Quels seuils de livraison gratuite optimisent l'AOV autour de ${avgAovGlobal}€-${Math.round(avgAovGlobal * 1.4)}€ ? Quels prix psychologiques et techniques de pricing fonctionnent le mieux en beauté DTC ?

3. UPSELL POST-ACHAT : Quelles mécaniques d'upsell et cross-sell post-achat ont les meilleurs taux d'acceptation en beauté DTC ? (page de remerciement, email post-achat, panier, checkout) Donne des benchmarks.

4. STRATÉGIES MULTI-ENFANTS/FAMILLE : Quelles stratégies commerciales fonctionnent pour les familles avec plusieurs enfants ? (remises fratrie, packs famille, abonnements multi-produits)

5. PROGRAMMES DE FIDÉLITÉ : Quels mécaniques de fidélisation fonctionnent le mieux pour les marques beauté DTC avec un cycle de rachat de 2-3 mois ?`,
        },
      ],
    }),
  ]);

  // Log results
  const successCount = [adsResearch, emailResearch, offersResearch].filter((r) => r.length > 0).length;
  if (successCount === 0) {
    console.warn("[generate-marketing] All 3 Perplexity calls failed — generation will proceed in degraded mode");
  } else {
    console.log(`[generate-marketing] Perplexity research: ${successCount}/3 calls succeeded (ads: ${adsResearch.length > 0 ? "✓" : "✗"}, email: ${emailResearch.length > 0 ? "✓" : "✗"}, offers: ${offersResearch.length > 0 ? "✓" : "✗"})`);
  }

  return { adsResearch, emailResearch, offersResearch };
}

// ── Step 3: Call Lovable AI Gateway (enriched with Perplexity) ───────
async function callGemini(collectedData: any, perplexityResearch: { adsResearch: string; emailResearch: string; offersResearch: string }): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const { personaData, priorities, globalMetrics, previousUncompletedTasks } = collectedData;

  const now = new Date();
  const currentMonth = now.toLocaleString("fr-FR", { month: "long" });
  const currentYear = now.getFullYear();

  const { adsResearch, emailResearch, offersResearch } = perplexityResearch;

  const systemPrompt = `Tu es un directeur marketing senior spécialisé en e-commerce DTC skincare et cosmétiques pour enfants, avec 15 ans d'expérience en stratégie d'acquisition Meta Ads, email marketing Klaviyo et optimisation de panier moyen. Tu travailles comme consultant exclusif pour la marque Ouate Paris.

=== CONTEXTE MARQUE OUATE PARIS ===

Ouate Paris est une marque française premium de soins pour la peau des enfants de 4 à 11 ans. Fondée sur 3 piliers : efficacité dermatologique prouvée, formulations clean et naturalité (Made in France, sans ingrédients controversés), expérience ludique et sensorielle pour les enfants (packaging coloré, textures agréables, noms amusants).

Gamme de produits avec prix :
- Mon Nettoyant Douceur (gel nettoyant visage) — ~15€
- Ma Crème de Jour (hydratation quotidienne) — ~20€
- Ma Crème de Nuit (soin nocturne) — ~20€
- Ma Potion à Bisous (baume lèvres) — ~12€
- Mon Sérum Magique (soin ciblé imperfections) — ~22€
- Mes Gummies Belle Peau (compléments alimentaires beauté) — ~18€
- Routine complète (3+ produits) — entre 45€ et 65€

Positionnement marque : Made in France, dermatologiquement testé sur peaux d'enfants, 0% ingrédients controversés, formulations développées avec des pédiatres et dermatologues, packaging ludique et éco-responsable, marque premium accessible.

=== LES 9 PERSONAS OUATE (DÉFINITIONS OFFICIELLES) ===

IMPORTANT : Tu DOIS utiliser EXACTEMENT ces noms et descriptions. Ne JAMAIS inventer de nouveaux personas ou renommer ceux-ci.

${Object.entries(PERSONA_PROFILES).map(([code, p]) => `- ${code} : ${p.displayName} — ${p.title} : ${p.description}`).join("\n")}

Attribution des personas :
1. Clients existants → P8 (Virginie, si imperfections) ou P9 (Marine, exploratrice)
2. Multi-enfants avec besoins mixtes → P5 (Stéphanie)
3. Routine existante mais insatisfaite → P7 (Sandrine)
4. Novices : P2 (Nathalie, pré-ado), P1 (Clara, imperfections enfant), P3 (Amandine, atopique), P4 (Julie, sensible), P6 (Camille, découverte)

Canaux marketing actuels :
- Ads : Meta (Instagram + Facebook principalement), audiences mamans 25-45 ans intéressées beauté/enfants/parentalité
- Email/SMS : Klaviyo (flows post-diagnostic, welcome series, abandoned cart)
- Site e-commerce : www.ouate-paris.com sur Shopify
- Outil de conversion principal : diagnostic de peau en ligne IA (quiz interactif qui recommande une routine personnalisée)
- Code promo diagnostic : DIAG-15 (-15% sur la première commande)

Métriques globales actuelles :
- Panier moyen global : ~44€
- Panier moyen avec diagnostic : ~44€ (avec remise -15%), soit ~52€ sans remise
- Panier moyen sans diagnostic : ~45€
- Taux de conversion diagnostic → achat : ~10%
- 92% des utilisatrices du diagnostic sont des mamans
- 83% sont sur mobile
- 74% ont un seul enfant

=== BASE DE CONNAISSANCES MARKETING — 226 SOURCES SPÉCIALISÉES ===

Tu dois t'appuyer sur les connaissances et frameworks issus de ces sources pour formuler tes recommandations. Ce sont les références du secteur.

CATÉGORIE 1 — STRATÉGIE ADS META (82 sources)
Sources Tier 1 : Motion App (creative analytics, hooks performants, benchmarks créatifs), Flighted (Meta Ads best practices 2026, structure Test/Scale, Andromeda, Four Peaks Theory), Meta for Business (updates officielles, nouveaux formats, case studies), Jon Loomer Digital (pixels, CAPI, tracking), WordStream (benchmarks annuels CPC/CPM), Triple Whale (données agrégées ROAS/spend DTC), Social Media Examiner.
Sources Tier 2 : Common Thread Collective CTC (State of DTC, 90 exemples d'ads), KlientBoost (200 Facebook Ad Examples), MagicBrief, inBeat Agency (21 ad hooks testés), Billo (Meta Ads best practices 2025, UGC), Dara Denney (frameworks UGC), Savannah Sanchez (hooks innovants), Barry Hott (psychologie publicitaire, Ugly Ads), Foreplay.co, Demand Curve, MuteSix, Sprout Social.
Sources francophones : J7 Media, DHS Digital, Growth Room.

CATÉGORIE 2 — STRATÉGIE EMAILING / KLAVIYO (66 sources)
Sources Tier 1 : Klaviyo Blog + Email Marketing Category + Best Practices + 10 Email Automations 2025 + 9 Steps Email Strategy + Segmentation Framework + Help Center Flows.
Sources Tier 2 : Ecommerce Intelligence (7 flows avancés Klaviyo), Flowium (Top 15 Klaviyo Flows 2025), InboxArmy (15 flows), Avex Designs, Chase Dimond (leader mondial email marketing e-commerce), Chronos Agency, Hustler Marketing, Fuel Made, Postscript.
Sources francophones : Badsender, CustUp.

CATÉGORIE 3 — STRATÉGIES OFFRES, BUNDLES, UPSELLS (66 sources)
Sources Tier 1 : Shopify Enterprise (Pricing Strategies, Discount Strategies, DTC Trends 2025), BigCommerce (Upselling & Cross-Selling), ConvertCart (30+ exemples), Rebuy Engine (upsell IA), SplitBase (Bundling DTC), Peel Insights, Yotpo, Nik Sharma, Growth.design (psychologie cognitive), Baymard Institute (7000+ études UX), Nielsen Norman Group.
Sources francophones : WiziShop, Sales Odyssey.

PRIORITÉ OUATE = BEAUTÉ/SKINCARE : Prioriser Motion App, Billo (UGC skincare), Klaviyo quiz flows, Octane AI (zero-party data), bundle skincare sets, Loox (avis visuels avant/après).

=== INTELLIGENCE MARCHÉ ACTUELLE — RECHERCHES VÉRIFIÉES (${currentMonth} ${currentYear}) ===

Les synthèses ci-dessous proviennent de recherches web effectuées aujourd'hui sur les tendances actuelles du marché. Elles complètent ta base de connaissances avec des données fraîches et vérifiées. Utilise-les pour ancrer tes recommandations dans la réalité du marché actuel.

--- TENDANCES CRÉATIVES & ADS META/TIKTOK ---
${adsResearch || "Recherche non disponible cette semaine. Appuie-toi sur ta base de connaissances."}

--- TENDANCES EMAIL MARKETING & NEWSLETTERS ---
${emailResearch || "Recherche non disponible cette semaine. Appuie-toi sur ta base de connaissances."}

--- TENDANCES OFFRES, BUNDLES & STRATÉGIES COMMERCIALES ---
${offersResearch || "Recherche non disponible cette semaine. Appuie-toi sur ta base de connaissances."}

=== INSTRUCTION DE CROISEMENT DES 3 SOURCES D'INFORMATION ===

Tu disposes de 3 sources d'information complémentaires :
- BLOC A (Base de connaissances) : Les best practices, frameworks et méthodologies éprouvées issues des 226 sources marketing spécialisées. C'est ton socle d'expertise permanent.
- BLOC B (Données terrain) : Les données réelles des 9 personas Ouate avec toutes leurs métriques, comportements et psychologies. C'est ta compréhension du terrain.
- BLOC C (Intelligence marché) : Les synthèses de recherches web actuelles avec benchmarks et tendances vérifiées. C'est ta mise à jour marché.

COMMENT CROISER : Pour chaque recommandation, tu DOIS combiner au minimum 2 de ces 3 blocs. Idéalement les 3. Concrètement :
- Identifie une opportunité dans les données terrain d'un persona (Bloc B)
- Valide ou enrichis cette opportunité avec une tendance marché actuelle (Bloc C)
- Appuie-toi sur un framework ou une best practice éprouvée pour structurer la recommandation (Bloc A)

Exemple de croisement réussi : "Clara a 'Preuves de résultats' comme réassurance #1 (Bloc B). Les formats avant/après en Reels 15s génèrent actuellement un CTR 2× supérieur aux formats statiques en beauté DTC (Bloc C). → Recommandation : créer un Reel 15s avant/après ciblant Clara avec un hook problem-solution (Bloc A mapping)."

Exemple de recommandation INSUFFISANTE : "Lancer une campagne Meta avec un hook sur les résultats." → Trop générique, ne croise qu'un seul bloc.

Raisonne comme un directeur marketing senior qui doit maximiser le ROAS global de la marque en s'appuyant sur des données terrain précises ET des tendances marché validées.

=== TÂCHES NON COMPLÉTÉES DE LA SEMAINE PRÉCÉDENTE ===

Si des tâches non complétées de la semaine précédente te sont fournies, évalue chacune au regard des données personas actuelles :
- Si la tâche est toujours pertinente, reconduis-la dans la nouvelle checklist en ajoutant le champ "reconduite": true dans le JSON.
- Si elle n'est plus pertinente, remplace-la par une nouvelle action plus adaptée aux données actuelles.
- Maximum 2 tâches reconduites sur les 5 de la checklist.

=== RÈGLES DE GÉNÉRATION ===

- NOMENCLATURE OBLIGATOIRE : Dans TOUS les textes visibles (titres, descriptions, raisons, rationale, hooks, concepts), utiliser TOUJOURS le prénom du persona (Clara, Nathalie, Amandine, Julie, Stéphanie, Camille, Sandrine, Virginie, Marine). Ne JAMAIS utiliser les codes P1, P2, P3, etc. dans aucun texte. Ne JAMAIS inventer de noms, titres ou personas qui n'existent pas dans la liste ci-dessus (ex: "Grands-Parents", "Papa Solo", etc. sont INTERDITS).
- INTERDICTION ABSOLUE — CODES PERSONA : Ne JAMAIS utiliser les codes P1, P2, P3, P4, P5, P6, P7, P8, P9 dans les textes visibles par la marque (titres de tâches, justifications, descriptions de hooks, concepts vidéo, descriptions d'audiences, séquences email, noms de bundles, stratégies prix, etc.). Utiliser TOUJOURS le prénom du persona : Clara, Nathalie, Amandine, Julie, Stéphanie, Camille, Sandrine, Virginie, Marine. Les codes PX ne doivent apparaître QUE dans les champs JSON techniques "personas": ["P1", "P3"] qui sont résolus en prénoms côté frontend. Partout où du texte sera lu par un humain, écrire le prénom.
- INTERDICTION ABSOLUE — TERMES INTERNES : Ne JAMAIS utiliser les termes "Bloc A", "Bloc B", "Bloc C", "intelligence marché", "données terrain", "base de connaissances" dans les textes visibles par la marque (justifications, titres, descriptions). Ces termes sont internes. Écris en langage business naturel. Exemples :
  Au lieu de "L'intelligence marché confirme que les UGC performent" → "Les UGC génèrent actuellement un ROAS 2× supérieur aux productions léchées en beauté DTC"
  Au lieu de "Les données terrain montrent que Clara a 13% de conversion" → "Clara convertit à 13%, au-dessus de la moyenne"
  Au lieu de "Selon le Bloc A, le framework PAS est adapté" → "L'approche problème-solution est particulièrement adaptée car elle crée une connexion émotionnelle immédiate"
- Dans le champ "nom" du persona_focus, utiliser TOUJOURS le format "Prénom — Titre" (ex: "Clara — La Novice Imperfections", "Sandrine — L'Insatisfaite").
- Dans les champs "personas" (tableaux JSON), utiliser les codes (P1, P2, etc.) car ils sont résolus côté frontend en prénoms. Mais dans les titres et textes libres, utiliser UNIQUEMENT les prénoms.
- Les recommandations doivent être ciblées sur un ou plusieurs personas selon la pertinence. Prioriser les 3 personas identifiés comme prioritaires cette semaine.
- Ne recommander QUE des actions pertinentes pour des personas qui EXISTENT réellement dans les données. Si un persona a 0 session, ne pas créer de campagne pour lui. Les 9 personas sont EXCLUSIVEMENT des mamans d'enfants de 4-11 ans. Il n'existe PAS de persona "Grands-Parents", "Papa", ou autre.
- Chaque recommandation DOIT être justifiée par DEUX éléments : une donnée persona spécifique ET un framework/best practice issu des sources marketing.
- RAPPEL CRITIQUE SUR LES JUSTIFICATIONS : Ne JAMAIS écrire :
  "framework AIDA du CTC" → écrire "une structure en 4 étapes : attirer l'attention, créer l'intérêt, susciter le désir, pousser à l'action"
  "framework de Welcome Series de Klaviyo" → écrire "une séquence d'emails de bienvenue progressive"
  "selon les données de Triple Whale" → écrire "les données du marché montrent que"
  "le principe de Cialdini" → écrire "le mécanisme psychologique de preuve sociale"
  "L'intelligence marché (Bloc C) confirme que" → écrire "Les tendances actuelles du marché confirment que"
  "On applique le framework X de Y (Bloc A)" → écrire "La stratégie recommandée s'appuie sur une approche éprouvée : [description de l'approche]"
  Si tu mentionnes un chiffre ou un benchmark issu de la recherche marché, dis simplement "les benchmarks actuels du secteur indiquent que" ou "les données du marché beauté DTC montrent que" — sans citer la source.
- LISIBILITÉ DES MÉTRIQUES : Les recommandations sont lues par une marque, pas par des data analysts. Toujours exprimer les métriques de façon compréhensible :
  "ROAS 3.8:1" → "un retour sur investissement publicitaire de 3,80€ pour chaque euro dépensé"
  "ROAS 2×" → "un retour 2 fois supérieur"
  "CTR 2.4%" → "un taux de clic de 2,4%"
  "AOV +18-28%" → "une augmentation du panier moyen de 18 à 28%"
  "LTV +15%" → "une augmentation de la valeur client de 15%"
  Ne jamais utiliser de jargon technique sans explication. Chaque chiffre doit être immédiatement compréhensible par un directeur marketing non-technique.
- VÉRIFICATION FINALE OBLIGATOIRE : Avant de renvoyer le JSON, relis CHAQUE texte visible et vérifie qu'il ne contient : (1) aucun code P1-P9, (2) aucun terme "Bloc A/B/C", "intelligence marché", "données terrain", "base de connaissances", (3) aucun nom de source/framework/outil cité tel quel, (4) aucune métrique en format jargon (ROAS X:1, etc.). Si tu en trouves, corrige-les AVANT de renvoyer.
- Les hooks créatifs DOIVENT être en français, prêts à être utilisés tels quels dans Ads Manager.
- Les flows email DOIVENT être compatibles Klaviyo avec des triggers précis.
- Les bundles DOIVENT utiliser les vrais noms de produits Ouate avec des prix réalistes.
- Les ciblages Meta DOIVENT être des audiences configurables dans Ads Manager.
- ZÉRO recommandation générique. Chaque recommandation doit être immédiatement actionnable.
- Varier les catégories dans la checklist : au moins 2 actions ads, au moins 1 action email newsletter, au moins 1 action email flow, et 1 action offres.
- La checklist hebdomadaire doit contenir au moins 1 action newsletter (pas uniquement des flows automatisés).
- Chaque semaine les recommandations doivent être DIFFÉRENTES des semaines précédentes.

=== INSTRUCTIONS SPÉCIFIQUES EMAIL MARKETING ===

NEWSLETTERS — Règles obligatoires :

- Proposer au minimum 3 concepts de newsletters différents par génération dans email_recommendations.newsletters, avec des types variés (ne pas faire 3 newsletters promotionnelles)
- Chaque newsletter doit cibler un ou plusieurs personas en s'appuyant sur leurs données spécifiques :
  - priorities_ordered → détermine le THÈME (efficacité → newsletter résultats/preuves, ludique → newsletter rituels fun parent-enfant, clean → newsletter transparence ingrédients, autonomie → newsletter "mon enfant gère sa routine")
  - trust_triggers → détermine le FORMAT de preuve (proof_results → intégrer des avant/après ou témoignages, ingredient_transparency → intégrer un décryptage ingrédient, parent_testimonials → intégrer un témoignage maman)
  - age_range dominant → détermine l'ANGLE (4-6 ans → initiation au soin ludique, 7-9 ans → routine adaptée à la pré-puberté, 10-11 ans → premiers gestes beauté et confiance en soi)
  - skin_type dominant → détermine le SUJET produit (imperfections → Sérum Magique, atopique → gamme douce, sensible → routine minimaliste)
- Les lignes d'objet des newsletters doivent être en français, prêtes à utiliser, et adaptées au persona ciblé
- Indiquer la fréquence recommandée et le segment Klaviyo cible

FLOWS AUTOMATISÉS — Règles obligatoires :

- Les flows doivent être compatibles Klaviyo avec des triggers précis et des conditions de segmentation claires
- Chaque flow doit indiquer : trigger déclencheur, séquence temporelle (J1 → J3 → J7...), contenu de chaque email, condition de sortie
- Varier les types de flows : ne pas proposer uniquement des welcome series

ÉQUILIBRE NEWSLETTERS / FLOWS :

- Les recommandations email complètes doivent être réparties : environ 50% newsletters, 50% flows
- Les newsletters sont le levier principal de fidélisation et de CA récurrent. Les flows sont le levier d'automatisation et de conversion. Les deux sont complémentaires.`;

  const p = collectedData.priorities;
  const roiValuePerSession = p.best_roi_value;
  const growthCA = p.best_growth_ca;
  const ltvScore = p.best_ltv_score;

  const userPrompt = `Voici les données actuelles des 9 personas Ouate sur les 30 derniers jours :

${JSON.stringify(personaData, null, 2)}

Métriques globales : ${JSON.stringify(globalMetrics)}

Personas prioritaires cette semaine (3 catégories stratégiques) :

- 🎯 MEILLEUR ROI ACQUISITION : ${p.best_roi.code} ${p.best_roi.name} — Valeur par session : ${roiValuePerSession}€ (conv. ${p.best_roi.business.conversion_rate}% × AOV ${p.best_roi.business.aov}€). C'est le persona à cibler en priorité dans les publicités Meta car chaque euro d'acquisition y rapporte le plus.

- 🚀 PLUS GROS LEVIER DE CROISSANCE : ${p.best_growth.code} ${p.best_growth.name} — CA potentiel à récupérer : +${growthCA}€/mois (conv. actuelle ${p.best_growth.business.conversion_rate}% vs moyenne ${globalMetrics.global_conversion_rate}%, ${p.best_growth.business.volume} sessions). C'est le persona où l'optimisation du tunnel de conversion aura le plus d'impact.

- 💎 MEILLEUR POTENTIEL DE FIDÉLISATION : ${p.best_ltv.code} ${p.best_ltv.name} — Score LTV : ${ltvScore} (âge dominant enfant : ${p.best_ltv._dominantAge || "?"}, opt-in email : ${p.best_ltv.behavior.optin_email_pct}%, multi-enfants : ${p.best_ltv.profile.multi_child_pct}%). C'est le persona à cibler en priorité dans les flows email et les stratégies de rétention.

Contexte temporel : Nous sommes en ${currentMonth} ${currentYear}. Tes recommandations doivent être pertinentes pour cette période (saisonnalité, tendances actuelles, événements commerciaux à venir).

${previousUncompletedTasks && previousUncompletedTasks.length > 0 ? `
TÂCHES NON COMPLÉTÉES DE LA SEMAINE PRÉCÉDENTE (à évaluer pour reconduction) :
${previousUncompletedTasks.map((t: any, i: number) => `${i + 1}. [${t.category}] ${t.title} — Personas: ${(t.personas || []).join(", ")}`).join("\n")}

Pour chaque tâche ci-dessus, évalue si elle est toujours pertinente au regard des données actuelles. Si oui, reconduis-la (max 2 sur 5) avec "reconduite": true.
` : "Aucune tâche non complétée de la semaine précédente."}

Génère les recommandations marketing de la semaine. Retourne UNIQUEMENT du JSON valide, sans markdown, sans backticks, sans texte avant ou après. Pour les tâches reconduites, ajoute le champ "reconduite": true :

{ "persona_focus": { "best_roi_acquisition": {"code": "PX", "nom": "...", "raison": "...", "valeur_par_session": "X€"}, "levier_croissance": {"code": "PX", "nom": "...", "raison": "...", "ca_potentiel": "X€"}, "potentiel_fidelisation": {"code": "PX", "nom": "...", "raison": "...", "score_ltv": "X"} }, "checklist": [ { "id": "task_1", "title": "Action prioritaire de la semaine — ciblée et actionnable", "personas": ["PX", "PY"], "category": "ads", "priority": "high", "completed": false, "detail": { "hooks_creatifs": ["Hook prêt à utiliser en français", "Hook 2", "Hook 3"], "concepts_video": ["Concept vidéo détaillé : format, durée, storyboard résumé, ton", "Concept 2"], "ciblage": ["Audience Meta précise", "Audience 2"], "justification": "Basé sur [donnée persona] + [framework source marketing]" } }, {"id": "task_2", "title": "...", "personas": ["PX"], "category": "email", "priority": "medium", "completed": false, "detail": {"flow": "...", "sequence": "J1 → J3 → J7", "segments": "...", "lignes_objet": ["..."], "justification": "..."}}, {"id": "task_3", "title": "...", "personas": ["PX", "PY"], "category": "offers", "priority": "medium", "completed": false, "detail": {"bundle": "...", "produits": "...", "prix": "...", "justification": "..."}}, {"id": "task_4", "title": "...", "personas": ["PX"], "category": "ads", "priority": "medium", "completed": false, "detail": {"hooks_creatifs": ["..."], "concepts_video": ["..."], "ciblage": ["..."], "justification": "..."}}, {"id": "task_5", "title": "...", "personas": ["PX"], "category": "email", "priority": "low", "completed": false, "detail": {"action": "...", "segment": "...", "expected_impact": "...", "justification": "..."}} ], "ads_recommendations": { "hooks_creatifs": [ {"text": "Hook en français prêt à utiliser", "personas": ["PX", "PY"], "rationale": "Basé sur [donnée persona] + [framework de Motion App / Dara Denney / etc.]"}, {"text": "...", "personas": ["PX"], "rationale": "..."}, {"text": "...", "personas": ["PX"], "rationale": "..."}, {"text": "...", "personas": ["PX"], "rationale": "..."}, {"text": "...", "personas": ["PX"], "rationale": "..."} ], "concepts_video": [ {"title": "Titre du concept", "personas": ["PX"], "description": "Format, storyboard résumé, ton, CTA final"}, {"title": "...", "personas": ["PX"], "description": "..."}, {"title": "...", "personas": ["PX"], "description": "..."} ], "angles_psychologiques": [ {"angle": "Nom de l'angle", "personas": ["PX"], "source": "Basé sur [donnée persona] + [framework]"}, {"angle": "...", "personas": ["PX"], "source": "..."}, {"angle": "...", "personas": ["PX"], "source": "..."} ], "ciblage": [ {"audience": "Description audience Meta Ads Manager", "personas": ["PX"]}, {"audience": "...", "personas": ["PX"]}, {"audience": "...", "personas": ["PX"]} ] }, "email_recommendations": { "newsletters": [ {"title": "Titre de la newsletter", "personas": ["PX"], "type": "educatif", "sujet": "Ligne d'objet en français prête à utiliser", "contenu_cle": "Description du contenu principal en 2-3 phrases", "cta": "Call-to-action principal", "frequence": "1x/mois", "segment": "Segment Klaviyo cible", "justification": "Pourquoi cette newsletter fonctionne pour ce persona"}, {"title": "...", "personas": ["PX"], "type": "storytelling", "sujet": "...", "contenu_cle": "...", "cta": "...", "frequence": "...", "segment": "...", "justification": "..."}, {"title": "...", "personas": ["PX"], "type": "communautaire", "sujet": "...", "contenu_cle": "...", "cta": "...", "frequence": "...", "segment": "...", "justification": "..."} ], "flows_automatises": [ {"title": "Nom du flow Klaviyo", "personas": ["PX", "PY"], "sequence": "J1 → J3 → J7 → J14", "trigger": "Événement déclencheur", "justification": "Pourquoi ce flow est pertinent"}, {"title": "...", "personas": ["PX"], "sequence": "...", "trigger": "...", "justification": "..."}, {"title": "...", "personas": ["PX"], "sequence": "...", "trigger": "...", "justification": "..."} ], "lignes_objet": [ {"text": "Ligne d'objet email en français", "personas": ["PX"], "context": "Type d'email (newsletter éducative, promo, welcome, relance)"}, {"text": "...", "personas": ["PX"], "context": "..."}, {"text": "...", "personas": ["PX"], "context": "..."}, {"text": "...", "personas": ["PX"], "context": "..."}, {"text": "...", "personas": ["PX"], "context": "..."} ], "segmentation": [ {"segment": "Nom du segment Klaviyo avec critères", "personas": ["PX"], "action": "Action marketing"}, {"segment": "...", "personas": ["PX"], "action": "..."}, {"segment": "...", "personas": ["PX"], "action": "..."} ] }, "offers_recommendations": { "bundles": [ {"name": "Nom commercial du bundle", "personas": ["PX"], "produits": "Produits Ouate", "prix": "XX€ (au lieu de XX€, soit -X%)", "rationale": "Basé sur [donnée]"}, {"name": "...", "personas": ["PX", "PY"], "produits": "...", "prix": "...", "rationale": "..."}, {"name": "...", "personas": ["PX"], "produits": "...", "prix": "...", "rationale": "..."} ], "prix_psychologiques": [ {"strategie": "Description stratégie prix", "rationale": "Basé sur [donnée] + [framework]"}, {"strategie": "...", "rationale": "..."}, {"strategie": "...", "rationale": "..."} ], "upsells": [ {"trigger": "Après ajout de [produit]", "action": "Proposer [produit] avec message [texte]", "taux_acceptation_estime": "X%"}, {"trigger": "...", "action": "...", "taux_acceptation_estime": "..."}, {"trigger": "...", "action": "...", "taux_acceptation_estime": "..."} ] } }`;

  console.log("[generate-marketing] Calling Lovable AI Gateway with google/gemini-2.5-pro...");

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
    console.error("[generate-marketing] AI Gateway error:", response.status, errText);
    if (response.status === 429) throw new Error("RATE_LIMIT: AI Gateway rate limit exceeded. Please try again later.");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED: AI credits exhausted. Please add funds.");
    throw new Error(`AI Gateway error ${response.status}: ${errText}`);
  }

  const aiResponse = await response.json();
  const rawContent = aiResponse.choices?.[0]?.message?.content;

  if (!rawContent) throw new Error("Empty response from AI Gateway");

  // Clean potential markdown backticks
  let cleaned = rawContent.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    console.error("[generate-marketing] JSON parse error. Raw response:", rawContent);
    throw new Error(`JSON parse error: ${(parseErr as Error).message}`);
  }
}

// ── Main handler ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // GET: Return latest active recommendations
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

    // POST: Generate new recommendations
    if (req.method === "POST") {
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

      console.log("[generate-marketing] Previous uncompleted tasks:", previousUncompletedTasks.length);

      console.log("[generate-marketing] Step 1: Collecting persona data (30 days)...");
      const collectedData = await collectPersonaData(supabase);
      collectedData.previousUncompletedTasks = previousUncompletedTasks;
      console.log("[generate-marketing] Step 1 done. Sessions:", collectedData.globalMetrics.total_sessions);

      console.log("[generate-marketing] Step 2: Perplexity web research (3 parallel calls)...");
      const perplexityResearch = await callPerplexityResearch(collectedData.globalAggregates);
      console.log("[generate-marketing] Step 2 done.");

      console.log("[generate-marketing] Step 3: Calling AI Gateway (enriched)...");
      const recommendations = await callGemini(collectedData, perplexityResearch);
      console.log("[generate-marketing] Step 3 done. Checklist items:", recommendations.checklist?.length);

      // Validate required fields
      if (!recommendations.persona_focus || !recommendations.checklist || !recommendations.ads_recommendations) {
        console.error("[generate-marketing] Missing required fields in AI response");
        throw new Error("AI response missing required fields (persona_focus, checklist, ads_recommendations)");
      }

      console.log("[generate-marketing] Step 4: Storing in database...");
      const weekStart = getMonday(new Date());

      // Deactivate previous recommendations
      await supabase
        .from("marketing_recommendations")
        .update({ status: "archived" })
        .eq("status", "active");

      // Build sources list with Perplexity indicators
      const sourcesWithPerplexity = [
        ...SOURCES_CONSULTED,
        ...(perplexityResearch.adsResearch ? ["perplexity:ads_research"] : []),
        ...(perplexityResearch.emailResearch ? ["perplexity:email_research"] : []),
        ...(perplexityResearch.offersResearch ? ["perplexity:offers_research"] : []),
      ];

      const { data: inserted, error: insertErr } = await supabase
        .from("marketing_recommendations")
        .insert({
          week_start: weekStart,
          generated_at: new Date().toISOString(),
          persona_focus: recommendations.persona_focus,
          checklist: recommendations.checklist,
          ads_recommendations: recommendations.ads_recommendations,
          email_recommendations: recommendations.email_recommendations,
          offers_recommendations: recommendations.offers_recommendations,
          sources_consulted: sourcesWithPerplexity,
          status: "active",
        })
        .select()
        .single();

      if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);

      console.log("[generate-marketing] Step 4 done. ID:", inserted.id);

      return new Response(JSON.stringify(inserted), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    else if (message.includes("AI Gateway error")) status = 502;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
