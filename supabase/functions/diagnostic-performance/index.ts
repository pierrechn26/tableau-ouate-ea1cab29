import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PersonaDistributionItem = {
  name: string;
  count: number;
  percentage: number;
};

type RecentResponse = {
  id: string;
  created_at: string | null;
  child_name: string | null;
  child_age: number | null;
  detected_persona: string | null;
  email_optin: boolean | null;
  sms_optin: boolean | null;
};

type RequestBody = {
  from?: string; // ISO
  to?: string; // ISO
};

function isCompleted(row: {
  metadata: Record<string, unknown> | null;
  email: string | null;
  detected_persona: string | null;
  child_name: string | null;
  child_age: number | null;
}) {
  const completedAt = row.metadata && (row.metadata as any).completed_at;
  if (completedAt) return true;
  if (row.email) return true;
  if (row.detected_persona) return true;
  if (row.child_name && row.child_age !== null && row.child_age !== undefined) return true;
  return false;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}));
    const from = body.from ? new Date(body.from) : undefined;
    const to = body.to ? new Date(body.to) : undefined;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pageSize = 1000;
    let offset = 0;

    let totalResponses = 0;
    let completedResponses = 0;
    let emailOptinCount = 0;
    let smsOptinCount = 0;

    const personaCounts: Record<string, number> = {};
    const recentResponses: RecentResponse[] = [];

    while (true) {
      let query = supabase
        .from("diagnostic_responses")
        // NOTE: we select email only to compute completion reliably; we never return it.
        .select(
          "id, created_at, child_name, child_age, detected_persona, email_optin, sms_optin, email, metadata"
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (from) query = query.gte("created_at", from.toISOString());
      if (to) query = query.lte("created_at", to.toISOString());

      const { data, error } = await query;
      if (error) {
        console.error("[diagnostic-performance] DB error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch performance data" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const rows = data ?? [];
      if (rows.length === 0) break;

      for (const row of rows as any[]) {
        totalResponses += 1;

        if (isCompleted(row)) {
          completedResponses += 1;
        }

        if (row.email_optin) emailOptinCount += 1;
        if (row.sms_optin) smsOptinCount += 1;

        if (row.detected_persona) {
          personaCounts[row.detected_persona] =
            (personaCounts[row.detected_persona] || 0) + 1;
        }

        // Keep only first 10 items (we're iterating newest-first)
        if (recentResponses.length < 10) {
          recentResponses.push({
            id: row.id,
            created_at: row.created_at ?? null,
            child_name: row.child_name ?? null,
            child_age: row.child_age ?? null,
            detected_persona: row.detected_persona ?? null,
            email_optin: row.email_optin ?? null,
            sms_optin: row.sms_optin ?? null,
          });
        }
      }

      // Next page
      offset += pageSize;
    }

    const personaDistribution: PersonaDistributionItem[] = Object.entries(personaCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const completionRate = totalResponses > 0
      ? (completedResponses / totalResponses) * 100
      : 0;

    const emailOptinRate = completedResponses > 0
      ? (emailOptinCount / completedResponses) * 100
      : 0;

    const smsOptinRate = completedResponses > 0
      ? (smsOptinCount / completedResponses) * 100
      : 0;

    return new Response(
      JSON.stringify({
        totalResponses,
        completedResponses,
        completionRate,
        emailOptinCount,
        smsOptinCount,
        emailOptinRate,
        smsOptinRate,
        personaDistribution,
        responses: recentResponses,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[diagnostic-performance] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
