import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, startOfMonth, nextMonday, isMonday } from "date-fns";
import { fr } from "date-fns/locale";

// ── Plan config ────────────────────────────────────────────────────────────────
export type PlanType = "starter" | "growth" | "scale";

const PLAN_LIMITS: Record<PlanType, { sessions: number; aski: number; recos: number }> = {
  starter: { sessions: 500, aski: 100, recos: 6 },
  growth:  { sessions: 10_000, aski: 500, recos: 15 },
  scale:   { sessions: 50_000, aski: 2_000, recos: 60 },
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

function renewalWeekly(): string {
  const today = new Date();
  const nextLundi = isMonday(today) ? addMonths(today, 0) : nextMonday(today);
  // If today is Monday, next renewal is 7 days later
  const target = isMonday(today)
    ? new Date(today.getTime() + 7 * 24 * 3600_000)
    : nextLundi;
  return format(target, "EEEE d MMMM yyyy", { locale: fr });
}

function startOfWeekMonday(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function startOfMonthStr(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
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
  const current = PLAN_LIMITS[plan];
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
      const monthStart = startOfMonthStr();
      const weekStart = startOfWeekMonday();
      const nextMonthDate = addMonths(new Date(monthStart), 1).toISOString();

      const [planRes, sessionCountRes, askiCountRes, recosRes] = await Promise.all([
        // 1. Lire le plan client
        supabase
          .from("client_plan" as any)
          .select("plan, sessions_limit, aski_limit, recos_weekly_limit")
          .eq("project_id", projectId)
          .single(),

        // 2. Compter les sessions du mois (via diagnostic_sessions)
        supabase
          .from("diagnostic_sessions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(monthStart).toISOString())
          .lt("created_at", nextMonthDate),

        // 3. Compter les questions Aski du mois (via aski_messages)
        supabase
          .from("aski_messages")
          .select("*", { count: "exact", head: true })
          .eq("role", "user")
          .gte("created_at", new Date(monthStart).toISOString())
          .lt("created_at", nextMonthDate),

        // 4. Compter les recos générées cette semaine (via recommendation_usage)
        supabase
          .from("recommendation_usage")
          .select("total_generated, month_year")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      // Plan
      if (planRes.data) {
        const d = planRes.data as any;
        const p = (d.plan || "scale") as PlanType;
        setPlan(p);
        setClientLimits({
          sessions: d.sessions_limit ?? PLAN_LIMITS[p].sessions,
          aski: d.aski_limit ?? PLAN_LIMITS[p].aski,
          recos: d.recos_weekly_limit ?? PLAN_LIMITS[p].recos,
        });
      }

      // Sessions
      setSessionsUsed(sessionCountRes.count ?? 0);

      // Aski
      setAskiUsed(askiCountRes.count ?? 0);

      // Recos hebdo — lire depuis recommendation_usage (total du mois courant)
      // On compte les entrées de marketing_recommendations de cette semaine
      const { count: recosCount } = await supabase
        .from("marketing_recommendations")
        .select("*", { count: "exact", head: true })
        .gte("generated_at", new Date(weekStart + "T00:00:00").toISOString());

      setRecosUsed(recosCount ?? 0);
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
  const renewalWeek = renewalWeekly();

  return {
    plan,
    sessions: makeAxis(sessionsUsed, clientLimits.sessions, renewalMonth),
    aski: makeAxis(askiUsed, clientLimits.aski, renewalMonth),
    recos: makeAxis(recosUsed, clientLimits.recos, renewalWeek),
    upgrade: makeUpgrade(plan),
    loading,
    refresh: fetchData,
  };
}
