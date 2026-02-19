import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let text: string;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.csv_url) {
        console.log(`[import-shopify-csv] Fetching CSV from URL: ${body.csv_url}`);
        const csvResp = await fetch(body.csv_url);
        if (!csvResp.ok) {
          return new Response(
            JSON.stringify({ error: `Failed to fetch CSV: ${csvResp.status}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        text = await csvResp.text();
      } else {
        return new Response(
          JSON.stringify({ error: "JSON body must contain csv_url" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return new Response(
          JSON.stringify({ error: "No CSV file provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      text = await file.text();
    } else {
      text = await req.text();
      if (!text || text.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "No CSV data provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // Parse CSV with multiline field support
    function parseFullCsv(csvText: string): string[][] {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentField = "";
      let inQuotes = false;
      
      for (let i = 0; i < csvText.length; i++) {
        const ch = csvText[i];
        if (inQuotes) {
          if (ch === '"') {
            if (csvText[i + 1] === '"') {
              currentField += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            currentField += ch;
          }
        } else {
          if (ch === '"') {
            inQuotes = true;
          } else if (ch === ',') {
            currentRow.push(currentField.trim());
            currentField = "";
          } else if (ch === '\n' || (ch === '\r' && csvText[i + 1] === '\n')) {
            if (ch === '\r') i++; // skip \n
            currentRow.push(currentField.trim());
            currentField = "";
            if (currentRow.length > 1 || currentRow[0] !== "") {
              rows.push(currentRow);
            }
            currentRow = [];
          } else {
            currentField += ch;
          }
        }
      }
      // Last field/row
      currentRow.push(currentField.trim());
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow);
      }
      return rows;
    }

    const allRows = parseFullCsv(text);
    if (allRows.length < 2) {
      return new Response(
        JSON.stringify({ error: "CSV file is empty or has no data rows" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvHeaders = allRows[0];
    const colIndex = (name: string) =>
      csvHeaders.findIndex((h) => h.toLowerCase() === name.toLowerCase());

    const iName = colIndex("Name");
    const iEmail = colIndex("Email");
    const iTotal = colIndex("Total");
    const iCurrency = colIndex("Currency");
    const iCreatedAt = colIndex("Created at");
    const iDiscountCode = colIndex("Discount Code");
    const iFinancialStatus = colIndex("Financial Status");
    const iRefundedAmount = colIndex("Refunded Amount");

    if (iName === -1 || iTotal === -1) {
      return new Response(
        JSON.stringify({ error: "CSV must contain 'Name' and 'Total' columns", foundHeaders: csvHeaders }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by order Name (deduplicate line items)
    const orderMap = new Map<string, {
      name: string;
      email: string;
      total: number;
      currency: string;
      createdAt: string;
      discountCode: string;
      financialStatus: string;
      refundedAmount: number;
    }>();

    for (let i = 1; i < allRows.length; i++) {
      const cols = allRows[i];
      const name = cols[iName] || "";
      if (!name) continue;

      // Only keep first occurrence per order (dedup line items)
      if (orderMap.has(name)) continue;

      const financialStatus = iFinancialStatus !== -1 ? (cols[iFinancialStatus] || "").toLowerCase() : "paid";
      const refundedStr = iRefundedAmount !== -1 ? (cols[iRefundedAmount] || "0") : "0";
      const refundedAmount = parseFloat(refundedStr.replace(/[^0-9.\-]/g, "")) || 0;

      orderMap.set(name, {
        name,
        email: iEmail !== -1 ? cols[iEmail] || "" : "",
        total: parseFloat((cols[iTotal] || "0").replace(/[^0-9.\-]/g, "")) || 0,
        currency: iCurrency !== -1 ? cols[iCurrency] || "EUR" : "EUR",
        createdAt: iCreatedAt !== -1 ? cols[iCreatedAt] || "" : "",
        discountCode: iDiscountCode !== -1 ? cols[iDiscountCode] || "" : "",
        financialStatus,
        refundedAmount,
      });
    }

    // Filter: only paid, no refunds
    const orders = Array.from(orderMap.values()).filter(
      (o) => o.financialStatus === "paid" && o.refundedAmount <= 0
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Also try to match by email to diagnostic_sessions for attribution
    const emails = orders.filter((o) => o.email).map((o) => o.email.toLowerCase());
    const { data: diagSessions } = emails.length > 0
      ? await supabase
          .from("diagnostic_sessions")
          .select("email, session_code, id")
          .eq("status", "termine")
          .in("email", emails)
      : { data: [] };

    const emailToSession = new Map<string, { id: string; session_code: string }>();
    for (const s of diagSessions || []) {
      if (s.email) emailToSession.set(s.email.toLowerCase(), { id: s.id, session_code: s.session_code });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Batch upsert
    const rows = orders.map((o) => {
      const hasDiscountDiag = o.discountCode.toUpperCase().includes("DIAG-15");
      const emailMatch = o.email ? emailToSession.get(o.email.toLowerCase()) : undefined;
      const isFromDiagnostic = hasDiscountDiag || !!emailMatch;

      return {
        shopify_order_id: o.name,
        order_number: o.name,
        customer_email: o.email || null,
        total_price: o.total,
        currency: o.currency,
        created_at: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
        is_from_diagnostic: isFromDiagnostic,
        diagnostic_session_id: emailMatch?.session_code || null,
      };
    });

    if (rows.length > 0) {
      const { data, error } = await supabase
        .from("shopify_orders")
        .upsert(rows, { onConflict: "shopify_order_id" })
        .select("id");

      if (error) {
        console.error("[import-shopify-csv] Upsert error:", error);
        errors.push(error.message);
      } else {
        inserted = data?.length || 0;
      }
    }

    skipped = orderMap.size - orders.length;

    console.log(`[import-shopify-csv] Done: ${inserted} upserted, ${skipped} filtered out, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        totalRowsInCsv: allRows.length - 1,
        uniqueOrders: orderMap.size,
        filteredOut: skipped,
        upserted: inserted,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[import-shopify-csv] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
