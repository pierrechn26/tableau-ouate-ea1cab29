import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/* ============================================================
   NEW FORMAT — writes to diagnostic_sessions + diagnostic_children
   ============================================================ */
// deno-lint-ignore no-explicit-any
async function handleNewFormat(supabase: SupabaseClient, payload: any) {
  const sessionData: Record<string, unknown> = {
    session_code: payload.session_code,
    status: payload.status || "en_cours",
    source: payload.source ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    device: payload.device ?? null,
    user_name: payload.user_name ?? null,
    relationship: payload.relationship ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    optin_email: payload.optin_email ?? false,
    optin_sms: payload.optin_sms ?? false,
    number_of_children: payload.number_of_children ?? null,
    locale: payload.locale ?? null,
    result_url: payload.result_url ?? null,
    persona_detected: payload.persona_detected ?? null,
    persona_matching_score: payload.persona_matching_score ?? null,
    adapted_tone: payload.adapted_tone ?? null,
    ai_key_messages: payload.ai_key_messages ?? null,
    ai_suggested_segment: payload.ai_suggested_segment ?? null,
    conversion: payload.conversion ?? false,
    exit_type: payload.exit_type ?? null,
    existing_ouate_products: payload.existing_ouate_products ?? null,
    is_existing_client: payload.is_existing_client ?? false,
    recommended_cart_amount: payload.recommended_cart_amount ?? null,
    validated_cart_amount: payload.validated_cart_amount ?? null,
    upsell_potential: payload.upsell_potential ?? null,
    duration_seconds: payload.duration_seconds ?? null,
    abandoned_at_step: payload.abandoned_at_step ?? null,
    question_path: payload.question_path ?? null,
    back_navigation_count: payload.back_navigation_count ?? 0,
    has_optional_details: payload.has_optional_details ?? false,
    behavior_tags: payload.behavior_tags ?? null,
    engagement_score: payload.engagement_score ?? null,
    routine_size_preference: payload.routine_size_preference ?? null,
    priorities_ordered: payload.priorities_ordered ?? null,
    trust_triggers_ordered: payload.trust_triggers_ordered ?? null,
    content_format_preference: payload.content_format_preference ?? null,
    avg_response_time: payload.avg_response_time ?? null,
    total_text_length: payload.total_text_length ?? null,
    has_detailed_responses: payload.has_detailed_responses ?? false,
    step_timestamps: payload.step_timestamps ?? null,
  };

  const { data: session, error: sessionError } = await supabase
    .from("diagnostic_sessions")
    .upsert(sessionData, { onConflict: "session_code", ignoreDuplicates: false })
    .select("id")
    .single();

  if (sessionError) {
    console.error("[diagnostic-webhook] Session upsert error:", sessionError);
    return jsonResponse(
      { error: "Failed to save session", details: sessionError.message },
      500
    );
  }

  console.log("[diagnostic-webhook] Session saved:", session.id);

  // Children: delete-then-insert for idempotent upserts
  if (Array.isArray(payload.children) && payload.children.length > 0) {
    await supabase
      .from("diagnostic_children")
      .delete()
      .eq("session_id", session.id);

    // deno-lint-ignore no-explicit-any
    const childrenRows = payload.children.map((c: any) => ({
      session_id: session.id,
      child_index: c.child_index ?? 0,
      first_name: c.first_name ?? null,
      birth_date: c.birth_date ?? null,
      age: c.age ?? null,
      age_range: c.age_range ?? null,
      skin_concern: c.skin_concern ?? null,
      has_routine: c.has_routine ?? null,
      routine_satisfaction: c.routine_satisfaction ?? null,
      routine_issue: c.routine_issue ?? null,
      routine_issue_details: c.routine_issue_details ?? null,
      has_ouate_products: c.has_ouate_products ?? null,
      ouate_products: c.ouate_products ?? null,
      existing_routine_description: c.existing_routine_description ?? null,
      skin_reactivity: c.skin_reactivity ?? null,
      reactivity_details: c.reactivity_details ?? null,
      exclude_fragrance: c.exclude_fragrance ?? false,
      dynamic_question_1: c.dynamic_question_1 ?? null,
      dynamic_answer_1: c.dynamic_answer_1 ?? null,
      dynamic_question_2: c.dynamic_question_2 ?? null,
      dynamic_answer_2: c.dynamic_answer_2 ?? null,
      dynamic_question_3: c.dynamic_question_3 ?? null,
      dynamic_answer_3: c.dynamic_answer_3 ?? null,
      dynamic_insight_targets: c.dynamic_insight_targets ?? null,
    }));

    const { error: childrenError } = await supabase
      .from("diagnostic_children")
      .insert(childrenRows);

    if (childrenError) {
      console.error("[diagnostic-webhook] Children insert error:", childrenError);
      return jsonResponse(
        {
          error: "Session saved but failed to save children",
          details: childrenError.message,
        },
        500
      );
    }
    console.log(
      "[diagnostic-webhook] Children saved:",
      payload.children.length
    );
  }

  return jsonResponse(
    { success: true, message: "Session saved successfully", id: session.id, format: "new" },
    200
  );
}

/* ============================================================
   LEGACY FORMAT — writes to diagnostic_responses (rétrocompatibilité)
   ============================================================ */
// deno-lint-ignore no-explicit-any
async function handleLegacyFormat(supabase: SupabaseClient, payload: any) {
  let childName = payload.child_name;
  let childAge = payload.child_age;
  let detectedPersona: string | null = payload.detected_persona ?? null;

  if (Array.isArray(payload.children) && payload.children.length > 0) {
    const first = payload.children[0];
    childName = childName || first.child_name;
    childAge = childAge || first.child_age;
    detectedPersona = detectedPersona || first.detected_persona || null;
  }

  const parentName = payload.parent_name || payload.user_name;

  const metadata: Record<string, unknown> = {
    ...(payload.metadata ?? {}),
    relationship: payload.relationship,
    global_preferences: payload.global_preferences,
    children: payload.children,
    completed_at: payload.completed_at,
    source: payload.source,
  };

  // Persona FK check — store raw value in metadata if not found
  if (detectedPersona) {
    const { data: personaRow, error: personaError } = await supabase
      .from("personas")
      .select("name")
      .eq("name", detectedPersona)
      .maybeSingle();

    if (personaError) {
      console.error("[diagnostic-webhook] Persona lookup error:", personaError);
    }
    if (!personaRow) {
      metadata.raw_detected_persona = detectedPersona;
      detectedPersona = null;
    }
  }

  const { data, error } = await supabase
    .from("diagnostic_responses")
    .upsert(
      {
        session_id: payload.session_id,
        child_name: childName,
        child_age: childAge,
        parent_name: parentName,
        email: payload.email,
        phone: payload.phone,
        email_optin: payload.email_optin ?? false,
        sms_optin: payload.sms_optin ?? false,
        detected_persona: detectedPersona,
        persona_confidence: payload.persona_confidence,
        persona_scores: payload.persona_scores ?? {},
        answers: payload.answers ?? {},
        metadata,
        source_url: payload.source_url || payload.source,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_content: payload.utm_content,
        utm_term: payload.utm_term,
      },
      { onConflict: "session_id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.error("[diagnostic-webhook] Database error:", error);
    return jsonResponse(
      { error: "Failed to save diagnostic response", details: error.message },
      500
    );
  }

  console.log("[diagnostic-webhook] Legacy response saved:", data?.id);
  return jsonResponse(
    { success: true, message: "Diagnostic response saved successfully", id: data?.id, format: "legacy" },
    200
  );
}

/* ============================================================
   MAIN HANDLER
   ============================================================ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Validate webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("DIAGNOSTIC_WEBHOOK_SECRET");

    if (!expectedSecret) {
      console.error("[diagnostic-webhook] DIAGNOSTIC_WEBHOOK_SECRET not configured");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }
    if (webhookSecret !== expectedSecret) {
      console.log("[diagnostic-webhook] Invalid webhook secret");
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json();
    console.log("[diagnostic-webhook] Received payload keys:", Object.keys(payload));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format detection: session_code → new, session_id → legacy
    if (payload.session_code) {
      return await handleNewFormat(supabase, payload);
    }
    if (payload.session_id) {
      return await handleLegacyFormat(supabase, payload);
    }

    return jsonResponse({ error: "Missing session_code or session_id" }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[diagnostic-webhook] Unexpected error:", error);
    return jsonResponse({ error: "Internal server error", details: msg }, 500);
  }
});
