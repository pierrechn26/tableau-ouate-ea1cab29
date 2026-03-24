import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function reportEdgeFunctionError(functionName: string, error: unknown, context?: Record<string, unknown>) {
  try {
    const apiKey = Deno.env.get("MONITORING_API_KEY");
    if (!apiKey) return;
    await fetch("https://srzbcuhwrpkfhubbbeuw.supabase.co/functions/v1/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-monitoring-key": apiKey },
      body: JSON.stringify({ errors: [{ source: "edge_function", severity: context?.severity || "error", error_type: context?.type || "internal_error", function_name: functionName, message: (error as any)?.message || String(error), stack_trace: (error as any)?.stack || "", context: { ...context, timestamp: new Date().toISOString() } }] }),
    });
  } catch { /* fire-and-forget */ }
}

// deno-lint-ignore no-explicit-any
type Any = any;

/* ============================================================
   HELPERS
   ============================================================ */

function extractCriteria(session: Any) {
  const child = session.diagnostic_children?.find((c: Any) => c.child_index === 0) || session.diagnostic_children?.[0];
  const child2 = session.diagnostic_children?.find((c: Any) => c.child_index === 1);
  return {
    session_id: session.id,
    email: session.email,
    persona_code: session.persona_code,
    matching_score: session.matching_score,
    identity: {
      relationship: session.relationship,
      is_existing_client: session.is_existing_client,
      number_of_children: session.number_of_children,
    },
    need: {
      skin_concern: child?.skin_concern || null,
      age_range: child?.age_range || null,
      has_routine: child?.has_routine ?? null,
      skin_reactivity: child?.skin_reactivity || null,
      routine_satisfaction: child?.routine_satisfaction ?? null,
      exclude_fragrance: child?.exclude_fragrance ?? null,
      has_ouate_products: child?.has_ouate_products ?? null,
      skin_concern_different: child && child2 ? child.skin_concern !== child2.skin_concern : false,
    },
    behavior: {
      priority_1: session.priorities_ordered?.split(",")[0]?.trim() || null,
      routine_size_preference: session.routine_size_preference || null,
      trust_trigger_1: session.trust_triggers_ordered?.split(",")[0]?.trim() || null,
      content_format_preference: session.content_format_preference || null,
    },
  };
}

/* ============================================================
   WEIGHTS — mirrors diagnostic-webhook scoring hierarchy
   ============================================================ */
const LEVEL_WEIGHTS = { identity: 0.25, need: 0.50, behavior: 0.25 };

const CRITERION_WEIGHTS: Record<string, Record<string, number>> = {
  identity: { relationship: 0.4, is_existing_client: 0.4, number_of_children: 0.2 },
  need:     { skin_concern: 0.4, age_range: 0.25, has_routine: 0.15, skin_reactivity: 0.1, has_ouate_products: 0.1 },
  behavior: { priority_1: 0.3, routine_size_preference: 0.3, trust_trigger_1: 0.2, content_format_preference: 0.2 },
};

/* Compute weighted similarity score between two session profiles (0–1) */
function sessionSimilarity(a: Any, b: Any): number {
  let score = 0;
  for (const [level, levelWeight] of Object.entries(LEVEL_WEIGHTS)) {
    const fieldWeights = CRITERION_WEIGHTS[level];
    for (const [field, fieldWeight] of Object.entries(fieldWeights)) {
      const va = a[level]?.[field];
      const vb = b[level]?.[field];
      if (va === null || va === undefined || vb === null || vb === undefined) continue;
      if (String(va) === String(vb)) {
        score += levelWeight * fieldWeight;
      }
    }
  }
  return score;
}

/* Build NEED key for fast grouping (50% of total weight) */
function needKey(s: Any): string {
  return [
    s.need?.skin_concern ?? "null",
    s.need?.age_range ?? "null",
    s.need?.has_routine ?? "null",
    s.need?.skin_reactivity ?? "null",
  ].join("|");
}

/* Build IDENTITY key */
function identityKey(s: Any): string {
  return [
    s.identity?.relationship ?? "null",
    s.identity?.is_existing_client ?? "null",
  ].join("|");
}

/* Compute distribution of a field across sessions */
function fieldDistribution(sessions: Any[], level: string, field: string): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const s of sessions) {
    const v = s[level]?.[field];
    if (v === null || v === undefined) continue;
    const key = String(v);
    dist[key] = (dist[key] || 0) + 1;
  }
  return dist;
}

/* Get top-N values covering at least coveragePct% of sessions */
function topValues(dist: Record<string, number>, total: number, coveragePct = 0.70): string[] {
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const result: string[] = [];
  let covered = 0;
  for (const [val, cnt] of sorted) {
    result.push(val);
    covered += cnt;
    if (covered / total >= coveragePct) break;
  }
  return result;
}

/* Check whether a cluster profile already matches an existing persona (score >= 60%) */
function clusterMatchesExistingPersona(clusterProfile: Any, existingPersonas: Any[]): boolean {
  for (const persona of existingPersonas) {
    const criteria = persona.criteria;
    let totalScore = 0;
    let blockedByRequired = false;

    // Build flat sessionValues from cluster dominant profile
    const sv: Record<string, Any> = {
      relationship: clusterProfile.identity?.relationship?.dominant,
      is_existing_client: clusterProfile.identity?.is_existing_client?.dominant === "true"
        ? true : clusterProfile.identity?.is_existing_client?.dominant === "false" ? false : null,
      number_of_children: clusterProfile.identity?.number_of_children?.dominant != null
        ? Number(clusterProfile.identity.number_of_children.dominant) : null,
      priority_1: clusterProfile.behavior?.priority_1?.topValues?.[0] || null,
      routine_size_preference: clusterProfile.behavior?.routine_size_preference?.topValues?.[0] || null,
      trust_trigger_1: clusterProfile.behavior?.trust_trigger_1?.topValues?.[0] || null,
      content_format_preference: clusterProfile.behavior?.content_format_preference?.topValues?.[0] || null,
      "child.skin_concern": clusterProfile.need?.skin_concern?.dominant,
      "child.age_range": clusterProfile.need?.age_range?.dominant,
      "child.has_routine": clusterProfile.need?.has_routine?.dominant === "true" ? true
        : clusterProfile.need?.has_routine?.dominant === "false" ? false : null,
      "child.skin_reactivity": clusterProfile.need?.skin_reactivity?.dominant,
      "child.has_ouate_products": clusterProfile.need?.has_ouate_products?.dominant === "true" ? true
        : clusterProfile.need?.has_ouate_products?.dominant === "false" ? false : null,
    };

    for (const level of ["identity", "need", "behavior"]) {
      const levelDef = criteria[level];
      if (!levelDef || !levelDef.criteria || levelDef.criteria.length === 0) continue;
      const levelWeight = levelDef.weight;
      let levelScore = 0;
      let levelTotalWeight = 0;

      for (const criterion of levelDef.criteria) {
        const sessionValue = sv[criterion.field];
        const cw = criterion.weight;
        levelTotalWeight += cw;
        if (criterion.values?.includes("any")) { levelScore += cw; continue; }
        if (sessionValue === null || sessionValue === undefined) {
          if (criterion.required === true) blockedByRequired = true;
          continue;
        }
        let matched = false;
        if (criterion.operator === "gte") matched = Number(sessionValue) >= Number(criterion.values[0]);
        else if (criterion.operator === "lte") matched = Number(sessionValue) <= Number(criterion.values[0]);
        else matched = criterion.values.some((v: Any) =>
          typeof sessionValue === "boolean" ? v === sessionValue : String(v) === String(sessionValue)
        );
        if (matched) levelScore += cw;
        else if (criterion.required === true) blockedByRequired = true;
      }
      if (blockedByRequired) break;
      if (levelTotalWeight > 0) totalScore += (levelScore / levelTotalWeight) * levelWeight;
    }

    const matchScore = blockedByRequired ? 0 : Math.round(totalScore * 100);
    if (matchScore >= 60) return true;
  }
  return false;
}

/* ============================================================
   findClusters — new pairwise-inspired algorithm
   Strategy:
   1. Exclude sessions where skin_concern is null (children 0-3 yo)
   2. Group by NEED profile (50% weight guarantee)
   3. Sub-group by IDENTITY (relationship + is_existing_client)
   4. Groups with NEED+IDENTITY identical have ≥75% similarity
      → one matching BEHAVIOR criterion pushes them over 80%
   5. Validate each candidate against existing personas (score < 60%)
   ============================================================ */
function findClusters(sessions: Any[], existingPersonas: Any[], minSize: number) {
  const candidates: Any[] = [];

  // Step 1: exclude sessions with null skin_concern (infants 0-3yo)
  const validSessions = sessions.filter((s) => s.need?.skin_concern != null && s.need.skin_concern !== "");
  console.log(`[findClusters] ${sessions.length} sessions in, ${validSessions.length} with skin_concern set`);

  // Step 2: group by NEED profile
  const needGroups: Record<string, Any[]> = {};
  for (const s of validSessions) {
    const k = needKey(s);
    if (!needGroups[k]) needGroups[k] = [];
    needGroups[k].push(s);
  }

  for (const [nk, needGroup] of Object.entries(needGroups)) {
    if (needGroup.length < minSize) continue;

    // Step 3: sub-group by IDENTITY (relationship + is_existing_client)
    const idGroups: Record<string, Any[]> = {};
    for (const s of needGroup) {
      const k = identityKey(s);
      if (!idGroups[k]) idGroups[k] = [];
      idGroups[k].push(s);
    }

    for (const [ik, group] of Object.entries(idGroups)) {
      if (group.length < minSize) continue;

      // These sessions share NEED (≥75% similarity guaranteed since NEED=50% + IDENTITY rel+client=0.25×0.8=20%)
      // Compute actual avg intra-cluster similarity for reporting
      const sampleSize = Math.min(group.length, 30);
      const sample = group.slice(0, sampleSize);
      let simSum = 0;
      let simCount = 0;
      for (let i = 0; i < sample.length; i++) {
        for (let j = i + 1; j < sample.length; j++) {
          simSum += sessionSimilarity(sample[i], sample[j]);
          simCount++;
        }
      }
      const avgSim = simCount > 0 ? simSum / simCount : 0.75;

      // Step 4: build cluster profile
      const total = group.length;

      const buildFieldProfile = (level: string, field: string) => {
        const dist = fieldDistribution(group, level, field);
        const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
        const dominant = sorted[0]?.[0] ?? null;
        const dominantPct = sorted[0] ? Math.round((sorted[0][1] / total) * 100) : 0;
        const distribution: Record<string, number> = {};
        for (const [v, cnt] of sorted) distribution[v] = Math.round((cnt / total) * 100);
        return { dominant, dominantPct, distribution };
      };

      const clusterProfile: Any = {
        identity: {
          relationship: buildFieldProfile("identity", "relationship"),
          is_existing_client: buildFieldProfile("identity", "is_existing_client"),
          number_of_children: buildFieldProfile("identity", "number_of_children"),
        },
        need: {
          skin_concern: buildFieldProfile("need", "skin_concern"),
          age_range: buildFieldProfile("need", "age_range"),
          has_routine: buildFieldProfile("need", "has_routine"),
          skin_reactivity: buildFieldProfile("need", "skin_reactivity"),
          has_ouate_products: buildFieldProfile("need", "has_ouate_products"),
        },
        behavior: {
          priority_1: {
            ...buildFieldProfile("behavior", "priority_1"),
            topValues: topValues(fieldDistribution(group, "behavior", "priority_1"), total),
          },
          routine_size_preference: {
            ...buildFieldProfile("behavior", "routine_size_preference"),
            topValues: topValues(fieldDistribution(group, "behavior", "routine_size_preference"), total),
          },
          trust_trigger_1: {
            ...buildFieldProfile("behavior", "trust_trigger_1"),
            topValues: topValues(fieldDistribution(group, "behavior", "trust_trigger_1"), total),
          },
          content_format_preference: {
            ...buildFieldProfile("behavior", "content_format_preference"),
            topValues: topValues(fieldDistribution(group, "behavior", "content_format_preference"), total),
          },
        },
      };

      // Step 5: verify cluster doesn't map to an existing persona
      if (clusterMatchesExistingPersona(clusterProfile, existingPersonas)) {
        console.log(`[findClusters] Cluster NEED=${nk} IDENTITY=${ik} (${total} sessions) → absorbed by existing persona, skip`);
        continue;
      }

      const sourcePersonas = [...new Set(group.map((s: Any) => s.persona_code))];
      candidates.push({
        session_ids: group.map((s: Any) => s.session_id),
        cluster_profile: clusterProfile,
        // Legacy common_criteria shape for buildCriteriaFromCluster compatibility
        common_criteria: buildLegacyCommonCriteria(clusterProfile),
        levels_covered: ["identity", "need", "behavior"],
        source_personas: sourcePersonas,
        current_avg_score: group.reduce((sum: number, s: Any) => sum + (s.matching_score || 0), 0) / total,
        estimated_avg_score: Math.round(avgSim * 100),
        need_key: nk,
        identity_key: ik,
      });

      console.log(`[findClusters] CLUSTER VALIDATED: NEED=${nk} IDENTITY=${ik} → ${total} sessions, avg_sim=${Math.round(avgSim * 100)}%`);
    }
  }

  return candidates;
}

/* Build legacy common_criteria shape (used by generatePersonaIdentity + buildCriteriaFromCluster) */
function buildLegacyCommonCriteria(profile: Any): Record<string, { value: Any; count: number; level: string }> {
  const result: Record<string, { value: Any; count: number; level: string }> = {};
  const addField = (level: string, field: string) => {
    const fp = profile[level]?.[field];
    if (fp?.dominant != null) {
      result[`${level}.${field}`] = { value: fp.dominant, count: fp.dominantPct, level };
    }
  };
  // Identity
  addField("identity", "relationship");
  addField("identity", "is_existing_client");
  addField("identity", "number_of_children");
  // Need
  addField("need", "skin_concern");
  addField("need", "age_range");
  addField("need", "has_routine");
  addField("need", "skin_reactivity");
  // Behavior — use topValues[0] as dominant
  for (const field of ["priority_1", "routine_size_preference", "trust_trigger_1", "content_format_preference"]) {
    const fp = profile.behavior?.[field];
    if (fp?.topValues?.[0]) {
      result[`behavior.${field}`] = { value: fp.topValues[0], count: fp.dominantPct, level: "behavior" };
    }
  }
  return result;
}

function findSubClusters(sessions: Any[], persona: Any, existingPersonas: Any[], minSize: number) {
  const behaviorFields = ["behavior.priority_1", "behavior.routine_size_preference", "behavior.trust_trigger_1"];
  const candidates: Any[] = [];
  for (const field of behaviorFields) {
    const [level, fieldName] = field.split(".");
    const groups: Record<string, Any[]> = {};
    for (const s of sessions) {
      const value = String(s[level]?.[fieldName] ?? "NULL");
      if (value === "NULL") continue;
      if (!groups[value]) groups[value] = [];
      groups[value].push(s);
    }
    for (const [value, group] of Object.entries(groups)) {
      if (group.length >= minSize) {
        const subCluster = findClusters(group, existingPersonas, minSize);
        if (subCluster.length > 0) {
          candidates.push({
            ...subCluster[0],
            source_personas: [persona.code],
            split_from: persona.code,
            distinguishing_criterion: { field, value },
          });
        }
      }
    }
  }
  return candidates;
}

function generatePersonaIdentity(cluster: Any, existingNames: string[]) {
  const criteria = cluster.common_criteria;
  let traits: string[] = [];

  const rel = criteria["identity.relationship"]?.value;
  let namePrefix = "La Maman";
  if (rel === "parent_papa") namePrefix = "Le Papa";
  else if (rel === "grand_parent") namePrefix = "Le Grand-parent";
  void namePrefix;

  const isClient = criteria["identity.is_existing_client"]?.value;
  if (String(isClient) === "true") traits.push("Fidèle");
  else traits.push("Novice");

  const skin = criteria["need.skin_concern"]?.value;
  const skinLabels: Record<string, string> = {
    imperfections: "Imperfections", atopique: "Atopique",
    sensible: "Sensible", seche: "Peau Sèche", normale: "Découverte",
  };
  const nameSuffix = (skin && skinLabels[skin]) ? skinLabels[skin] : "Générique";

  const age = criteria["need.age_range"]?.value;
  if (age === "4-6") traits.push("Petit");
  else if (age === "10-11") traits.push("Pré-ado");

  const hasRoutine = criteria["need.has_routine"]?.value;
  if (String(hasRoutine) === "true") traits.push("Routinée");

  const priority = criteria["behavior.priority_1"]?.value;
  const prioTraits: Record<string, string> = {
    ludique: "Ludique", efficacite: "Efficacité", clean: "Clean", autonomie: "Autonomie",
  };
  if (priority && prioTraits[priority]) traits.push(prioTraits[priority]);

  const nbChildren = criteria["identity.number_of_children"]?.value;
  if (Number(nbChildren) >= 2) traits.push("Multi-enfants");

  const prenoms_f = ["Sophie", "Emma", "Léa", "Chloé", "Manon", "Inès", "Jade", "Louise", "Alice", "Lina", "Zoé", "Élodie", "Marion", "Aurélie", "Céline", "Pauline", "Sarah", "Laura", "Margaux", "Charlotte"];
  const prenoms_m = ["Thomas", "Lucas", "Hugo", "Raphaël", "Louis", "Nathan", "Gabriel", "Arthur", "Jules", "Adam", "Mathis", "Ethan", "Paul", "Marc", "Antoine", "Julien", "Maxime", "Pierre", "Alex", "Nicolas"];
  const prenoms = rel === "parent_papa" ? prenoms_m : prenoms_f;
  const available = prenoms.filter((p) => !existingNames.includes(p));
  const prenom = available.length > 0 ? available[0] : `Auto${Date.now()}`;

  const traitStr = traits.filter(Boolean).join(" ");
  const shortDesc = `${traitStr} ${nameSuffix}`.trim();
  const label = `${prenom} — ${shortDesc}`;

  let descParts: string[] = [];
  const relLabel = rel === "parent_papa" ? "Papa" : rel === "grand_parent" ? "Grand-parent" : "Maman";
  const clientLabel = String(isClient) === "true" ? "déjà cliente Ouate" : "non cliente";
  descParts.push(`${relLabel} ${clientLabel}`);
  if (skin) {
    const skinDesc: Record<string, string> = {
      imperfections: "a des imperfections", atopique: "a une peau atopique",
      sensible: "a une peau sensible", seche: "a une peau sèche", normale: "a une peau normale",
    };
    const ageDesc: Record<string, string> = { "4-6": "de 4-6 ans", "7-9": "de 7-9 ans", "10-11": "de 10-11 ans" };
    descParts.push(`dont l'enfant ${ageDesc[age] || ""} ${skinDesc[skin] || ""}`.trim());
  }
  if (priority) {
    const prioDesc: Record<string, string> = {
      ludique: "Privilégie une approche ludique", efficacite: "Recherche avant tout l'efficacité",
      clean: "Sensible à la composition clean", autonomie: "Favorise l'autonomie de l'enfant",
    };
    if (prioDesc[priority]) descParts.push(prioDesc[priority]);
  }
  if (String(hasRoutine) === "true") descParts.push("A déjà une routine en place");
  else descParts.push("Découvre le sujet des soins enfants");

  const description = descParts.filter(Boolean).join(". ") + ".";
  return { name: prenom, label, description };
}

function buildCriteriaFromCluster(cluster: Any) {
  const common = cluster.common_criteria;
  const identity_criteria: Any[] = [];
  const need_criteria: Any[] = [];
  const behavior_criteria: Any[] = [];

  for (const [key, dom] of Object.entries(common as Record<string, Any>)) {
    const [level, field] = key.split(".");
    const criterionField = level === "need" ? `child.${field}` : field;
    let value: Any = (dom as Any).value;
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (!isNaN(Number(value)) && value !== "") value = Number(value);

    const criterion: Any = { field: criterionField, values: [value], weight: 0.25 };
    if (["skin_concern", "is_existing_client", "has_routine", "skin_concern_different"].includes(field)) {
      criterion.required = true;
    }
    if (field === "number_of_children" && Number(value) >= 2) criterion.operator = "gte";

    if (level === "identity") identity_criteria.push(criterion);
    else if (level === "need") need_criteria.push(criterion);
    else if (level === "behavior") behavior_criteria.push(criterion);
  }

  const normalize = (arr: Any[]) =>
    arr.length === 0 ? arr : arr.map((c) => ({ ...c, weight: Math.round((1 / arr.length) * 100) / 100 }));

  return {
    identity: { weight: 0.25, criteria: normalize(identity_criteria) },
    need: { weight: 0.50, criteria: normalize(need_criteria) },
    behavior: { weight: 0.25, criteria: normalize(behavior_criteria) },
  };
}

async function getNextPersonaCode(supabase: Any) {
  const { data } = await supabase.from("personas").select("code").order("code", { ascending: false }).limit(20);
  if (!data || data.length === 0) return "P10";
  let maxNum = 9;
  for (const p of data) {
    const num = parseInt(p.code.replace("P", ""));
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  return `P${maxNum + 1}`;
}

/* ============================================================
   SCORING ENGINE (identical to diagnostic-webhook)
   ============================================================ */
function computeScore(sessionData: Any, children: Any[], personas: Any[]): { code: string; score: number } {
  const child1 = children.find((c: Any) => c.child_index === 0) || children[0];
  const child2 = children.find((c: Any) => c.child_index === 1);
  const priority_1 = sessionData.priorities_ordered ? String(sessionData.priorities_ordered).split(",")[0].trim() : null;
  const trust_trigger_1 = sessionData.trust_triggers_ordered ? String(sessionData.trust_triggers_ordered).split(",")[0].trim() : null;
  const sessionValues: Record<string, Any> = {
    relationship: sessionData.relationship,
    is_existing_client: sessionData.is_existing_client,
    number_of_children: sessionData.number_of_children,
    priority_1,
    routine_size_preference: sessionData.routine_size_preference,
    trust_trigger_1,
    content_format_preference: sessionData.content_format_preference,
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
  if (child1 && child2) sessionValues["child.skin_concern_different"] = child1.skin_concern !== child2.skin_concern;
  else sessionValues["child.skin_concern_different"] = false;

  const scores: Record<string, number> = {};
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
        if (criterion.values.includes("any")) { levelScore += criterionWeight; continue; }
        if (sessionValue === null || sessionValue === undefined) {
          if (criterion.required === true) blockedByRequired = true;
          continue;
        }
        let matched = false;
        if (criterion.operator === "gte") matched = Number(sessionValue) >= Number(criterion.values[0]);
        else if (criterion.operator === "lte") matched = Number(sessionValue) <= Number(criterion.values[0]);
        else matched = criterion.values.some((v: Any) => typeof sessionValue === "boolean" ? v === sessionValue : String(v) === String(sessionValue));
        if (matched) levelScore += criterionWeight;
        else if (criterion.required === true) blockedByRequired = true;
      }
      if (blockedByRequired) break;
      if (levelTotalWeight > 0) {
        const contribution = (levelScore / levelTotalWeight) * levelWeight;
        totalScore += contribution;
        if (level === "need") needScores[persona.code] = Math.round((contribution * 100) / levelWeight);
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
      bestScore = score; bestCode = code; bestNeedScore = needScore;
    }
  }
  if (bestScore < 60) bestCode = "P0";
  return { code: bestCode, score: bestScore };
}

/* ============================================================
   PHASE G (standalone): Update session_count + avg_matching_score
   Runs at EVERY execution, independent of cluster detection.
   ============================================================ */
async function updateAllPersonaSessionCounts(supabase: Any): Promise<{ updated: number; counters: Record<string, number> }> {
  const { data: personaCounts } = await supabase
    .from("diagnostic_sessions")
    .select("persona_code, matching_score")
    .eq("status", "termine");

  if (!personaCounts) return { updated: 0, counters: {} };

  const counters: Record<string, { cnt: number; sum: number }> = {};
  for (const s of personaCounts) {
    if (!s.persona_code) continue;
    if (!counters[s.persona_code]) counters[s.persona_code] = { cnt: 0, sum: 0 };
    counters[s.persona_code].cnt++;
    counters[s.persona_code].sum += s.matching_score || 0;
  }

  let updated = 0;
  for (const [code, { cnt, sum }] of Object.entries(counters)) {
    const { error } = await supabase.from("personas").update({
      session_count: cnt,
      avg_matching_score: cnt > 0 ? Math.round((sum / cnt) * 100) / 100 : 0,
    }).eq("code", code);
    if (!error) updated++;
  }

  // Also reset to 0 any active persona not present in the counts
  const { data: allActivePersonas } = await supabase
    .from("personas")
    .select("code")
    .eq("is_active", true)
    .eq("is_pool", false);

  for (const p of (allActivePersonas || [])) {
    if (!counters[p.code] && p.code !== "P0") {
      await supabase.from("personas").update({ session_count: 0, avg_matching_score: 0 }).eq("code", p.code);
    }
  }

  console.log(`[detect-persona-clusters] Phase G: Updated counters for ${updated} personas`);
  return { updated, counters: Object.fromEntries(Object.entries(counters).map(([k, v]) => [k, v.cnt])) };
}

/* ============================================================
   MAIN HANDLER
   ============================================================ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const dry_run: boolean = body.dry_run ?? false;
    const min_cluster_size: number = body.min_cluster_size ?? 30;
    const min_split_size: number = body.min_split_size ?? 20;
    const max_persona_size: number = body.max_persona_size ?? 80;
    const weak_score_threshold: number = body.weak_score_threshold ?? 75;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const KLAVIYO_API_KEY = Deno.env.get("KLAVIYO_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[detect-persona-clusters] START — dry_run=${dry_run}, min_cluster=${min_cluster_size}`);

    /* ── PHASE A: Load data ── */
    const [{ data: personas }, { data: rawSessions }] = await Promise.all([
      supabase.from("personas").select("code, name, criteria, is_active, is_auto_created, auto_created_at, min_sessions").eq("is_active", true).eq("is_pool", false),
      supabase.from("diagnostic_sessions").select("id, email, persona_code, matching_score, status, relationship, is_existing_client, number_of_children, priorities_ordered, trust_triggers_ordered, routine_size_preference, content_format_preference").eq("status", "termine"),
    ]);

    if (!personas || !rawSessions) throw new Error("Failed to load personas or sessions");

    // Load children for all sessions
    const sessionIds = rawSessions.map((s: Any) => s.id);
    const { data: allChildren } = await supabase
      .from("diagnostic_children")
      .select("session_id, child_index, skin_concern, age_range, has_routine, skin_reactivity, routine_satisfaction, exclude_fragrance, has_ouate_products")
      .in("session_id", sessionIds);

    // Attach children to sessions
    const childrenBySession: Record<string, Any[]> = {};
    for (const c of (allChildren || [])) {
      if (!childrenBySession[c.session_id]) childrenBySession[c.session_id] = [];
      childrenBySession[c.session_id].push(c);
    }
    const allSessions = rawSessions.map((s: Any) => ({
      ...s,
      diagnostic_children: childrenBySession[s.id] || [],
    }));

    console.log(`[detect-persona-clusters] Loaded ${allSessions.length} sessions, ${personas.length} personas`);

    /* ── PHASE G (early): Update session_count for ALL personas — runs every time ── */
    const { counters: earlyCounters } = await updateAllPersonaSessionCounts(supabase);
    console.log(`[detect-persona-clusters] Phase G (early): session counts = ${JSON.stringify(earlyCounters)}`);

    /* ── PHASE B: Detect clusters ── */
    const allDetected: Any[] = [];

    // B1: New clusters from P0 sessions
    const p0Sessions = allSessions.filter((s: Any) => s.persona_code === "P0" || !s.persona_code);
    if (p0Sessions.length >= min_cluster_size) {
      const p0Criteria = p0Sessions.map(extractCriteria);
      const clusters = findClusters(p0Criteria, min_cluster_size);
      for (const c of clusters) {
        allDetected.push({ ...c, type: "new_cluster" });
        console.log(`[detect-persona-clusters] NEW_CLUSTER detected: ${c.session_ids.length} sessions`);
      }
    }

    // B2: Split large personas
    for (const persona of personas) {
      const pSessions = allSessions.filter((s: Any) => s.persona_code === persona.code);
      if (pSessions.length > max_persona_size) {
        const pCriteria = pSessions.map(extractCriteria);
        const subClusters = findSubClusters(pCriteria, persona, min_split_size);
        for (const c of subClusters) {
          allDetected.push({ ...c, type: "split" });
          console.log(`[detect-persona-clusters] SPLIT detected from ${persona.code}: ${c.session_ids.length} sessions`);
        }
      }
    }

    // B3: Recombination of weak sessions
    const weakSessions = allSessions.filter((s: Any) => s.persona_code && s.persona_code !== "P0" && (s.matching_score || 0) < weak_score_threshold);
    if (weakSessions.length >= min_cluster_size) {
      const weakCriteria = weakSessions.map(extractCriteria);
      const clusters = findClusters(weakCriteria, min_cluster_size);
      for (const c of clusters) {
        const currentAvg = c.current_avg_score;
        const estimatedAvg = c.estimated_avg_score;
        if (estimatedAvg - currentAvg >= 5) {
          allDetected.push({ ...c, type: "recombination" });
          console.log(`[detect-persona-clusters] RECOMBINATION detected: ${c.session_ids.length} sessions, score gain: ${estimatedAvg - currentAvg}`);
        }
      }
    }

    if (allDetected.length === 0) {
      await supabase.from("persona_detection_log").insert({
        detection_type: "scan_no_result",
        details: { p0_count: p0Sessions.length, total_sessions: allSessions.length, weak_count: weakSessions.length, session_counts_updated: earlyCounters },
        action_taken: "counters_updated",
        sessions_affected: 0,
      });
      console.log("[detect-persona-clusters] No clusters detected. Counters were updated.");
      return new Response(JSON.stringify({ success: true, detected: 0, dry_run, message: "Aucun cluster détecté — compteurs mis à jour", session_counts: earlyCounters }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dry_run) {
      return new Response(JSON.stringify({
        success: true, dry_run: true,
        detected: allDetected.length,
        clusters: allDetected.map((c) => ({ type: c.type, sessions: c.session_ids.length, source_personas: c.source_personas, levels: c.levels_covered })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* ── PHASE C: Create personas ── */
    const { data: existingPersonasForNames } = await supabase.from("personas").select("name");
    const existingNames: string[] = (existingPersonasForNames || []).map((p: Any) => p.name);
    const personas_created: string[] = [];

    // Phase F first: deactivate stale auto personas
    const autoPersonas = personas.filter((p: Any) => p.is_auto_created);
    for (const ap of autoPersonas) {
      const { count } = await supabase.from("diagnostic_sessions").select("*", { count: "exact", head: true }).eq("persona_code", ap.code).eq("status", "termine");
      const daysSinceCreation = (Date.now() - new Date(ap.auto_created_at).getTime()) / 86400000;
      if ((count ?? 0) < 10 && daysSinceCreation > 30) {
        await supabase.from("personas").update({ is_active: false }).eq("code", ap.code);
        await supabase.from("persona_detection_log").insert({
          detection_type: "deactivation",
          details: { persona_code: ap.code, session_count: count, days_since_creation: Math.round(daysSinceCreation) },
          action_taken: "deactivated",
          persona_code_created: ap.code,
          sessions_affected: count ?? 0,
        });
        console.log(`[detect-persona-clusters] Deactivated stale persona ${ap.code}`);
      }
    }

    for (const cluster of allDetected) {
      const nextCode = await getNextPersonaCode(supabase);
      const { name, label, description } = generatePersonaIdentity(cluster, existingNames);
      const criteria = buildCriteriaFromCluster(cluster);
      existingNames.push(name);

      const isExistingClientPersona = String(cluster.common_criteria["identity.is_existing_client"]?.value) === "true";

      await supabase.from("personas").insert({
        code: nextCode,
        name,
        full_label: label,
        description,
        criteria,
        is_active: true,
        is_pool: false,
        is_auto_created: true,
        auto_created_at: new Date().toISOString(),
        detection_source: cluster.type,
        source_personas: cluster.source_personas || null,
        session_count: cluster.session_ids.length,
        avg_matching_score: 0,
        min_sessions: 15,
        is_existing_client_persona: isExistingClientPersona,
      });

      await supabase.from("persona_detection_log").insert({
        detection_type: cluster.type,
        details: {
          common_criteria: cluster.common_criteria,
          session_count: cluster.session_ids.length,
          estimated_avg_score: cluster.estimated_avg_score,
          source_personas: cluster.source_personas,
          levels_covered: cluster.levels_covered,
        },
        action_taken: "created",
        persona_code_created: nextCode,
        sessions_affected: cluster.session_ids.length,
      });

      personas_created.push(nextCode);
      console.log(`[detect-persona-clusters] Created persona ${nextCode}: ${label}`);
    }

    /* ── PHASE D: Recalculate all sessions ── */
    let reassigned = 0;
    if (personas_created.length > 0) {
      const { data: allPersonasUpdated } = await supabase.from("personas").select("code, criteria").eq("is_active", true).eq("is_pool", false);
      if (allPersonasUpdated) {
        const BATCH = 50;
        const changedSessions: Array<{ id: string; persona_code: string; matching_score: number }> = [];

        for (let i = 0; i < allSessions.length; i += BATCH) {
          const batch = allSessions.slice(i, i + BATCH);
          for (const session of batch) {
            const children = session.diagnostic_children || [];
            const result = computeScore(session, children, allPersonasUpdated);
            if (result.code !== session.persona_code || result.score !== session.matching_score) {
              changedSessions.push({ id: session.id, persona_code: result.code, matching_score: result.score });
              reassigned++;
            }
          }
          await new Promise((r) => setTimeout(r, 100));
        }

        // Batch update
        for (const s of changedSessions) {
          await supabase.from("diagnostic_sessions").update({ persona_code: s.persona_code, matching_score: s.matching_score }).eq("id", s.id);
        }
        console.log(`[detect-persona-clusters] Reassigned ${reassigned} sessions`);
      }
    }

    /* ── PHASE E: Klaviyo sync for changed sessions ── */
    if (reassigned > 0) {
      // Reload updated sessions for Klaviyo
      const { data: updatedSessions } = await supabase
        .from("diagnostic_sessions")
        .select("id, email, persona_code, matching_score, optin_email, optin_sms")
        .eq("status", "termine")
        .not("email", "is", null)
        .neq("email", "");

      if (updatedSessions && KLAVIYO_API_KEY) {
        const BATCH_K = 20;
        for (let i = 0; i < updatedSessions.length; i += BATCH_K) {
          const batch = updatedSessions.slice(i, i + BATCH_K);
          await Promise.all(
            batch.map(async (session: Any) => {
              try {
                const { data: pData } = await supabase.from("personas").select("full_label").eq("code", session.persona_code ?? "P0").maybeSingle();
                const properties = {
                  persona: pData?.full_label || session.persona_code || "Non attribué",
                  persona_code: session.persona_code,
                  matching_score: session.matching_score,
                  optin_email: session.optin_email ?? false,
                  optin_sms: session.optin_sms ?? false,
                };
                await fetch("https://a.klaviyo.com/api/profile-import/", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
                    "revision": "2024-02-15",
                  },
                  body: JSON.stringify({
                    data: {
                      type: "profile",
                      attributes: {
                        email: session.email.toLowerCase().trim(),
                        properties,
                      },
                    },
                  }),
                });
              } catch (err) {
                console.error(`[detect-persona-clusters] Klaviyo sync failed for ${session.email}:`, err);
              }
            })
          );
          await new Promise((r) => setTimeout(r, 200));
        }
        console.log(`[detect-persona-clusters] Klaviyo sync done for ${updatedSessions.length} profiles`);
      }
    }

    /* ── PHASE G (final): Re-update counters after reassignment ── */
    const { counters: finalCounters } = await updateAllPersonaSessionCounts(supabase);

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      personas_created,
      clusters_detected: allDetected.length,
      sessions_reassigned: reassigned,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[detect-persona-clusters] Error:", err);
    reportEdgeFunctionError("detect-persona-clusters", err, { type: "cron_failure", severity: "critical" });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
