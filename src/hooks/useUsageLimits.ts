import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

// ── Plan config ────────────────────────────────────────────────────────────────
export type PlanType = "starter" | "growth" | "scale";

const PLAN_LIMITS: Record<PlanType, { sessions: number; aski: number; recos: number }> = {
  starter: { sessions: 500,    aski: 100,   recos: 24 },
  growth:  { sessions: 10_000, aski: 500,   recos: 60 },
  scale:   { sessions: 50_000, aski: 2_000, recos: 240 },
};

const NEXT_PLAN: Record<PlanType, PlanType | null> = {
  starter: "growth",
  growth:  "scale",
  scale:   null,
};

const PLAN_PRICE: Record<PlanType, string> = {
  starter: "€99/mois",
  growth:  "€199/mois",
  scale:   "€489/mois",
};

const PLAN_LABEL: Record<PlanType, string> = {
  starter: "Starter",
  growth:  "Growth",
  scale:   "Scale",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function frenchOrdinal(day: number): string {
  return day === 1 ? "1er" : `${day}`;
}

function renewalMonthly(): string {
  const next = addMonths(startOfMonth(new Date()), 1);
  return `${frenchOrdinal(1)} ${format(next, "MMMM yyyy", { locale: fr })}`;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface UsageAxis {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isWarning: boolean;
  isExceeded: boolean;
  renewalDate: string;
}

interface UpgradeInfo {
  nextPlan: PlanType | null;
  nextPlanLabel: string;
  nextPlanPrice: string;
  sessionsGain: string;
  askiGain: string;
  recosGain: string;
}

export interface UsageLimits {
  plan: PlanType;
  sessions: UsageAxis;
  aski: UsageAxis;
  recos: UsageAxis;
  upgrade: UpgradeInfo;
  loading: boolean;
  refresh: () => Promise<void>;
}

function makeAxis(used: number, limit: number, renewalDate: string): UsageAxis {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percentage: Math.min(pct, 100),
    isWarning: pct >= 80 && pct < 100,
    isExceeded: pct >= 100,
    renewalDate,
  };
}

function makeUpgrade(plan: PlanType): UpgradeInfo {
  const nextPlan = NEXT_PLAN[plan];
  if (!nextPlan) {
    return {
      nextPlan: null,
      nextPlanLabel: "",
      nextPlanPrice: "",
      sessionsGain: "",
      askiGain: "",
      recosGain: "",
    };
  }
  const next = PLAN_LIMITS[nextPlan];
  return {
    nextPlan,
    nextPlanLabel: PLAN_LABEL[nextPlan],
    nextPlanPrice: PLAN_PRICE[nextPlan],
    sessionsGain: next.sessions.toLocaleString("fr-FR"),
    askiGain: next.aski.toLocaleString("fr-FR"),
    recosGain: String(next.recos),
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useUsageLimits(projectId = "ouate"): UsageLimits {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanType>("scale");
  const [clientLimits, setClientLimits] = useState(PLAN_LIMITS.scale);
  const [sessionsUsed, setSessionsUsed] = useState(0);
  const [askiUsed, setAskiUsed] = useState(0);
  const [recosUsed, setRecosUsed] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ── Dates strictement UTC pour éviter tout décalage timezone client ──────
      const now = new Date();
      const utcMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const utcNextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

      const [planRes, sessionCountRes, askiCountRes, recosCountRes] = await Promise.all([
        // 1. Lire le plan client (colonne renommée recos_monthly_limit)
        supabase
          .from("client_plan" as any)
          .select("plan, sessions_limit, aski_limit, recos_monthly_limit")
          .eq("project_id", projectId)
          .single(),

        // 2. Compter TOUTES les sessions créées ce mois (aucun filtre statut)
        // Chaque session créée consomme un crédit, qu'elle soit en_cours, terminée ou abandonnée
        supabase
          .from("diagnostic_sessions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", utcMonthStart)
          .lt("created_at", utcNextMonthStart),

        // 3. Compter les questions Aski du mois (via aski_messages)
        supabase
          .from("aski_messages")
          .select("*", { count: "exact", head: true })
          .eq("role", "user")
          .gte("created_at", utcMonthStart)
          .lt("created_at", utcNextMonthStart),

        // 4. Compter les recos générées CE MOIS (mensuel, plus hebdomadaire)
        supabase
          .from("marketing_recommendations")
          .select("*", { count: "exact", head: true })
          .gte("generated_at", utcMonthStart)
          .lt("generated_at", utcNextMonthStart),
      ]);

      // Plan
      if (planRes.data) {
        const d = planRes.data as any;
        const p = (d.plan || "scale") as PlanType;
        setPlan(p);
        setClientLimits({
          sessions: d.sessions_limit    ?? PLAN_LIMITS[p].sessions,
          aski:     d.aski_limit        ?? PLAN_LIMITS[p].aski,
          recos:    d.recos_monthly_limit ?? PLAN_LIMITS[p].recos,
        });
      }

      // ⚠️ TEST SIMULATION: Sessions à 100% — supprimer après test
      setSessionsUsed(clientLimits.sessions);
      setAskiUsed(askiCountRes.count ?? 0);
      setRecosUsed(recosCountRes.count ?? 0);
    } catch (err) {
      console.error("[useUsageLimits]", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renewalMonth = renewalMonthly();

  return {
    plan,
    sessions: makeAxis(sessionsUsed, clientLimits.sessions, renewalMonth),
    aski:     makeAxis(askiUsed,     clientLimits.aski,     renewalMonth),
    recos:    makeAxis(recosUsed,    clientLimits.recos,     renewalMonth),
    upgrade:  makeUpgrade(plan),
    loading,
    refresh: fetchData,
  };
}
