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
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const fromDate = fifteenDaysAgo.toISOString();

  // Fetch completed sessions from last 15 days
  const { data: sessions, error: sessionsErr } = await supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("status", "termine")
    .gte("created_at", fromDate);

  if (sessionsErr) throw new Error(`Sessions fetch error: ${sessionsErr.message}`);
  if (!sessions || sessions.length === 0) throw new Error("No completed sessions in last 15 days");

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

  // Identify priority personas
  const activePersonas = Object.values(personaData).filter((p: any) => p.business.volume >= 1);

  // Potentiel inexploité: highest volume + conversion below global average
  const belowAvgConversion = activePersonas.filter(
    (p: any) => p.business.conversion_rate < globalConversion * 100
  );
  const potentielInexploite = belowAvgConversion.sort(
    (a: any, b: any) => b.business.volume - a.business.volume
  )[0] || activePersonas[0];

  // Accélérer: best conversion rate
  const accelerer = [...activePersonas].sort(
    (a: any, b: any) => b.business.conversion_rate - a.business.conversion_rate
  )[0] || activePersonas[0];

  // Maximiser: highest AOV
  const maximiser = [...activePersonas].sort(
    (a: any, b: any) => b.business.aov - a.business.aov
  )[0] || activePersonas[0];

  return {
    personaData,
    priorities: {
      potentiel_inexploite: potentielInexploite,
      accelerer,
      maximiser,
    },
    globalMetrics: {
      total_sessions: sessions.length,
      total_orders: allOrders.length,
      global_conversion_rate: Math.round(globalConversion * 1000) / 10,
      global_aov: Math.round(globalAOV * 100) / 100,
    },
  };
}

// ── Step 2: Call Lovable AI Gateway ─────────────────────────────────
async function callGemini(collectedData: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const { personaData, priorities, globalMetrics } = collectedData;

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

=== RÈGLES DE GÉNÉRATION ===

- NOMENCLATURE OBLIGATOIRE : Dans TOUS les textes visibles (titres, descriptions, raisons, rationale, hooks, concepts), utiliser TOUJOURS le prénom du persona (Clara, Nathalie, Amandine, Julie, Stéphanie, Camille, Sandrine, Virginie, Marine). Ne JAMAIS utiliser les codes P1, P2, P3, etc. dans aucun texte. Ne JAMAIS inventer de noms, titres ou personas qui n'existent pas dans la liste ci-dessus (ex: "Grands-Parents", "Papa Solo", etc. sont INTERDITS).
- Dans le champ "nom" du persona_focus, utiliser TOUJOURS le format "Prénom — Titre" (ex: "Clara — La Novice Imperfections", "Sandrine — L'Insatisfaite").
- Dans les champs "personas" (tableaux JSON), utiliser les codes (P1, P2, etc.) car ils sont résolus côté frontend en prénoms. Mais dans les titres et textes libres, utiliser UNIQUEMENT les prénoms.
- Les recommandations doivent être ciblées sur un ou plusieurs personas selon la pertinence. Prioriser les 3 personas identifiés comme prioritaires cette semaine.
- Ne recommander QUE des actions pertinentes pour des personas qui EXISTENT réellement dans les données. Si un persona a 0 session, ne pas créer de campagne pour lui. Les 9 personas sont EXCLUSIVEMENT des mamans d'enfants de 4-11 ans. Il n'existe PAS de persona "Grands-Parents", "Papa", ou autre.
- Chaque recommandation DOIT être justifiée par DEUX éléments : une donnée persona spécifique ET un framework/best practice issu des sources marketing.
- Les hooks créatifs DOIVENT être en français, prêts à être utilisés tels quels dans Ads Manager.
- Les flows email DOIVENT être compatibles Klaviyo avec des triggers précis.
- Les bundles DOIVENT utiliser les vrais noms de produits Ouate avec des prix réalistes.
- Les ciblages Meta DOIVENT être des audiences configurables dans Ads Manager.
- ZÉRO recommandation générique. Chaque recommandation doit être immédiatement actionnable.
- Varier les catégories dans la checklist : au moins 2 actions ads, 2 actions email, 1 action offres.
- Chaque semaine les recommandations doivent être DIFFÉRENTES des semaines précédentes.`;

  const p = collectedData.priorities;
  const potentielEstimate = Math.round(p.potentiel_inexploite.business.volume * (collectedData.globalMetrics.global_conversion_rate / 100) - p.potentiel_inexploite.business.conversions);

  const userPrompt = `Voici les données actuelles des 9 personas Ouate sur les 15 derniers jours :

${JSON.stringify(personaData, null, 2)}

Métriques globales : ${JSON.stringify(globalMetrics)}

Personas prioritaires cette semaine :
- POTENTIEL INEXPLOITÉ : ${p.potentiel_inexploite.code} ${p.potentiel_inexploite.name} — ${p.potentiel_inexploite.business.volume} sessions, ${p.potentiel_inexploite.business.conversion_rate}% conversion (moyenne : ${globalMetrics.global_conversion_rate}%) → environ ${potentielEstimate} commandes potentielles à récupérer
- ACCÉLÉRER : ${p.accelerer.code} ${p.accelerer.name} — meilleur taux de conversion à ${p.accelerer.business.conversion_rate}%, ${p.accelerer.business.conversions} commandes → amplifier
- MAXIMISER : ${p.maximiser.code} ${p.maximiser.name} — AOV à ${p.maximiser.business.aov}€ (moyenne : ${globalMetrics.global_aov}€) → CA additionnel si on augmente le volume

Génère les recommandations marketing de la semaine. Retourne UNIQUEMENT du JSON valide, sans markdown, sans backticks, sans texte avant ou après :

{ "persona_focus": { "potentiel_inexploite": {"code": "PX", "nom": "...", "raison": "..."}, "accelerer": {"code": "PX", "nom": "...", "raison": "..."}, "maximiser": {"code": "PX", "nom": "...", "raison": "..."} }, "checklist": [ { "id": "task_1", "title": "Action prioritaire de la semaine — ciblée et actionnable", "personas": ["PX", "PY"], "category": "ads", "priority": "high", "completed": false, "detail": { "hooks_creatifs": ["Hook prêt à utiliser en français", "Hook 2", "Hook 3"], "concepts_video": ["Concept vidéo détaillé : format, durée, storyboard résumé, ton", "Concept 2"], "ciblage": ["Audience Meta précise", "Audience 2"], "justification": "Basé sur [donnée persona] + [framework source marketing]" } }, {"id": "task_2", "title": "...", "personas": ["PX"], "category": "email", "priority": "medium", "completed": false, "detail": {"flow": "...", "sequence": "J1 → J3 → J7", "segments": "...", "lignes_objet": ["..."], "justification": "..."}}, {"id": "task_3", "title": "...", "personas": ["PX", "PY"], "category": "offers", "priority": "medium", "completed": false, "detail": {"bundle": "...", "produits": "...", "prix": "...", "justification": "..."}}, {"id": "task_4", "title": "...", "personas": ["PX"], "category": "ads", "priority": "medium", "completed": false, "detail": {"hooks_creatifs": ["..."], "concepts_video": ["..."], "ciblage": ["..."], "justification": "..."}}, {"id": "task_5", "title": "...", "personas": ["PX"], "category": "email", "priority": "low", "completed": false, "detail": {"action": "...", "segment": "...", "expected_impact": "...", "justification": "..."}} ], "ads_recommendations": { "hooks_creatifs": [ {"text": "Hook en français prêt à utiliser", "personas": ["PX", "PY"], "rationale": "Basé sur [donnée persona] + [framework de Motion App / Dara Denney / etc.]"}, {"text": "...", "personas": ["PX"], "rationale": "..."}, {"text": "...", "personas": ["PX"], "rationale": "..."}, {"text": "...", "personas": ["PX"], "rationale": "..."}, {"text": "...", "personas": ["PX"], "rationale": "..."} ], "concepts_video": [ {"title": "Titre du concept", "personas": ["PX"], "description": "Format, storyboard résumé, ton, CTA final"}, {"title": "...", "personas": ["PX"], "description": "..."}, {"title": "...", "personas": ["PX"], "description": "..."} ], "angles_psychologiques": [ {"angle": "Nom de l'angle", "personas": ["PX"], "source": "Basé sur [donnée persona] + [framework]"}, {"angle": "...", "personas": ["PX"], "source": "..."}, {"angle": "...", "personas": ["PX"], "source": "..."} ], "ciblage": [ {"audience": "Description audience Meta Ads Manager", "personas": ["PX"]}, {"audience": "...", "personas": ["PX"]}, {"audience": "...", "personas": ["PX"]} ] }, "email_recommendations": { "flows_automatises": [ {"title": "Nom du flow Klaviyo", "personas": ["PX", "PY"], "sequence": "J1 → J3 → J7 → J14", "trigger": "Événement déclencheur"}, {"title": "...", "personas": ["PX"], "sequence": "...", "trigger": "..."}, {"title": "...", "personas": ["PX"], "sequence": "...", "trigger": "..."} ], "lignes_objet": [ {"text": "Ligne d'objet email en français", "personas": ["PX"], "context": "Type d'email"}, {"text": "...", "personas": ["PX"], "context": "..."}, {"text": "...", "personas": ["PX"], "context": "..."}, {"text": "...", "personas": ["PX"], "context": "..."}, {"text": "...", "personas": ["PX"], "context": "..."} ], "segmentation": [ {"segment": "Nom du segment Klaviyo avec critères", "personas": ["PX"], "action": "Action marketing"}, {"segment": "...", "personas": ["PX"], "action": "..."}, {"segment": "...", "personas": ["PX"], "action": "..."} ] }, "offers_recommendations": { "bundles": [ {"name": "Nom commercial du bundle", "personas": ["PX"], "produits": "Produits Ouate", "prix": "XX€ (au lieu de XX€, soit -X%)", "rationale": "Basé sur [donnée]"}, {"name": "...", "personas": ["PX", "PY"], "produits": "...", "prix": "...", "rationale": "..."}, {"name": "...", "personas": ["PX"], "produits": "...", "prix": "...", "rationale": "..."} ], "prix_psychologiques": [ {"strategie": "Description stratégie prix", "rationale": "Basé sur [donnée] + [framework]"}, {"strategie": "...", "rationale": "..."}, {"strategie": "...", "rationale": "..."} ], "upsells": [ {"trigger": "Après ajout de [produit]", "action": "Proposer [produit] avec message [texte]", "taux_acceptation_estime": "X%"}, {"trigger": "...", "action": "...", "taux_acceptation_estime": "..."}, {"trigger": "...", "action": "...", "taux_acceptation_estime": "..."} ] } }`;

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
      console.log("[generate-marketing] Step 1: Collecting persona data...");
      const collectedData = await collectPersonaData(supabase);
      console.log("[generate-marketing] Step 1 done. Sessions:", collectedData.globalMetrics.total_sessions);

      console.log("[generate-marketing] Step 2: Calling AI Gateway...");
      const recommendations = await callGemini(collectedData);
      console.log("[generate-marketing] Step 2 done. Checklist items:", recommendations.checklist?.length);

      // Validate required fields
      if (!recommendations.persona_focus || !recommendations.checklist || !recommendations.ads_recommendations) {
        console.error("[generate-marketing] Missing required fields in AI response");
        throw new Error("AI response missing required fields (persona_focus, checklist, ads_recommendations)");
      }

      console.log("[generate-marketing] Step 3: Storing in database...");
      const weekStart = getMonday(new Date());

      // Deactivate previous recommendations
      await supabase
        .from("marketing_recommendations")
        .update({ status: "archived" })
        .eq("status", "active");

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
          sources_consulted: SOURCES_CONSULTED,
          status: "active",
        })
        .select()
        .single();

      if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);

      console.log("[generate-marketing] Step 3 done. ID:", inserted.id);

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
