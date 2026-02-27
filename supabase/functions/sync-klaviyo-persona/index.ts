import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getPersonaFullName(code: string | null): string {
  const map: Record<string, string> = {
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
  return (code && map[code]) || code || "Non déterminé";
}

function translateExitType(exitType: string | null): string {
  const map: Record<string, string> = {
    cta_principal: "CTA Principal",
    cta_secondaire: "CTA Secondaire",
    abandon: "Abandon",
    skip: "Passé",
  };
  return (exitType && map[exitType]) || exitType || "";
}

function translateUpsell(level: string | null): string {
  const map: Record<string, string> = {
    faible: "Faible",
    moyen: "Moyen",
    eleve: "Élevé",
  };
  return (level && map[level]) || level || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const klaviyoApiKey = Deno.env.get("KLAVIYO_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Charger la session
    const { data: session, error: sessionError } = await supabase
      .from("diagnostic_sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionError || !session) {
      console.error("[sync-klaviyo-persona] Session not found:", sessionError);
      return new Response(
        JSON.stringify({ success: false, error: "Session not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Pas d'email → skip
    if (!session.email) {
      console.log("[sync-klaviyo-persona] No email, skipping:", session_id);
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Charger les enfants triés par age DESC
    const { data: children } = await supabase
      .from("diagnostic_children")
      .select("*")
      .eq("session_id", session_id)
      .order("age", { ascending: false });

    // 4. Construire les propriétés enfants dynamiques et enrichissement
    const childrenDynamicProps: Record<string, unknown> = {};
    const childrenEnrichmentProps: Record<string, unknown> = {};

    (children || []).forEach((child, index) => {
      const prefix = `child_${index + 1}`;

      if (child.dynamic_question_1) childrenDynamicProps[`${prefix}_dynamic_q1`] = child.dynamic_question_1;
      if (child.dynamic_answer_1) childrenDynamicProps[`${prefix}_dynamic_a1`] = child.dynamic_answer_1;
      if (child.dynamic_question_2) childrenDynamicProps[`${prefix}_dynamic_q2`] = child.dynamic_question_2;
      if (child.dynamic_answer_2) childrenDynamicProps[`${prefix}_dynamic_a2`] = child.dynamic_answer_2;
      if (child.dynamic_question_3) childrenDynamicProps[`${prefix}_dynamic_q3`] = child.dynamic_question_3;
      if (child.dynamic_answer_3) childrenDynamicProps[`${prefix}_dynamic_a3`] = child.dynamic_answer_3;
      if (child.dynamic_insight_targets) childrenDynamicProps[`${prefix}_insight_targets`] = child.dynamic_insight_targets;

      if (child.routine_satisfaction !== null && child.routine_satisfaction !== undefined) {
        childrenEnrichmentProps[`${prefix}_routine_satisfaction`] = child.routine_satisfaction;
      }
      if (child.routine_issue) childrenEnrichmentProps[`${prefix}_routine_issue`] = child.routine_issue;
      if (child.routine_issue_details) childrenEnrichmentProps[`${prefix}_routine_issue_details`] = child.routine_issue_details;
      if (child.existing_routine_description) childrenEnrichmentProps[`${prefix}_existing_routine`] = child.existing_routine_description;
      if (child.exclude_fragrance !== null && child.exclude_fragrance !== undefined) {
        childrenEnrichmentProps[`${prefix}_exclude_fragrance`] = child.exclude_fragrance ? "Oui" : "Non";
      }
    });

    // 5. Construire le payload Klaviyo
    const properties: Record<string, unknown> = {
      // Persona
      persona: getPersonaFullName(session.persona_code),
      persona_code: session.persona_code,

      // Scores
      ...(session.matching_score !== null && session.matching_score !== undefined && { matching_score: session.matching_score }),
      ...(session.engagement_score !== null && session.engagement_score !== undefined && { engagement_score: session.engagement_score }),

      // Conversion
      conversion_status: session.conversion ? "Oui" : "Non",
      is_existing_client: session.is_existing_client ? "Oui" : "Non",
      exit_type: translateExitType(session.exit_type),

      // Recommandations
      ...(session.recommended_products && { recommended_products: session.recommended_products }),
      ...(session.recommended_cart_amount !== null && session.recommended_cart_amount !== undefined && { recommended_cart_amount: session.recommended_cart_amount }),
      ...(session.upsell_potential && { upsell_potential: translateUpsell(session.upsell_potential) }),

      // Produits validés / sélectionnés
      ...(session.validated_products && { validated_products: session.validated_products }),
      ...(session.validated_cart_amount && { validated_cart_amount: session.validated_cart_amount }),
      ...(session.selected_cart_amount && { selected_cart_amount: session.selected_cart_amount }),

      // Produits existants
      ...(session.existing_ouate_products && { existing_ouate_products: session.existing_ouate_products }),

      // Comportement
      ...(session.duration_seconds !== null && session.duration_seconds !== undefined && { diagnostic_duration_seconds: session.duration_seconds }),

      // Enfants — IA insights + enrichissement
      ...childrenDynamicProps,
      ...childrenEnrichmentProps,
    };

    const klaviyoPayload = {
      data: {
        type: "profile",
        attributes: {
          email: session.email,
          ...(session.phone && { phone_number: session.phone }),
          properties,
        },
      },
    };

    // 6. Appel Klaviyo
    const klaviyoResponse = await fetch("https://a.klaviyo.com/api/profile-import/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
        revision: "2024-02-15",
      },
      body: JSON.stringify(klaviyoPayload),
    });

    const responseText = await klaviyoResponse.text();

    if (!klaviyoResponse.ok) {
      console.error("[sync-klaviyo-persona] Klaviyo error:", klaviyoResponse.status, responseText);
      return new Response(
        JSON.stringify({ success: false, error: `Klaviyo ${klaviyoResponse.status}`, details: responseText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-klaviyo-persona] Profile updated for session:", session_id, "persona:", session.persona_code);
    return new Response(
      JSON.stringify({ success: true, persona_code: session.persona_code, email: session.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-klaviyo-persona] Unexpected error:", error);
    // Best-effort: retourner 200 pour ne pas bloquer le webhook parent
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
