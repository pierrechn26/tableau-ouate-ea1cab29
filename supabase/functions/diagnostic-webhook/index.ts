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
  // Fetch existing session to apply COALESCE logic (don't overwrite with nulls)
  const { data: existing } = await supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("session_code", payload.session_code)
    .maybeSingle();

  // Helper: use incoming value if explicitly provided (not undefined/null), else keep existing
  // deno-lint-ignore no-explicit-any
  const coalesce = (field: string, fallback: any = null) => {
    const incoming = payload[field];
    if (incoming !== undefined && incoming !== null) return incoming;
    if (existing && existing[field] !== undefined && existing[field] !== null) return existing[field];
    return fallback;
  };

  // Helper: assign persona_code based on decision tree
  // deno-lint-ignore no-explicit-any
  function computePersonaCode(sData: Record<string, unknown>, children: any[]): string {
    const c1 = children.find((c: any) => c.child_index === 0) || children[0];
    const c2 = children.find((c: any) => c.child_index === 1);
    if (!c1) return "P6";
    if (sData.is_existing_client) return c1.skin_concern === "imperfections" ? "P8" : "P9";
    if ((sData.number_of_children as number) >= 2 && c2 && c1.skin_concern !== c2.skin_concern) return "P5";
    if (c1.has_routine === true) return "P7";
    if (c1.skin_concern === "imperfections" && c1.age_range === "10-11") return "P2";
    if (c1.skin_concern === "imperfections") return "P1";
    if (c1.skin_concern === "atopique") return "P3";
    if (c1.skin_concern === "sensible") return "P4";
    return "P6";
  }

  const sessionData: Record<string, unknown> = {
    session_code: payload.session_code,
    status: coalesce("status", "en_cours"),
    source: coalesce("source"),
    utm_campaign: coalesce("utm_campaign"),
    device: coalesce("device"),
    user_name: coalesce("user_name"),
    relationship: coalesce("relationship"),
    email: coalesce("email"),
    phone: coalesce("phone"),
    optin_email: coalesce("optin_email", false),
    optin_sms: coalesce("optin_sms", false),
    number_of_children: coalesce("number_of_children"),
    locale: coalesce("locale"),
    result_url: coalesce("result_url"),
    persona_detected: coalesce("persona_detected"),
    persona_matching_score: coalesce("persona_matching_score"),
    adapted_tone: coalesce("adapted_tone"),
    ai_key_messages: coalesce("ai_key_messages"),
    ai_suggested_segment: coalesce("ai_suggested_segment"),
    conversion: coalesce("conversion", false),
    exit_type: coalesce("exit_type"),
    existing_ouate_products: coalesce("existing_ouate_products"),
    is_existing_client: coalesce("is_existing_client", false),
    recommended_cart_amount: coalesce("recommended_cart_amount"),
    recommended_products: coalesce("recommended_products"),
    validated_cart_amount: coalesce("validated_cart_amount"),
    validated_products: coalesce("validated_products"),
    selected_cart_amount: coalesce("selected_cart_amount"),
    cart_selected_at: coalesce("cart_selected_at"),
    checkout_started: coalesce("checkout_started", false),
    checkout_at: coalesce("checkout_at"),
    upsell_potential: coalesce("upsell_potential"),
    duration_seconds: coalesce("duration_seconds"),
    abandoned_at_step: payload.abandoned_at_step === "CLEAR" ? null : coalesce("abandoned_at_step"),
    question_path: coalesce("question_path"),
    back_navigation_count: coalesce("back_navigation_count", 0),
    has_optional_details: coalesce("has_optional_details", false),
    behavior_tags: coalesce("behavior_tags"),
    engagement_score: coalesce("engagement_score"),
    routine_size_preference: coalesce("routine_size_preference"),
    priorities_ordered: coalesce("priorities_ordered"),
    trust_triggers_ordered: coalesce("trust_triggers_ordered"),
    content_format_preference: coalesce("content_format_preference"),
    avg_response_time: coalesce("avg_response_time"),
    total_text_length: coalesce("total_text_length"),
    has_detailed_responses: coalesce("has_detailed_responses", false),
    step_timestamps: coalesce("step_timestamps"),
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

    // Assign persona_code if session is completed
    if (sessionData.status === "termine") {
      const personaCode = computePersonaCode(sessionData, payload.children);
      await supabase
        .from("diagnostic_sessions")
        .update({ persona_code: personaCode })
        .eq("id", session.id);
      console.log("[diagnostic-webhook] Persona code assigned:", personaCode);
    }
  }

  // Also assign persona_code if session is termine but no children in this payload
  if (sessionData.status === "termine" && (!Array.isArray(payload.children) || payload.children.length === 0)) {
    const { data: existingChildren } = await supabase
      .from("diagnostic_children")
      .select("*")
      .eq("session_id", session.id)
      .order("child_index", { ascending: true });
    if (existingChildren && existingChildren.length > 0) {
      const personaCode = computePersonaCode(sessionData, existingChildren);
      await supabase
        .from("diagnostic_sessions")
        .update({ persona_code: personaCode })
        .eq("id", session.id);
      console.log("[diagnostic-webhook] Persona code assigned (existing children):", personaCode);
    }
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
