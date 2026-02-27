import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { offset = 0, limit = 400 } = await req.json().catch(() => ({}));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sessions, error } = await supabase
    .from("diagnostic_sessions")
    .select("id, email, persona_code")
    .eq("status", "termine")
    .not("email", "is", null)
    .not("email", "eq", "")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[backfill-klaviyo] Query error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[backfill-klaviyo] Found ${sessions?.length ?? 0} sessions (offset=${offset}, limit=${limit})`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const session of sessions ?? []) {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("sync-klaviyo-persona", {
        body: { session_id: session.id },
      });

      if (invokeError) {
        console.error(`[backfill-klaviyo] Failed ${session.id} (${session.email}):`, invokeError);
        failed++;
      } else if (data?.skipped) {
        console.log(`[backfill-klaviyo] Skipped ${session.id}: ${data.reason}`);
        skipped++;
      } else {
        console.log(`[backfill-klaviyo] ✓ Synced ${session.email} — persona: ${session.persona_code}`);
        success++;
      }
    } catch (err) {
      console.error(`[backfill-klaviyo] Error ${session.id}:`, err);
      failed++;
    }

    // 200ms entre chaque appel — Klaviyo autorise 75 req/s, 200ms = ~5 req/s, très conservateur
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const summary = {
    offset,
    limit,
    total_in_batch: sessions?.length ?? 0,
    success,
    failed,
    skipped,
    message: `Backfill terminé : ${success} profils mis à jour, ${failed} échecs, ${skipped} ignorés`,
  };

  console.log("[backfill-klaviyo] Summary:", summary);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
