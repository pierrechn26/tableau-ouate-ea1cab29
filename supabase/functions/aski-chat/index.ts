import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // === ÉTAPE 1: Limite mensuelle ===
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

    // === ÉTAPE 2: Gérer la conversation ===
    let currentChatId = chatId;

    if (!currentChatId) {
      const { data: newChat, error: chatError } = await supabase
        .from("aski_chats")
        .insert({ title: "Nouvelle conversation" })
        .select("id")
        .single();
      if (chatError) throw new Error("Erreur de chargement des données.");
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

    // === ÉTAPE 3: Collecter le contexte données ===
    const [{ data: allSessions }, { data: allOrders }, { data: latestRecommendations }] = await Promise.all([
      supabase.from("diagnostic_sessions").select("*").eq("status", "termine"),
      supabase.from("shopify_orders").select("*"),
      supabase.from("marketing_recommendations").select("*").eq("status", "active").order("week_start", { ascending: false }).limit(1),
    ]);

    const sessions = allSessions ?? [];
    const orders = allOrders ?? [];

    // Agrégats globaux
    const totalSessions = sessions.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price ?? 0), 0);
    const conversionRate = totalSessions > 0 ? ((sessions.filter(s => s.conversion).length / totalSessions) * 100).toFixed(1) : "0";
    const globalAov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0";

    // Métriques par persona
    const personaNames: Record<string, string> = {
      P1: "Clara — La Novice Imperfections",
      P2: "Nathalie — La Novice Pré-ado",
      P3: "Amandine — La Novice Atopique",
      P4: "Julie — La Novice Sensible",
      P5: "Stéphanie — La Multi-enfants Besoins Mixtes",
      P6: "Camille — La Novice Découverte",
      P7: "Sandrine — L'Insatisfaite",
      P8: "Virginie — La Fidèle Imperfections",
      P9: "Marine — La Fidèle Exploratrice",
    };

    const personasData: Record<string, object> = {};
    for (const [code, name] of Object.entries(personaNames)) {
      const pSessions = sessions.filter(s => s.persona_code === code || s.persona_detected === code);
      const pOrders = orders.filter(o => {
        const matchedSession = sessions.find(s => s.session_code === o.diagnostic_session_id && (s.persona_code === code || s.persona_detected === code));
        return !!matchedSession;
      });
      const pConverted = pSessions.filter(s => s.conversion).length;
      const pRevenue = pOrders.reduce((sum, o) => sum + (o.total_price ?? 0), 0);
      const pAov = pOrders.length > 0 ? pRevenue / pOrders.length : 0;

      // Distributions
      const priorities = pSessions.map(s => s.priorities_ordered).filter(Boolean);
      const routines = pSessions.map(s => s.routine_size_preference).filter(Boolean);
      const emailOptins = pSessions.filter(s => s.optin_email).length;
      const smsOptins = pSessions.filter(s => s.optin_sms).length;
      const avgDuration = pSessions.length > 0
        ? (pSessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / pSessions.length).toFixed(0)
        : "0";
      const avgEngagement = pSessions.length > 0
        ? (pSessions.reduce((sum, s) => sum + (s.engagement_score ?? 0), 0) / pSessions.length).toFixed(1)
        : "0";

      personasData[code] = {
        name,
        total_sessions: pSessions.length,
        converted: pConverted,
        conversion_rate: pSessions.length > 0 ? ((pConverted / pSessions.length) * 100).toFixed(1) + "%" : "0%",
        total_orders: pOrders.length,
        total_revenue: pRevenue.toFixed(2) + "€",
        aov: pAov.toFixed(2) + "€",
        email_optin_rate: pSessions.length > 0 ? ((emailOptins / pSessions.length) * 100).toFixed(1) + "%" : "0%",
        sms_optin_rate: pSessions.length > 0 ? ((smsOptins / pSessions.length) * 100).toFixed(1) + "%" : "0%",
        avg_duration_seconds: avgDuration,
        avg_engagement_score: avgEngagement,
        routine_preferences: routines.reduce((acc: Record<string, number>, r) => { acc[r!] = (acc[r!] ?? 0) + 1; return acc; }, {}),
        share_of_total: totalSessions > 0 ? ((pSessions.length / totalSessions) * 100).toFixed(1) + "%" : "0%",
      };
    }

    // Tendance mensuelle (mois actuel vs mois précédent)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const currentMonthSessions = sessions.filter(s => s.created_at && s.created_at >= currentMonthStart).length;
    const prevMonthSessions = sessions.filter(s => s.created_at && s.created_at >= prevMonthStart && s.created_at < prevMonthEnd).length;
    const currentMonthRevenue = orders
      .filter(o => o.created_at && o.created_at >= currentMonthStart)
      .reduce((sum, o) => sum + (o.total_price ?? 0), 0);
    const prevMonthRevenue = orders
      .filter(o => o.created_at && o.created_at >= prevMonthStart && o.created_at < prevMonthEnd)
      .reduce((sum, o) => sum + (o.total_price ?? 0), 0);

    const globalMetrics = {
      total_sessions: totalSessions,
      total_orders: totalOrders,
      total_revenue: totalRevenue.toFixed(2) + "€",
      global_conversion_rate: conversionRate + "%",
      global_aov: globalAov + "€",
      current_month_sessions: currentMonthSessions,
      prev_month_sessions: prevMonthSessions,
      sessions_growth: prevMonthSessions > 0 ? (((currentMonthSessions - prevMonthSessions) / prevMonthSessions) * 100).toFixed(1) + "%" : "N/A",
      current_month_revenue: currentMonthRevenue.toFixed(2) + "€",
      prev_month_revenue: prevMonthRevenue.toFixed(2) + "€",
      revenue_growth: prevMonthRevenue > 0 ? (((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1) + "%" : "N/A",
      persona_distribution: Object.fromEntries(
        Object.entries(personasData).map(([code, data]) => [code, (data as any).share_of_total])
      ),
    };

    // === ÉTAPE 4: Construire le prompt et appeler Gemini ===
    const systemPrompt = `Tu es Aski, l'assistant marketing IA exclusif de la marque Ouate Paris. Tu es un expert senior en marketing e-commerce DTC skincare avec 15 ans d'expérience. Tu connais intimement chaque persona, chaque produit, chaque métrique de la marque.

Tu es dans une conversation continue avec l'équipe Ouate. Tu te souviens de ce qui a été dit plus tôt dans cette conversation et tu peux faire référence aux échanges précédents. Si l'utilisateur fait référence à quelque chose discuté avant, utilise le contexte de la conversation.

=== CONTEXTE MARQUE OUATE PARIS ===

Ouate Paris est une marque française premium de soins pour la peau des enfants de 4 à 11 ans. Fondée sur 3 piliers : efficacité dermatologique, formulations clean et naturalité (Made in France), expérience ludique et sensorielle pour les enfants.

Gamme de produits avec prix :
- Mon Nettoyant Douceur (gel nettoyant visage) — ~15€
- Ma Crème de Jour (hydratation quotidienne) — ~20€
- Ma Crème de Nuit (soin nocturne) — ~20€
- Ma Potion à Bisous (baume lèvres) — ~12€
- Mon Sérum Magique (soin ciblé imperfections) — ~22€
- Mes Gummies Belle Peau (compléments alimentaires) — ~18€
- Routine complète (3+ produits) — entre 45€ et 65€

Canaux marketing : Meta Ads (Instagram + Facebook), Klaviyo (email/SMS), Site Shopify, Diagnostic de peau IA en ligne.
Code promo diagnostic : DIAG-15 (-15%).

=== PERSONAS OUATE ===

9 personas identifiés :
- P1 Clara — La Novice Imperfections
- P2 Nathalie — La Novice Pré-ado
- P3 Amandine — La Novice Atopique
- P4 Julie — La Novice Sensible
- P5 Stéphanie — La Multi-enfants Besoins Mixtes
- P6 Camille — La Novice Découverte
- P7 Sandrine — L'Insatisfaite
- P8 Virginie — La Fidèle Imperfections
- P9 Marine — La Fidèle Exploratrice

Toujours utiliser les prénoms, jamais les codes P1-P9.

=== DONNÉES ACTUELLES — HISTORIQUE COMPLET ===

${JSON.stringify(personasData, null, 2)}

=== MÉTRIQUES GLOBALES ===

${JSON.stringify(globalMetrics, null, 2)}

=== DERNIÈRES RECOMMANDATIONS MARKETING ===

${JSON.stringify(latestRecommendations?.[0] ?? "Aucune recommandation disponible", null, 2)}

=== BASE DE CONNAISSANCES MARKETING ===

Tu disposes de connaissances approfondies en marketing e-commerce issues de 226 sources spécialisées couvrant : stratégie Ads Meta/TikTok (créatives, hooks, ciblage, structure de compte), email marketing Klaviyo (flows, newsletters, segmentation), et stratégies commerciales (bundles, upsells, pricing psychologique). Utilise ces connaissances pour enrichir tes réponses.

=== RÈGLES DE RÉPONSE ===

1. TOUJOURS répondre en français.
2. TOUJOURS citer des données chiffrées précises issues des données fournies quand c'est pertinent (taux de conversion, AOV, volumes, tendances).
3. TOUJOURS nommer les personas par leur prénom (Clara, Sandrine, etc.), jamais par leur code.
4. TOUJOURS proposer des actions concrètes et actionnables quand on te demande des conseils.
5. Ne JAMAIS citer de noms de sources, frameworks, experts ou outils par leur nom propre. Expliquer le raisonnement en langage business simple.
6. Ne JAMAIS inventer de données. Si tu ne sais pas, dis-le.
7. Répondre de manière concise et structurée. Pas de longs paragraphes inutiles. Aller droit au but.
8. Adapter le niveau de détail à la question : question simple → réponse courte. Question complexe → réponse structurée avec données.
9. Tu peux utiliser des bullet points quand c'est utile pour la clarté, mais sans en abuser.
10. Quand on te pose une question sur les performances, TOUJOURS inclure la comparaison avec la moyenne ou la tendance (en hausse/baisse).
11. Ton ton est professionnel mais accessible. Tu es un consultant qui parle à un fondateur, pas un robot qui récite des stats.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory ?? []).slice(0, -1).map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userMessage },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

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
          model: "google/gemini-2.5-pro",
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

    // === ÉTAPE 5: Titre automatique ===
    let chatTitle = "Nouvelle conversation";
    if ((chatHistory ?? []).length <= 1) {
      try {
        const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: `Tu génères des titres ultra-courts (2-4 mots) pour des conversations marketing. Règles strictes :
- 2 à 4 mots maximum, jamais plus
- En français, sans majuscule sauf noms propres
- Pas de guillemets, pas de ponctuation finale
- Capture le SUJET central, pas la forme de la question
- Utilise les prénoms des personas si mentionnés (Clara, Sandrine, Marine, etc.)
- Préfère les noms et verbes d'action aux articles

Exemples :
"Quelles sont les meilleures stratégies Meta Ads pour cibler Clara ?" → "Meta Ads Clara"
"Comment améliorer le taux de conversion du mois de mars ?" → "Conversion mars"
"Analyse les performances globales de la marque" → "Performances globales"
"Quelle newsletter envoyer aux mamans atopiques ?" → "Newsletter atopiques"
"Quels produits recommander à Sandrine ?" → "Recommandations Sandrine"
"Comment fidéliser Marine ?" → "Fidélisation Marine"` },
              { role: "user", content: userMessage },
            ],
            max_tokens: 20,
          }),
        });
        const titleData = await titleResponse.json();
        chatTitle = titleData.choices?.[0]?.message?.content?.trim() ?? "Nouvelle conversation";
      } catch {
        chatTitle = userMessage.slice(0, 40);
      }
      await supabase.from("aski_chats").update({ title: chatTitle }).eq("id", currentChatId);
    } else {
      const { data: chatData } = await supabase.from("aski_chats").select("title").eq("id", currentChatId).single();
      chatTitle = chatData?.title ?? "Nouvelle conversation";
    }

    // === ÉTAPE 6: Stocker et retourner ===
    await supabase.from("aski_messages").insert({
      chat_id: currentChatId,
      role: "assistant",
      content: responseText,
      tokens_used: tokensUsed,
      response_time_ms: Date.now() - startTime,
    });

    await supabase.from("aski_chats").update({ updated_at: new Date().toISOString() }).eq("id", currentChatId);

    const newCount = (count ?? 0) + 1;

    return new Response(JSON.stringify({
      response: responseText,
      chat_id: currentChatId,
      chat_title: chatTitle,
      questions_used: newCount,
      questions_limit: 200,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("aski-chat error:", e);
    return new Response(JSON.stringify({ error: "Erreur de chargement des données." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
