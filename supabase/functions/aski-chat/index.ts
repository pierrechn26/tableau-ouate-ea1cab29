import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ======================================================
// PERPLEXITY — détecter si la question nécessite une recherche externe
// ======================================================
function needsPerplexityResearch(userMessage: string): boolean {
  const externalKeywords = [
    "tendance", "benchmark", "marché", "concurren", "stratégie",
    "best practice", "meilleure pratique", "industrie", "secteur",
    "comment font", "qu'est-ce qui marche", "nouvell", "récent",
    "innovation", "étude", "statistique", "taux moyen", "moyenne du marché",
    "meta ads", "tiktok", "facebook", "instagram", "klaviyo",
    "email marketing", "newsletter", "acquisition", "rétention",
    "bundle", "upsell", "cross-sell", "fidélisation", "ltv",
    "skincare enfant", "cosmétique enfant", "dtc", "e-commerce",
    "2024", "2025", "2026",
  ];
  const lower = userMessage.toLowerCase();
  return externalKeywords.some(k => lower.includes(k));
}

async function callPerplexity(query: string): Promise<string> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) return "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en marketing e-commerce DTC spécialisé dans la cosmétique enfants (4-11 ans).
Recherche les informations les plus récentes et pertinentes.
Fournis des données chiffrées, des exemples concrets et des sources fiables.
Réponds en français. Sois concis et actionnable. Maximum 400 mots.`,
          },
          { role: "user", content: query },
        ],
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    // Fire-and-forget: log Perplexity usage
    const perplexityModel = "sonar-pro";
    const perplexityTotalTokens = data.usage?.total_tokens || 0;
    createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
      .from("api_usage_logs")
      .insert({
        edge_function: "aski-chat",
        api_provider: "perplexity",
        model: perplexityModel,
        tokens_used: perplexityTotalTokens,
        total_tokens: perplexityTotalTokens,
        api_calls: 1,
        metadata: { type: "web_search" },
      })
      .then(() => {}).catch(() => {});
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("Perplexity call failed:", err);
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

// ======================================================
// INSIGHTS PERSONAS — calcul en temps réel depuis sessions
// ======================================================
function buildPersonaInsights(
  personaCode: string,
  sessions: any[],
  children: any[]
): string | null {
  const ps = sessions.filter((s) => s.persona_code === personaCode);
  if (ps.length === 0) return null;

  const countValues = (arr: (string | null | undefined)[]): string => {
    const counts: Record<string, number> = {};
    arr
      .filter(Boolean)
      .forEach((v) => { counts[v!] = (counts[v!] || 0) + 1; });
    if (Object.keys(counts).length === 0) return "N/A";
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([v, c]) => `${v} ${Math.round((c / arr.filter(Boolean).length) * 100)}%`)
      .join(", ");
  };

  const sessionIds = ps.map((s) => s.id);
  const personaChildren = children.filter((c) => sessionIds.includes(c.session_id));

  const priorities = ps.map((s) => s.priorities_ordered?.split(",")[0]?.trim());
  const tones = ps.map((s) => s.adapted_tone);
  const trustTriggers = ps.map((s) => s.trust_triggers_ordered?.split(",")[0]?.trim());
  const routineSizes = ps.map((s) => s.routine_size_preference);
  const formats = ps.map((s) => s.content_format_preference);
  const skinConcerns = personaChildren.map((c) => c.skin_concern);
  const ageRanges = personaChildren.map((c) => c.age_range);

  const converted = ps.filter((s) => s.conversion === true).length;
  const convRate = ps.length > 0 ? ((converted / ps.length) * 100).toFixed(1) : "0";
  const cartSessions = ps.filter((s) => s.selected_cart_amount && s.selected_cart_amount > 0);
  const aov = cartSessions.length > 0
    ? Math.round(cartSessions.reduce((sum, s) => sum + (s.selected_cart_amount || 0), 0) / cartSessions.length)
    : 0;
  const avgScore = ps.length > 0
    ? Math.round(ps.reduce((sum, s) => sum + (s.matching_score || 0), 0) / ps.length)
    : 0;
  const emailOptins = ps.filter((s) => s.optin_email).length;
  const emailRate = ps.length > 0 ? Math.round((emailOptins / ps.length) * 100) : 0;

  return `  Sessions : ${ps.length} | Score moyen : ${avgScore}% | Conversion : ${convRate}% | AOV : ${aov}€ | Email optin : ${emailRate}%
  Peaux : ${countValues(skinConcerns)}
  Âges : ${countValues(ageRanges)}
  Priorités : ${countValues(priorities)}
  Tons adaptés : ${countValues(tones)}
  Trust triggers : ${countValues(trustTriggers)}
  Format : ${countValues(formats)}
  Routine : ${countValues(routineSizes)}`;
}

// ======================================================
// MAIN
// ======================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { chatId, userMessage } = await req.json();
    if (!userMessage?.trim()) {
      return new Response(JSON.stringify({ error: "Message vide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === LIMITE MENSUELLE ===
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("aski_messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", startOfMonth.toISOString());

    if ((count ?? 0) >= 200) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      const nextMonthStr = nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      return new Response(JSON.stringify({
        error: "limit_reached",
        message: `Vous avez atteint la limite de 200 questions ce mois-ci. Le compteur se réinitialise le 1er ${nextMonthStr}.`,
        questions_used: count,
        questions_limit: 200,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === CONVERSATION ===
    let currentChatId = chatId;
    if (!currentChatId) {
      const { data: newChat, error: chatError } = await supabase
        .from("aski_chats")
        .insert({ title: "Nouvelle conversation" })
        .select("id")
        .single();
      if (chatError) throw new Error("Erreur de création de conversation.");
      currentChatId = newChat.id;
    }

    await supabase.from("aski_messages").insert({
      chat_id: currentChatId,
      role: "user",
      content: userMessage,
    });

    const { data: chatHistory } = await supabase
      .from("aski_messages")
      .select("role, content")
      .eq("chat_id", currentChatId)
      .order("created_at", { ascending: true })
      .limit(20);

    // === CHARGEMENT PARALLÈLE DE TOUTES LES DONNÉES ===
    const [
      { data: personaRows },
      { data: allSessions },
      { data: allChildren },
      { data: shopifyProducts },
      { data: latestRecos },
      perplexityContext,
    ] = await Promise.all([
      supabase
        .from("personas")
        .select("code, name, full_label, description, criteria, is_pool, is_auto_created, session_count, avg_matching_score")
        .eq("is_active", true)
        .order("code"),

      supabase
        .from("diagnostic_sessions")
        .select("id, persona_code, matching_score, adapted_tone, priorities_ordered, trust_triggers_ordered, routine_size_preference, content_format_preference, relationship, is_existing_client, number_of_children, engagement_score, conversion, selected_cart_amount, optin_email, optin_sms, duration_seconds, created_at")
        .eq("status", "termine"),

      supabase
        .from("diagnostic_children")
        .select("session_id, skin_concern, age_range, has_routine, skin_reactivity, has_ouate_products"),

      supabase
        .from("ouate_products")
        .select("title, description, product_type, price_min, price_max, tags, variants, handle, shopify_url")
        .eq("status", "active")
        .order("title"),

      supabase
        .from("marketing_recommendations")
        .select("ads_recommendations, email_recommendations, offers_recommendations, checklist, week_start")
        .eq("status", "active")
        .order("week_start", { ascending: false })
        .limit(1),

      needsPerplexityResearch(userMessage) ? callPerplexity(userMessage) : Promise.resolve(""),
    ]);

    const sessions = allSessions ?? [];
    const children = allChildren ?? [];
    const products = shopifyProducts ?? [];
    const personas = (personaRows ?? []).filter((p: any) => !p.is_pool);

    // === CONSTRUCTION SECTION PRODUITS ===
    let productsPrompt = "";
    if (products.length > 0) {
      productsPrompt = products.map((p: any) => {
        const priceStr = !p.price_min
          ? "prix NC"
          : p.price_min === p.price_max
          ? `${p.price_min}€`
          : `${p.price_min}€ - ${p.price_max}€`;
        const variantNames = (p.variants as any[])
          ?.map((v: any) => v.title)
          .filter((t: string) => t && t !== "Default Title")
          .slice(0, 4)
          .join(", ");
        const tagsStr = (p.tags as string[])?.slice(0, 5).join(", ");
        const desc = p.description ? p.description.substring(0, 180) : "";
        return `• ${p.title} (${p.product_type || "soin"}) — ${priceStr}${variantNames ? " | Variantes : " + variantNames : ""}${tagsStr ? " | Tags : " + tagsStr : ""}${desc ? "\n  " + desc : ""}`;
      }).join("\n");
    } else {
      productsPrompt = "(Sync Shopify en attente — aucun produit chargé)";
    }

    // === CONSTRUCTION INSIGHTS PERSONAS ===
    const personaInsights = personas
      .filter((p: any) => !p.is_pool)
      .map((p: any) => {
        const insights = buildPersonaInsights(p.code, sessions, children);
        if (!insights) {
          return `${p.full_label}${p.is_auto_created ? " [Auto-détecté]" : ""}\n  Description : ${p.description || "Profil en cours de définition."}\n  Aucune session terminée pour ce persona.`;
        }
        return `${p.full_label}${p.is_auto_created ? " [Auto-détecté]" : ""}\n  Description : ${p.description || "Profil en cours de définition."}\n${insights}`;
      })
      .join("\n\n");

    const p0Count = sessions.filter((s: any) => !s.persona_code || s.persona_code === "P0").length;

    // === MÉTRIQUES GLOBALES ===
    const totalSessions = sessions.length;
    const converted = sessions.filter((s: any) => s.conversion === true).length;
    const convRate = totalSessions > 0 ? ((converted / totalSessions) * 100).toFixed(1) : "0";
    const cartSessions = sessions.filter((s: any) => s.selected_cart_amount && s.selected_cart_amount > 0);
    const globalAov = cartSessions.length > 0
      ? Math.round(cartSessions.reduce((sum: number, s: any) => sum + (s.selected_cart_amount || 0), 0) / cartSessions.length)
      : 0;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = currentMonthStart;
    const currentMonthSessions = sessions.filter((s: any) => s.created_at && s.created_at >= currentMonthStart).length;
    const prevMonthSessions = sessions.filter((s: any) => s.created_at && s.created_at >= prevMonthStart && s.created_at < prevMonthEnd).length;
    const growth = prevMonthSessions > 0
      ? (((currentMonthSessions - prevMonthSessions) / prevMonthSessions) * 100).toFixed(1) + "%"
      : "N/A";

    // === SECTION DERNIÈRES RECOS MARKETING ===
    let recosContext = "";
    if (latestRecos?.[0]) {
      const r = latestRecos[0];
      const checklistItems = Array.isArray(r.checklist)
        ? r.checklist.filter((item: any) => !item.completed).slice(0, 5).map((item: any) => `  - ${item.task || item.text || item.label}`).join("\n")
        : "";
      recosContext = `Semaine du ${r.week_start}${checklistItems ? "\nTâches en cours :\n" + checklistItems : ""}`;
    }

    // === SYSTEM PROMPT DYNAMIQUE COMPLET ===
    const systemPrompt = `Tu es Aski, l'assistant IA expert marketing d'Ouate Paris. Tu as 15 ans d'expérience en marketing DTC e-commerce, spécialisé dans la cosmétique enfants (4-11 ans).

Tu as accès à 3 types de données pour répondre :
1. DONNÉES INTERNES temps réel : produits Shopify, personas + insights historiques, métriques globales
2. BASE DE CONNAISSANCES : 226 sources marketing spécialisées par catégorie
3. RECHERCHE EN TEMPS RÉEL : résultats Perplexity quand la question le nécessite

=== GAMME DE PRODUITS OUATE — SYNC SHOPIFY TEMPS RÉEL (${products.length} produit${products.length !== 1 ? "s" : ""}) ===

${productsPrompt}

⚠️ RÈGLE ABSOLUE PRODUITS : Tu ne peux recommander QUE les produits listés ci-dessus avec leurs noms et prix exacts. Si un produit n'est pas dans cette liste, il N'EXISTE PAS chez Ouate. Ne jamais inventer, extrapoler ou supposer l'existence d'un produit. Si on demande un produit absent, dire clairement qu'il n'est pas dans la gamme actuelle.

=== PERSONAS OUATE — INSIGHTS TEMPS RÉEL (${totalSessions} sessions terminées) ===

${personaInsights}

P0 — Non attribué : ${p0Count} sessions (score matching < 60%)

Toujours utiliser les prénoms des personas, jamais les codes P0-P9.

=== MÉTRIQUES GLOBALES ===

Sessions terminées : ${totalSessions} | Taux de conversion global : ${convRate}% | AOV moyen : ${globalAov}€
Mois actuel : ${currentMonthSessions} sessions | Mois précédent : ${prevMonthSessions} sessions | Évolution : ${growth}

=== BASE DE CONNAISSANCES MARKETING — 226 SOURCES SPÉCIALISÉES ===

CATÉGORIE 1 — STRATÉGIE ADS META/TIKTOK (82 sources)
Sources référentes : Motion App, Flighted, Pilothouse, Barry Hott, Nick Theriot, Dara Denney, Jon Loomer, Sarah Levinger, Chase Dimond, Andrew Faris.
Frameworks : AIDA pour vidéos, hook-problem-solution, UGC testimonials, before/after, unboxing enfants.
KPIs : CTR >1.5%, CPM, CPA, ROAS, hook rate >30%, thumb-stop ratio.
Spécificités skincare enfants : compliance publicitaire (pas de claims médicaux), visuels enfants (cadre familial, pas enfant seul), tonalité rassurante parents.

CATÉGORIE 2 — STRATÉGIE EMAILING / KLAVIYO (66 sources)
Sources référentes : Klaviyo Blog, Chase Dimond, EmailToolTester, Litmus, Really Good Emails, Val Geisler, Nik Sharma.
Frameworks : Welcome series 4-7 emails, abandon checkout 3 touches, post-purchase nurture, win-back 90j, birthday/milestone.
KPIs : open rate >35%, CTR >2.5%, revenue per recipient, list growth, unsubscribe <0.3%.
Spécificités skincare enfants : contenu éducatif peau enfant, témoignages parents, routine saisonnière, trigger événements (rentrée, été, anniversaire enfant).

CATÉGORIE 3 — STRATÉGIES OFFRES, BUNDLES, UPSELLS (66 sources)
Sources référentes : Shopify Blog, Rebuy, Bold Commerce, Recharge, Triple Whale, Nik Sharma, Taylor Holiday.
Frameworks : bundle discovery (3 produits), upsell post-achat, abonnement trimestriel, prix psychologiques (X.90€), livraison gratuite seuil.
KPIs : AOV, conversion rate, LTV, repeat purchase rate, bundle attach rate.
Spécificités skincare enfants : routines par âge, kits découverte, coffrets cadeaux, abonnement croissance.

Utilise ces sources et frameworks pour enrichir tes recommandations avec des best practices concrètes et actionnables.

${perplexityContext ? `=== RECHERCHE TEMPS RÉEL (Perplexity sonar-pro) ===
${perplexityContext}

Utilise ces informations fraîches pour compléter ta réponse avec les tendances les plus récentes.` : ""}

${recosContext ? `=== DERNIÈRES RECOMMANDATIONS MARKETING (${latestRecos?.[0]?.week_start}) ===
${recosContext}` : ""}

=== RÈGLES DE RÉPONSE ===

1. Réponds en français, de manière concise et actionnable
2. Utilise les prénoms des personas, jamais les codes P1-P9
3. Appuie-toi sur les données réelles (métriques, distributions, conversions)
4. Quand tu cites des chiffres, utilise UNIQUEMENT les données fournies dans le contexte. Si une donnée n'est pas disponible, dis-le
5. PRODUITS : Ne recommander QUE les produits listés dans la section GAMME DE PRODUITS ci-dessus avec leurs noms et prix exacts. Si un produit n'est pas dans cette liste, il n'existe pas chez Ouate
6. RECOMMANDATIONS PRODUITS PAR PERSONA : Croise le skin_concern et l'age_range dominants du persona avec les caractéristiques des produits listés
7. Quand une recherche Perplexity est disponible dans le contexte, cite les tendances et données récentes. Sinon, appuie-toi sur la base de connaissances des 226 sources
8. Structure tes réponses : constat (données) → analyse → recommandation actionnable
9. Si tu ne connais pas la réponse ou si les données sont insuffisantes, dis-le clairement
10. Ne JAMAIS inventer de données chiffrées, de produits, ou de sources
11. Ton est professionnel et accessible. Tu es un consultant qui parle à un fondateur
12. VOCABULAIRE : Ne jamais utiliser les noms techniques internes des critères dans tes réponses. Toujours les traduire en français compréhensible pour une équipe marketing. Exemples :
  - ingredient_transparency → "transparence dans la composition des ingrédients"
  - scientific_validation → "validation scientifique des formules"
  - proof_results → "preuves de résultats concrets"
  - brand_engagement → "engagement avec la marque"
  - peer_recommendation → "recommandations d'autres parents"
  - ludique → "approche ludique"
  - efficacite → "efficacité prouvée"
  - clean → "composition clean / naturelle"
  - autonomie → "autonomie de l'enfant"
  - visual → "contenu visuel"
  - short → "contenu court"
  - complete → "contenu détaillé"
  - routine_size_preference: minimal → "routine minimale"
  - routine_size_preference: simple → "routine simple"
  - routine_size_preference: complete → "routine complète"
  - content_format_preference → "format de contenu préféré"
  - trust_trigger → "déclencheur de confiance"
  - skin_reactivity → "réactivité de la peau"
  - has_routine → "a déjà une routine"
  - is_existing_client → "cliente existante"
  En revanche, les noms de personas (Clara, Nathalie, Amandine...) et les noms de produits (Mon Nettoyant Douceur, Ma Crème d'Amour...) doivent TOUJOURS être utilisés tels quels.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory ?? []).slice(0, -1).map((msg: any) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userMessage },
    ];

    // === APPEL GEMINI 2.5 PRO (long context) ===
    const mainModel = "google/gemini-2.5-pro";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s pour le long contexte

    let responseText = "";
    let tokensUsed = 0;

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: mainModel,
          messages,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Aski est temporairement indisponible. Réessayez dans quelques minutes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      responseText = aiData.choices?.[0]?.message?.content ?? "";
      tokensUsed = aiData.usage?.total_tokens ?? 0;
      const inputTokens = aiData.usage?.prompt_tokens ?? 0;
      const outputTokens = aiData.usage?.completion_tokens ?? 0;

      // Fire-and-forget: log main response usage (model captured dynamically from mainModel variable)
      supabase.from("api_usage_logs").insert({
        edge_function: "aski-chat",
        api_provider: "lovable-ai",
        model: mainModel,
        tokens_used: tokensUsed,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: tokensUsed,
        api_calls: 1,
        metadata: { type: "main_response" },
      }).then(() => {}).catch(() => {});
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") {
        return new Response(JSON.stringify({ error: "Aski met un peu de temps à réfléchir. Réessayez dans quelques secondes." }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Aski est temporairement indisponible. Réessayez dans quelques minutes." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === TITRE AUTOMATIQUE ===
    let chatTitle = "Nouvelle conversation";
    if ((chatHistory ?? []).length <= 1) {
      try {
      const titleModel = "google/gemini-2.5-flash-lite";
        const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: titleModel,
            messages: [
              {
                role: "system",
                content: `Tu génères des titres ultra-courts (2-4 mots) pour des conversations marketing. Règles strictes :
- 2 à 4 mots maximum, jamais plus
- En français, sans majuscule sauf noms propres
- Pas de guillemets, pas de ponctuation finale
- Capture le SUJET central, pas la forme de la question
- Utilise les prénoms des personas si mentionnés (Clara, Sandrine, Marine, etc.)
- Préfère les noms et verbes d'action aux articles`,
              },
              { role: "user", content: userMessage },
            ],
            max_tokens: 20,
          }),
        });
        const titleData = await titleResponse.json();
        chatTitle = titleData.choices?.[0]?.message?.content?.trim() ?? "Nouvelle conversation";
        // Fire-and-forget: log title generation usage (model captured dynamically from titleModel variable)
        const titleTotalTokens = titleData.usage?.total_tokens || 0;
        if (titleTotalTokens > 0) {
          supabase.from("api_usage_logs").insert({
            edge_function: "aski-chat",
            api_provider: "lovable-ai",
            model: titleModel,
            tokens_used: titleTotalTokens,
            total_tokens: titleTotalTokens,
            api_calls: 1,
            metadata: { type: "title_generation" },
          }).then(() => {}).catch(() => {});
        }
      } catch {
        chatTitle = userMessage.slice(0, 40);
      }
      await supabase.from("aski_chats").update({ title: chatTitle }).eq("id", currentChatId);
    } else {
      const { data: chatData } = await supabase.from("aski_chats").select("title").eq("id", currentChatId).single();
      chatTitle = chatData?.title ?? "Nouvelle conversation";
    }

    // === STOCKER ET RETOURNER ===
    await supabase.from("aski_messages").insert({
      chat_id: currentChatId,
      role: "assistant",
      content: responseText,
      tokens_used: tokensUsed,
      response_time_ms: Date.now() - startTime,
    });

    await supabase.from("aski_chats").update({ updated_at: new Date().toISOString() }).eq("id", currentChatId);

    const newCount = (count ?? 0) + 1;

    // Log si Perplexity a été appelé
    if (perplexityContext) {
      console.log(`[Aski] Perplexity called for: "${userMessage.substring(0, 80)}"`);
    }
    console.log(`[Aski] Response time: ${Date.now() - startTime}ms | Tokens: ${tokensUsed} | Products: ${products.length} | Perplexity: ${!!perplexityContext}`);

    return new Response(JSON.stringify({
      response: responseText,
      chat_id: currentChatId,
      chat_title: chatTitle,
      questions_used: newCount,
      questions_limit: 200,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("aski-chat error:", e);
    return new Response(JSON.stringify({
      error: "Aski est temporairement indisponible.",
      details: e instanceof Error ? e.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
