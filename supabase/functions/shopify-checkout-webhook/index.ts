import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("SHOPIFY_CHECKOUT_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[checkout-webhook] SHOPIFY_CHECKOUT_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
    if (!hmacHeader) {
      console.error("[checkout-webhook] Missing HMAC header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    const hash = createHmac("sha256", webhookSecret)
      .update(body, "utf8")
      .digest("base64");

    if (hash !== hmacHeader) {
      console.error("[checkout-webhook] Invalid HMAC signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkout = JSON.parse(body);
    const topic = req.headers.get("x-shopify-topic") || "unknown";
    console.log(`[checkout-webhook] Processing ${topic} — checkout token: ${checkout.token}`);

    // Look for _diag_session in line item properties
    const diagSession = (checkout.line_items || [])
      .flatMap((item: { properties?: Array<{ name: string; value: string }> }) => item.properties || [])
      .find((prop: { name: string; value: string }) => prop.name === "_diag_session")
      ?.value;

    if (!diagSession) {
      console.log("[checkout-webhook] No _diag_session property found, skipping");
      return new Response(
        JSON.stringify({ success: true, matched: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[checkout-webhook] Found _diag_session: ${diagSession}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only update if not already marked
    const { data: existing } = await supabase
      .from("diagnostic_sessions")
      .select("id, checkout_started")
      .eq("session_code", diagSession)
      .maybeSingle();

    if (!existing) {
      console.log(`[checkout-webhook] Session ${diagSession} not found`);
      return new Response(
        JSON.stringify({ success: true, matched: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existing.checkout_started) {
      console.log(`[checkout-webhook] Session ${diagSession} already has checkout_started=true, skipping`);
      return new Response(
        JSON.stringify({ success: true, matched: true, alreadySet: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase
      .from("diagnostic_sessions")
      .update({
        checkout_started: true,
        checkout_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error(`[checkout-webhook] Error updating session ${diagSession}:`, error);
      return new Response(
        JSON.stringify({ error: "Failed to update session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[checkout-webhook] ✅ Session ${diagSession} marked checkout_started=true`);
    return new Response(
      JSON.stringify({ success: true, matched: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[checkout-webhook] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
