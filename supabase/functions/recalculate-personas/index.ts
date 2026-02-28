import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type PersonaDef = { code: string; criteria: any };

/* ============================================================
   PERSONA SCORING ENGINE (same logic as diagnostic-webhook)
   ============================================================ */
function scoreSession(
  personas: PersonaDef[],
  sessionData: Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  children: any[]
): { code: string; score: number; scores_all: Record<string, number> } {
  // deno-lint-ignore no-explicit-any
  const child1 = children.find((c: any) => c.child_index === 0) || children[0];
  const child2 = children.find((c: any) => c.child_index === 1);

  const priority_1 = sessionData.priorities_ordered
    ? String(sessionData.priorities_ordered).split(",")[0].trim()
    : null;
  const trust_trigger_1 = sessionData.trust_triggers_ordered
    ? String(sessionData.trust_triggers_ordered).split(",")[0].trim()
    : null;

  // deno-lint-ignore no-explicit-any
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

  if (child1 && child2) {
    sessionValues["child.skin_concern_different"] = child1.skin_concern !== child2.skin_concern;
  } else {
    sessionValues["child.skin_concern_different"] = false;
  }

  const scores: Record<string, number> = {};
  // Track need-level scores for tie-breaking (Fix A)
  const needScores: Record<string, number> = {};

  for (const persona of personas) {
    const criteria = persona.criteria;
    let totalScore = 0;
    let blockedByRequired = false;

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

        if (criterion.values.includes("any")) {
          levelScore += criterionWeight;
          continue;
        }

        if (sessionValue === null || sessionValue === undefined) {
          if (criterion.required === true) blockedByRequired = true;
          continue;
        }

        let matched = false;
        if (criterion.operator === "gte") {
          matched = Number(sessionValue) >= Number(criterion.values[0]);
        } else if (criterion.operator === "lte") {
          matched = Number(sessionValue) <= Number(criterion.values[0]);
        } else {
          // deno-lint-ignore no-explicit-any
          matched = criterion.values.some((v: any) => {
            if (typeof sessionValue === "boolean") return v === sessionValue;
            return String(v) === String(sessionValue);
          });
        }

        if (matched) {
          levelScore += criterionWeight;
        } else if (criterion.required === true) {
          blockedByRequired = true;
        }
      }

      if (blockedByRequired) break;

      if (levelTotalWeight > 0) {
        const contribution = (levelScore / levelTotalWeight) * levelWeight;
        totalScore += contribution;
        if (level === "need") needScores[persona.code] = Math.round(contribution * 100 / levelWeight);
      }
    }

    scores[persona.code] = blockedByRequired ? 0 : Math.round(totalScore * 100);
    if (blockedByRequired) needScores[persona.code] = 0;
  }

  let bestCode = "P0";
  let bestScore = 0;
  let bestNeedScore = 0;

  for (const [code, score] of Object.entries(scores)) {
    const needScore = needScores[code] ?? 0;
    if (score > bestScore || (score === bestScore && needScore > bestNeedScore)) {
      bestScore = score;
      bestCode = code;
      bestNeedScore = needScore;
    }
  }

  if (bestScore < 60) bestCode = "P0";

  return { code: bestCode, score: bestScore, scores_all: scores };
}

/* ============================================================
   KLAVIYO SYNC (direct API call — same as sync-klaviyo-persona)
   ============================================================ */
function getPersonaFullName(code: string | null, personas: PersonaDef[]): string {
  const p = personas.find(p => p.code === code);
  // deno-lint-ignore no-explicit-any
  return (p as any)?.full_label || code || "Non déterminé";
}

async function syncToKlaviyo(
  session: Record<string, unknown>,
  klaviyoApiKey: string,
  personas: PersonaDef[]
): Promise<void> {
  if (!session.email) return;

  const normalizedEmail = String(session.email).toLowerCase().trim();
  const properties: Record<string, unknown> = {
    persona: getPersonaFullName(session.persona_code as string, personas),
    persona_code: session.persona_code,
    ...(session.matching_score != null && { matching_score: session.matching_score }),
    ...(session.engagement_score != null && { engagement_score: session.engagement_score }),
    conversion_status: session.conversion ? "Oui" : "Non",
    is_existing_client: session.is_existing_client ? "Oui" : "Non",
  };

  const payload = {
    data: {
      type: "profile",
      attributes: {
        email: normalizedEmail,
        ...(session.phone && { phone_number: session.phone }),
        properties,
      },
    },
  };

  const resp = await fetch("https://a.klaviyo.com/api/profile-import/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
      revision: "2024-02-15",
    },
    body: JSON.stringify(payload),
  });

  const body = await resp.text();
  if (!resp.ok) {
    console.error("[recalculate-personas] Klaviyo error for", normalizedEmail, resp.status, body);
  }
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
    const body = await req.json().catch(() => ({}));
    const recalculateOnly = body.recalculate_only === true;
    const debugSessionIds: string[] = body.debug_session_ids || [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const klaviyoApiKey = Deno.env.get("KLAVIYO_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[recalculate-personas] Starting recalculation, recalculate_only:", recalculateOnly);

    // ── DEBUG MODE: return scores_all for specific sessions without writing ──
    if (debugSessionIds.length > 0) {
      const { data: pDef } = await supabase.from("personas").select("code, full_label, criteria").eq("is_active", true).eq("is_pool", false);
      if (!pDef) return jsonResponse({ error: "No personas" }, 500);
      const { data: dSessions } = await supabase.from("diagnostic_sessions").select("*").in("id", debugSessionIds);
      const { data: dChildren } = await supabase.from("diagnostic_children").select("*").in("session_id", debugSessionIds).order("child_index", { ascending: true });
      // deno-lint-ignore no-explicit-any
      const childMap: Record<string, any[]> = {};
      for (const c of dChildren || []) {
        if (!childMap[c.session_id]) childMap[c.session_id] = [];
        childMap[c.session_id].push(c);
      }
      const debugResults = (dSessions || []).map((s) => {
        const res = scoreSession(pDef, s, childMap[s.id] || []);
        const sorted = Object.entries(res.scores_all).sort(([, a], [, b]) => b - a);
        return {
          id: s.id,
          email: s.email,
          assigned: res.code,
          best_score: res.score,
          rank1: sorted[0] ? `${sorted[0][0]}=${sorted[0][1]}%` : null,
          rank2: sorted[1] ? `${sorted[1][0]}=${sorted[1][1]}%` : null,
          rank3: sorted[2] ? `${sorted[2][0]}=${sorted[2][1]}%` : null,
          gap_1_2: sorted[0] && sorted[1] ? sorted[0][1] - sorted[1][1] : null,
          all_scores: res.scores_all,
        };
      });
      return jsonResponse({ debug: true, results: debugResults }, 200);
    }

    // 1. Load all active personas (excluding P0)
    const { data: personas, error: personasError } = await supabase
      .from("personas")
      .select("code, full_label, criteria")
      .eq("is_active", true)
      .eq("is_pool", false);

    if (personasError || !personas || personas.length === 0) {
      return jsonResponse({ error: "Failed to load personas", details: personasError?.message }, 500);
    }

    console.log("[recalculate-personas] Loaded", personas.length, "personas");

    // 2. Load all terminated sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("diagnostic_sessions")
      .select("*")
      .eq("status", "termine");

    if (sessionsError) {
      return jsonResponse({ error: "Failed to load sessions", details: sessionsError.message }, 500);
    }

    const totalSessions = sessions?.length ?? 0;
    console.log("[recalculate-personas] Total sessions to recalculate:", totalSessions);

    if (totalSessions === 0) {
      return jsonResponse({ success: true, message: "No sessions to recalculate", updated: 0 }, 200);
    }

    // 3. Load all children grouped by session_id
    const { data: allChildren, error: childrenError } = await supabase
      .from("diagnostic_children")
      .select("*")
      .order("child_index", { ascending: true });

    if (childrenError) {
      return jsonResponse({ error: "Failed to load children", details: childrenError.message }, 500);
    }

    // deno-lint-ignore no-explicit-any
    const childrenBySession: Record<string, any[]> = {};
    for (const child of allChildren || []) {
      if (!childrenBySession[child.session_id]) childrenBySession[child.session_id] = [];
      childrenBySession[child.session_id].push(child);
    }

    // 4. Process in batches of 50
    const BATCH_SIZE = 50;
    let updated = 0;
    let klaviyoSynced = 0;
    let errors = 0;

    for (let i = 0; i < sessions!.length; i += BATCH_SIZE) {
      const batch = sessions!.slice(i, i + BATCH_SIZE);

      // Calculate scores for batch
      const updates = batch.map((session) => {
        const children = childrenBySession[session.id] || [];
        const result = scoreSession(personas, session, children);
        return { id: session.id, email: session.email, persona_code: result.code, matching_score: result.score, scores_all: result.scores_all };
      });

      // Batch update DB
      for (const upd of updates) {
        const { error: updateError } = await supabase
          .from("diagnostic_sessions")
          .update({ persona_code: upd.persona_code, matching_score: upd.matching_score })
          .eq("id", upd.id);

        if (updateError) {
          console.error("[recalculate-personas] Update error for session", upd.id, updateError.message);
          errors++;
        } else {
          updated++;
        }
      }

      // Sync to Klaviyo if requested
      if (!recalculateOnly) {
        for (const upd of updates) {
          if (upd.email) {
            const sessionData = sessions!.find(s => s.id === upd.id) || {};
            const enrichedSession = { ...sessionData, persona_code: upd.persona_code, matching_score: upd.matching_score };
            try {
              await syncToKlaviyo(enrichedSession, klaviyoApiKey, personas);
              klaviyoSynced++;
            } catch (err) {
              console.error("[recalculate-personas] Klaviyo sync failed for session", upd.id, err);
            }
            // Small delay to respect Klaviyo rate limits
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }

      console.log(`[recalculate-personas] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sessions!.length / BATCH_SIZE)}, updated: ${updated}`);

      // Pause between batches
      if (i + BATCH_SIZE < sessions!.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const result: Record<string, unknown> = {
      success: true,
      total: totalSessions,
      updated,
      errors,
    };

    if (!recalculateOnly) result.klaviyo_synced = klaviyoSynced;

    console.log("[recalculate-personas] Done:", result);
    return jsonResponse(result, 200);

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[recalculate-personas] Unexpected error:", error);
    return jsonResponse({ error: "Internal server error", details: msg }, 500);
  }
});
