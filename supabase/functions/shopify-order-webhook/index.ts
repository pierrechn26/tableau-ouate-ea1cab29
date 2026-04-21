import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // --- HMAC verification ---
    const webhookSecret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("SHOPIFY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
    if (!hmacHeader) {
      console.error("Missing HMAC header");
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
      console.error("Invalid HMAC signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = JSON.parse(body);
    console.log(`Processing order ${order.id} — email: ${order.email}`);

    // --- Supabase client with service role ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build validated products list
    const validatedProducts = (order.line_items || [])
      .map((item: { title: string }) => item.title)
      .join(", ");
    const validatedCartAmount = parseFloat(order.total_price);

    // --- Look for _diag_session in line item properties ---
    const diagSession = (order.line_items || [])
      .flatMap((item: { properties?: Array<{ name: string; value: string }> }) => item.properties || [])
      .find((prop: { name: string; value: string }) => prop.name === "_diag_session")
      ?.value;

    let matched = false;
    let isFromDiagnostic = false;
    let resolvedSessionCode: string | null = diagSession || null;

    // --- Direct match by session_code ---
    if (diagSession) {
      console.log(`Found _diag_session property: ${diagSession}`);
      isFromDiagnostic = true;

      const { data: existingSession } = await supabase
        .from("diagnostic_sessions")
        .select("id, conversion")
        .eq("session_code", diagSession)
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        if (existingSession.conversion === true) {
          console.log(`Session ${diagSession} already converted, skipping`);
          matched = true;
        } else {
          const { error } = await supabase
            .from("diagnostic_sessions")
            .update({
              conversion: true,
              validated_cart_amount: validatedCartAmount,
              validated_products: validatedProducts,
            })
            .eq("session_code", diagSession);

          if (error) {
            console.error(`Error updating session ${diagSession}:`, error);
          } else {
            console.log(`✅ Session ${diagSession} marked as converted (direct match)`);
            matched = true;
          }
        }
      } else {
        console.log(`Session code ${diagSession} not found in database`);
      }
    }

    // --- Fallback by email (5-day window) ---
    if (!matched && order.email) {
      console.log(`No direct match, trying email fallback: ${order.email}`);

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const { data: sessions, error: fetchError } = await supabase
        .from("diagnostic_sessions")
        .select("id, session_code")
        .eq("email", order.email)
        .eq("conversion", false)
        .gte("created_at", fiveDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("Error fetching sessions by email:", fetchError);
      } else if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const { error: updateError } = await supabase
          .from("diagnostic_sessions")
          .update({
            conversion: true,
            validated_cart_amount: validatedCartAmount,
            validated_products: validatedProducts,
          })
          .eq("id", session.id);

        if (updateError) {
          console.error(`Error updating session ${session.session_code} via email fallback:`, updateError);
        } else {
          console.log(`✅ Session ${session.session_code} marked as converted (email fallback)`);
          matched = true;
          isFromDiagnostic = true;
          resolvedSessionCode = session.session_code;
        }
      } else {
        console.log(`No matching session found for email ${order.email} in the last 5 days`);
      }
    }

    // --- ALWAYS upsert order into shopify_orders ---
    if (matched) {
      console.log('[shopify-order-webhook] matched via',
        diagSession ? 'line_item_property' : 'email_fallback',
        'session_code:', resolvedSessionCode);
    }

    const { error: upsertError } = await supabase
      .from("shopify_orders")
      .upsert(
        {
          shopify_order_id: String(order.id),
          order_number: order.name || String(order.order_number),
          total_price: validatedCartAmount,
          currency: order.currency || "EUR",
          created_at: order.created_at || new Date().toISOString(),
          is_from_diagnostic: isFromDiagnostic,
          diagnostic_session_id: resolvedSessionCode,
          customer_email: order.email || null,
        },
        { onConflict: "shopify_order_id" }
      );

    if (upsertError) {
      console.error("Error upserting shopify_order:", upsertError);
    } else {
      console.log(`✅ Order ${order.id} saved to shopify_orders (diag: ${isFromDiagnostic})`);
    }

    if (!matched) {
      console.log(`No diagnostic session matched for order ${order.id}`);
    }

    return new Response(
      JSON.stringify({ success: true, matched, isFromDiagnostic }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    reportEdgeFunctionError("shopify-order-webhook", error, { type: "webhook_failure", severity: "error" });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
