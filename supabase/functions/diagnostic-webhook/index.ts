import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface DiagnosticPayload {
  session_id: string;
  child_name?: string;
  child_age?: number;
  parent_name?: string;
  email?: string;
  phone?: string;
  email_optin?: boolean;
  sms_optin?: boolean;
  detected_persona?: string;
  persona_confidence?: number;
  persona_scores?: Record<string, number>;
  answers?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  source_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`[diagnostic-webhook] Method not allowed: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('DIAGNOSTIC_WEBHOOK_SECRET');
    
    if (!expectedSecret) {
      console.error('[diagnostic-webhook] DIAGNOSTIC_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (webhookSecret !== expectedSecret) {
      console.log('[diagnostic-webhook] Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: DiagnosticPayload = await req.json();
    console.log('[diagnostic-webhook] Received payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.session_id) {
      console.log('[diagnostic-webhook] Missing session_id');
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for inserting data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert or update diagnostic response
    const { data, error } = await supabase
      .from('diagnostic_responses')
      .upsert({
        session_id: payload.session_id,
        child_name: payload.child_name,
        child_age: payload.child_age,
        parent_name: payload.parent_name,
        email: payload.email,
        phone: payload.phone,
        email_optin: payload.email_optin ?? false,
        sms_optin: payload.sms_optin ?? false,
        detected_persona: payload.detected_persona,
        persona_confidence: payload.persona_confidence,
        persona_scores: payload.persona_scores ?? {},
        answers: payload.answers ?? {},
        metadata: payload.metadata ?? {},
        source_url: payload.source_url,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_content: payload.utm_content,
        utm_term: payload.utm_term,
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[diagnostic-webhook] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save diagnostic response', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[diagnostic-webhook] Successfully saved response:', data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Diagnostic response saved successfully',
        id: data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[diagnostic-webhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
