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
   PERSONA SCORING ENGINE — reads definitions from personas table
   ============================================================ */
// deno-lint-ignore no-explicit-any
async function computePersonaWithScore(
  supabase: SupabaseClient,
  sessionData: Record<string, unknown>,
  children: any[]
): Promise<{ code: string; score: number; scores_all: Record<string, number> }> {

  // 1. Load all active personas (excluding P0 pool)
  const { data: personas } = await supabase
    .from("personas")
    .select("code, criteria")
    .eq("is_active", true)
    .eq("is_pool", false);

  if (!personas || personas.length === 0) {
    console.warn("[diagnostic-webhook] No personas found in DB, falling back to P0");
    return { code: "P0", score: 0, scores_all: {} };
  }

  // 2. Prepare session values for matching
  const child1 = children.find((c: any) => c.child_index === 0) || children[0];
  const child2 = children.find((c: any) => c.child_index === 1);

  const priority_1 = sessionData.priorities_ordered
    ? String(sessionData.priorities_ordered).split(",")[0].trim()
    : null;
  const trust_trigger_1 = sessionData.trust_triggers_ordered
    ? String(sessionData.trust_triggers_ordered).split(",")[0].trim()
    : null;

  const sessionValues: Record<string, any> = {
    "relationship": sessionData.relationship,
    "is_existing_client": sessionData.is_existing_client,
    "number_of_children": sessionData.number_of_children,
    "priority_1": priority_1,
    "routine_size_preference": sessionData.routine_size_preference,
    "trust_trigger_1": trust_trigger_1,
    "content_format_preference": sessionData.content_format_preference,
  };

  if (child1) {
    sessionValues["child.skin_concern"] = child1.skin_concern;
    sessionValues["child.age_range"] = child1.age_range;
    sessionValues["child.has_routine"] = child1.has_routine;
    sessionValues["child.skin_reactivity"] = child1.skin_reactivity;
    sessionValues["child.has_ouate_products"] = child1.has_ouate_products;
    sessionValues["child.exclude_fragrance"] = child1.exclude_fragrance;
    sessionValues["child.routine_satisfaction"] = child1.routine_satisfaction;
  }

  // Special criterion: different skin concerns between child1 and child2
  if (child1 && child2) {
    sessionValues["child.skin_concern_different"] = child1.skin_concern !== child2.skin_concern;
  } else {
    sessionValues["child.skin_concern_different"] = false;
  }

  // 3. Score each persona
  const scores: Record<string, number> = {};

  for (const persona of personas) {
    const criteria = persona.criteria;
    let totalScore = 0;

    for (const level of ["identity", "need", "behavior"]) {
      const levelDef = criteria[level];
      if (!levelDef || !levelDef.criteria || levelDef.criteria.length === 0) continue;

      const levelWeight = levelDef.weight;
      let levelScore = 0;
      let levelTotalWeight = 0;

      for (const criterion of levelDef.criteria) {
        const sessionValue = sessionValues[criterion.field];
        const criterionWeight = criterion.weight;
        levelTotalWeight += criterionWeight;

        // "any" always matches
        if (criterion.values.includes("any")) {
          levelScore += criterionWeight;
          continue;
        }

        // null/undefined in session = no match
        if (sessionValue === null || sessionValue === undefined) {
          continue;
        }

        // Special operators
        if (criterion.operator === "gte") {
          if (Number(sessionValue) >= Number(criterion.values[0])) {
            levelScore += criterionWeight;
          }
        } else if (criterion.operator === "lte") {
          if (Number(sessionValue) <= Number(criterion.values[0])) {
            levelScore += criterionWeight;
          }
        } else {
          // Standard match: value is in the accepted list
          // Handle boolean comparison properly
          const matchFound = criterion.values.some((v: any) => {
            if (typeof sessionValue === "boolean") return v === sessionValue;
            return String(v) === String(sessionValue);
          });
          if (matchFound) levelScore += criterionWeight;
        }
      }

      // Level score = (weighted matches / total weight) × level weight
      if (levelTotalWeight > 0) {
        totalScore += (levelScore / levelTotalWeight) * levelWeight;
      }
    }

    // Convert to percentage
    scores[persona.code] = Math.round(totalScore * 100);
  }

  // 4. Find best persona (highest score, ≥60%)
  let bestCode = "P0";
  let bestScore = 0;

  for (const [code, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCode = code;
    }
  }

  // If best score < 60% → P0 (unassigned pool)
  if (bestScore < 60) {
    bestCode = "P0";
  }

  console.log("[diagnostic-webhook] Scoring result:", { bestCode, bestScore, scores });
  return { code: bestCode, score: bestScore, scores_all: scores };
}

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

  const sessionData: Record<string, unknown> = {
    session_code: payload.session_code,
    status: coalesce("status", "en_cours"),
    source: coalesce("source"),
    utm_campaign: coalesce("utm_campaign"),
    device: coalesce("device"),
    user_name: coalesce("user_name"),
    relationship: coalesce("relationship"),
    email: payload.email ? payload.email.toLowerCase().trim() : coalesce("email"),
    phone: coalesce("phone"),
    optin_email: coalesce("optin_email", false),
    optin_sms: coalesce("optin_sms", false),
    number_of_children: coalesce("number_of_children"),
    locale: coalesce("locale"),
    result_url: coalesce("result_url"),
    adapted_tone: coalesce("adapted_tone"),
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
        { error: "Session saved but failed to save children", details: childrenError.message },
        500
      );
    }
    console.log("[diagnostic-webhook] Children saved:", payload.children.length);

    // Assign persona + score if session is completed
    if (sessionData.status === "termine") {
      const persona = await computePersonaWithScore(supabase, sessionData, payload.children);
      await supabase
        .from("diagnostic_sessions")
        .update({ persona_code: persona.code, matching_score: persona.score })
        .eq("id", session.id);
      console.log("[diagnostic-webhook] Persona assigned:", persona.code, "score:", persona.score);

      // Sync Klaviyo — fire and forget
      supabase.functions.invoke("sync-klaviyo-persona", {
        body: { session_id: session.id },
      }).catch((err: Error) => console.error("[diagnostic-webhook] Klaviyo sync failed:", err));
    }
  }

  // Also assign persona if terminated but no children in this payload
  if (sessionData.status === "termine" && (!Array.isArray(payload.children) || payload.children.length === 0)) {
    const { data: existingChildren } = await supabase
      .from("diagnostic_children")
      .select("*")
      .eq("session_id", session.id)
      .order("child_index", { ascending: true });

    if (existingChildren && existingChildren.length > 0) {
      const persona = await computePersonaWithScore(supabase, sessionData, existingChildren);
      await supabase
        .from("diagnostic_sessions")
        .update({ persona_code: persona.code, matching_score: persona.score })
        .eq("id", session.id);
      console.log("[diagnostic-webhook] Persona assigned (existing children):", persona.code, "score:", persona.score);

      // Sync Klaviyo — fire and forget
      supabase.functions.invoke("sync-klaviyo-persona", {
        body: { session_id: session.id },
      }).catch((err: Error) => console.error("[diagnostic-webhook] Klaviyo sync failed:", err));
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
      .select("code")
      .eq("code", detectedPersona)
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
