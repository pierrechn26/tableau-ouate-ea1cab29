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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const SHOPIFY_STORE = "www-ouate-paris-com.myshopify.com";
  const STOREFRONT_TOKEN = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");

  console.log(`[sync] Store: ${SHOPIFY_STORE} | Storefront token present: ${!!STOREFRONT_TOKEN} | prefix: ${STOREFRONT_TOKEN?.substring(0, 8)}`);

  if (!STOREFRONT_TOKEN) {
    return new Response(JSON.stringify({ error: "SHOPIFY_STOREFRONT_ACCESS_TOKEN manquant" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const STOREFRONT_URL = `https://${SHOPIFY_STORE}/api/2024-01/graphql.json`;

  const query = `
    query GetAllProducts($cursor: String) {
      products(first: 250, after: $cursor) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            vendor
            tags
            availableForSale
            publishedAt
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  price { amount }
                  availableForSale
                  sku
                }
              }
            }
            images(first: 5) {
              edges {
                node { url altText }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  try {
    let allProducts: any[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await fetch(STOREFRONT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query, variables: { cursor } }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Storefront API error ${response.status}: ${errText}`);
      }

      const { data, errors } = await response.json();

      if (errors?.length) {
        throw new Error(`GraphQL errors: ${errors.map((e: any) => e.message).join(", ")}`);
      }

      const edges = data?.products?.edges || [];
      allProducts = [...allProducts, ...edges.map((e: any) => e.node)];

      const pageInfo = data?.products?.pageInfo;
      hasNextPage = pageInfo?.hasNextPage ?? false;
      cursor = pageInfo?.endCursor ?? null;
    }

    console.log(`[sync] Fetched ${allProducts.length} products from Storefront API`);

    let synced = 0;
    let errors_count = 0;

    for (const product of allProducts) {
      try {
        const shopifyId = parseInt(product.id.replace("gid://shopify/Product/", ""));

        const variants = product.variants.edges.map((e: any) => ({
          id: e.node.id,
          title: e.node.title,
          price: parseFloat(e.node.price?.amount || "0"),
          sku: e.node.sku || "",
          available: e.node.availableForSale,
        }));

        const images = product.images.edges.map((e: any) => ({
          src: e.node.url,
          alt: e.node.altText || product.title,
        }));

        const shopifyUrl = `https://www.ouate-paris.com/products/${product.handle}`;

        const { error: upsertError } = await supabase.from("ouate_products").upsert({
          shopify_product_id: shopifyId,
          title: product.title,
          handle: product.handle,
          description: (product.description || "").substring(0, 500),
          product_type: product.productType || null,
          vendor: product.vendor || null,
          tags: product.tags || [],
          price_min: parseFloat(product.priceRange.minVariantPrice.amount),
          price_max: parseFloat(product.priceRange.maxVariantPrice.amount),
          variants,
          images,
          status: product.availableForSale ? "active" : "archived",
          published_at: product.publishedAt || null,
          shopify_url: shopifyUrl,
          synced_at: new Date().toISOString(),
        }, { onConflict: "shopify_product_id" });

        if (upsertError) {
          console.error(`Error upserting ${product.title}:`, upsertError.message);
          errors_count++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`Error processing product ${product.id}:`, err);
        errors_count++;
      }
    }

    console.log(`[sync] Done: ${synced} synced, ${errors_count} errors`);

    return new Response(JSON.stringify({
      success: true,
      synced,
      errors: errors_count,
      total: allProducts.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("sync-shopify-products fatal error:", msg);
    reportEdgeFunctionError("sync-shopify-products", err, { type: "cron_failure", severity: "critical" });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
