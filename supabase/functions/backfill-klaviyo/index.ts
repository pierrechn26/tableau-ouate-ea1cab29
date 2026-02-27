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

async function syncSession(
  supabase: ReturnType<typeof createClient>,
  session: Record<string, unknown>,
  klaviyoApiKey: string
): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string }> {
  if (!session.email) return { skipped: true, reason: "no_email" };

  const normalizedEmail = (session.email as string).toLowerCase().trim();

  // Charger les enfants
  const { data: children } = await supabase
    .from("diagnostic_children")
    .select("*")
    .eq("session_id", session.id)
    .order("age", { ascending: false });

  const childrenDynamicProps: Record<string, unknown> = {};
  const childrenEnrichmentProps: Record<string, unknown> = {};

  (children || []).forEach((child: Record<string, unknown>, index: number) => {
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

  const properties: Record<string, unknown> = {
    persona: getPersonaFullName(session.persona_code as string | null),
    persona_code: session.persona_code,
    ...(session.matching_score !== null && session.matching_score !== undefined && { matching_score: session.matching_score }),
    ...(session.engagement_score !== null && session.engagement_score !== undefined && { engagement_score: session.engagement_score }),
    conversion_status: session.conversion ? "Oui" : "Non",
    is_existing_client: session.is_existing_client ? "Oui" : "Non",
    exit_type: translateExitType(session.exit_type as string | null),
    ...(session.recommended_products && { recommended_products: session.recommended_products }),
    ...(session.recommended_cart_amount !== null && session.recommended_cart_amount !== undefined && { recommended_cart_amount: session.recommended_cart_amount }),
    ...(session.upsell_potential && { upsell_potential: translateUpsell(session.upsell_potential as string | null) }),
    ...(session.validated_products && { validated_products: session.validated_products }),
    ...(session.validated_cart_amount && { validated_cart_amount: session.validated_cart_amount }),
    ...(session.selected_cart_amount && { selected_cart_amount: session.selected_cart_amount }),
    ...(session.existing_ouate_products && { existing_ouate_products: session.existing_ouate_products }),
    ...(session.duration_seconds !== null && session.duration_seconds !== undefined && { diagnostic_duration_seconds: session.duration_seconds }),
    optin_email: session.optin_email ? "Oui" : "Non",
    optin_sms: session.optin_sms ? "Oui" : "Non",
    ...childrenDynamicProps,
    ...childrenEnrichmentProps,
  };

  const klaviyoPayload = {
    data: {
      type: "profile",
      attributes: {
        email: normalizedEmail,
        ...(session.phone && { phone_number: session.phone }),
        properties,
      },
    },
  };

  const klaviyoResponse = await fetch("https://a.klaviyo.com/api/profile-import/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
      revision: "2024-02-15",
    },
    body: JSON.stringify(klaviyoPayload),
  });

  if (!klaviyoResponse.ok) {
    const errText = await klaviyoResponse.text();
    return { success: false, error: `Klaviyo ${klaviyoResponse.status}: ${errText}` };
  }
  await klaviyoResponse.text(); // consume body

  // Subscribe si opt-in
  if (session.optin_email || session.optin_sms) {
    // deno-lint-ignore no-explicit-any
    const subscriptions: any = {};
    if (session.optin_email) subscriptions.email = { marketing: { consent: "SUBSCRIBED" } };
    if (session.optin_sms && session.phone) subscriptions.sms = { marketing: { consent: "SUBSCRIBED" } };

    const subscribePayload = {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [{
              type: "profile",
              attributes: {
                email: normalizedEmail,
                ...(session.phone && { phone_number: session.phone }),
                subscriptions,
              },
            }],
          },
        },
        relationships: { list: { data: { type: "list", id: "TExMiq" } } },
      },
    };

    try {
      const subRes = await fetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
          revision: "2024-02-15",
        },
        body: JSON.stringify(subscribePayload),
      });
      await subRes.text();
    } catch (_) { /* non-bloquant */ }
  }

  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Limite stricte : 20 sessions max par batch pour éviter tout timeout
  const { offset = 0, limit = 20 } = await req.json().catch(() => ({}));
  const safeLimit = Math.min(limit, 20);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const klaviyoApiKey = Deno.env.get("KLAVIYO_API_KEY")!;

  const { data: sessions, error } = await supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("status", "termine")
    .not("email", "is", null)
    .not("email", "eq", "")
    .order("created_at", { ascending: true })
    .range(offset, offset + safeLimit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[backfill-klaviyo] Batch offset=${offset} limit=${safeLimit} → ${sessions?.length ?? 0} sessions`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const session of sessions ?? []) {
    try {
      const result = await syncSession(supabase, session as Record<string, unknown>, klaviyoApiKey);
      if (result.skipped) {
        skipped++;
      } else if (result.success) {
        console.log(`[backfill-klaviyo] ✓ ${session.email} — persona: ${session.persona_code}`);
        success++;
      } else {
        console.error(`[backfill-klaviyo] ✗ ${session.email}: ${result.error}`);
        failed++;
      }
    } catch (err) {
      console.error(`[backfill-klaviyo] Error ${session.id}:`, err);
      failed++;
    }
    // 100ms entre chaque appel Klaviyo (API directe, pas de double invoke)
    await new Promise((r) => setTimeout(r, 100));
  }

  const summary = {
    offset,
    limit: safeLimit,
    total_in_batch: sessions?.length ?? 0,
    success,
    failed,
    skipped,
    next_offset: offset + (sessions?.length ?? 0),
    has_more: (sessions?.length ?? 0) === safeLimit,
  };

  console.log("[backfill-klaviyo] Summary:", summary);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
