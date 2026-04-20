// Shared pagination helper for Supabase queries on large tables.
// Bypasses the default 1000-row cap imposed by the Supabase client.
//
// Usage:
//   const sessions = await paginateQuery<SessionRow>(supabase, (qb) =>
//     qb.from("diagnostic_sessions")
//       .select("id, persona_code, matching_score")
//       .eq("status", "termine")
//   );
//
// Notes:
//   - The builder function MUST include .from() and .select().
//   - Do NOT include .range() in the builder — this helper handles it.
//   - Filters and order are preserved across pages.
//   - Page size defaults to 1000 (Supabase max).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type QueryBuilder = any;

export async function paginateQuery<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  buildQuery: (client: SupabaseClient) => QueryBuilder,
  pageSize: number = 1000,
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const query = buildQuery(supabase).range(from, from + pageSize - 1);
    const { data, error } = await query;

    if (error) {
      console.error("[paginateQuery] error:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    results.push(...(data as T[]));
    hasMore = data.length === pageSize;
    from += pageSize;
  }

  return results;
}
