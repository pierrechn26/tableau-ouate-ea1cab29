import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

  // Domaine permanent Shopify + token admin
  const SHOPIFY_STORE = "www-ouate-paris-com.myshopify.com";
  const SHOPIFY_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

  if (!SHOPIFY_TOKEN) {
    return new Response(JSON.stringify({
      error: "SHOPIFY_ACCESS_TOKEN manquant",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    // Shopify Admin API — tous les produits actifs (max 250 par appel)
    let allProducts: any[] = [];
    let pageInfo: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const url = pageInfo
        ? `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json?status=active&limit=250&page_info=${pageInfo}`
        : `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json?status=active&limit=250`;

      const response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Shopify API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      allProducts = [...allProducts, ...(data.products || [])];

      // Pagination via Link header
      const linkHeader = response.headers.get("Link") || "";
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
      if (nextMatch) {
        pageInfo = nextMatch[1];
      } else {
        hasNextPage = false;
      }
    }

    let synced = 0;
    let errors = 0;

    for (const product of allProducts) {
      try {
        const variants = (product.variants || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          price: parseFloat(v.price) || 0,
          sku: v.sku || "",
          available: (v.inventory_quantity ?? 1) > 0,
          option1: v.option1,
          option2: v.option2,
          grams: v.grams,
        }));

        const prices = (product.variants || []).map((v: any) => parseFloat(v.price) || 0).filter(p => p > 0);
        const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
        const priceMax = prices.length > 0 ? Math.max(...prices) : 0;

        const cleanDescription = (product.body_html || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500);

        const tags = product.tags
          ? product.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];

        const images = (product.images || []).map((img: any) => ({
          src: img.src,
          alt: img.alt || product.title,
          position: img.position,
        }));

        // Construire l'URL boutique Ouate
        const storeFriendlyDomain = SHOPIFY_STORE.replace(".myshopify.com", ".com");
        const shopifyUrl = `https://${storeFriendlyDomain}/products/${product.handle}`;

        const { error: upsertError } = await supabase.from("ouate_products").upsert({
          shopify_product_id: product.id,
          title: product.title,
          handle: product.handle,
          description: cleanDescription,
          product_type: product.product_type || null,
          vendor: product.vendor || null,
          tags,
          price_min: priceMin,
          price_max: priceMax,
          variants,
          images,
          status: product.status || "active",
          published_at: product.published_at || null,
          shopify_url: shopifyUrl,
          synced_at: new Date().toISOString(),
        }, { onConflict: "shopify_product_id" });

        if (upsertError) {
          console.error(`Error upserting ${product.title}:`, upsertError.message);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`Error processing product ${product.id}:`, err);
        errors++;
      }
    }

    // Archiver les produits Shopify inactifs/retirés
    const activeIds = allProducts.map((p: any) => p.id);
    if (activeIds.length > 0) {
      const { error: archiveError } = await supabase
        .from("ouate_products")
        .update({ status: "archived" })
        .not("shopify_product_id", "in", `(${activeIds.join(",")})`);
      if (archiveError) console.error("Archive error:", archiveError.message);
    }

    console.log(`Sync Shopify Products: ${synced} synced, ${errors} errors, ${allProducts.length} total`);

    return new Response(JSON.stringify({
      success: true,
      synced,
      errors,
      total: allProducts.length,
      archived: allProducts.length > 0 ? "non-listed products archived" : "no products found",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("sync-shopify-products fatal error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
