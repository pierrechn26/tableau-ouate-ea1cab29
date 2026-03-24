import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GenerationType, QuotaData } from "@/hooks/useMarketingRecommendations";
import { UpgradePrompt } from "@/components/dashboard/shared/UpgradePrompt";
import { cn } from "@/lib/utils";
import { type PlanType, type UsageLimits } from "@/hooks/useUsageLimits";

interface Props {
  quota: QuotaData;
  isGenerating: boolean;
  generatingType: GenerationType | null;
  onGenerate: (type: GenerationType) => void;
  usageLimits?: UsageLimits;
}

const PLAN_LIMITS_MONTHLY: Record<PlanType, number> = {
  starter: 24,
  growth: 60,
  scale: 240,
};

export function QuotaBar({ quota, isGenerating, generatingType, onGenerate, usageLimits }: Props) {
  // Prefer live usageLimits data for monthly recos, fallback to quota
  const recos = usageLimits?.recos;
  const plan = (usageLimits?.plan ?? quota.plan) as PlanType;

  const displayUsed = recos?.used ?? quota.total_generated;
  const displayLimit = recos?.limit ?? quota.monthly_limit;
  const displayRemaining = recos?.remaining ?? quota.remaining;

  const pct = displayLimit > 0 ? (displayUsed / displayLimit) * 100 : 0;
  const isLimitReached = displayRemaining <= 0;
  const canGenerateGlobal = displayRemaining >= 9 && !isGenerating;
  const isWarning = pct >= 80 && pct < 100;

  const barColor =
    pct > 85
      ? "from-destructive to-destructive/70"
      : pct > 60
      ? "from-warning to-warning/70"
      : "from-primary to-accent";

  const textColor =
    pct > 85 ? "text-destructive" : pct > 60 ? "text-warning" : "text-primary";

  const periodLabel = "ce mois";

  return (
    <div className="space-y-4">
      {/* Limit reached → UpgradePrompt */}
      {isLimitReached ? (
        <UpgradePrompt
          type="recos"
          severity="exceeded"
          currentPlan={plan}
          currentUsage={displayUsed}
          currentLimit={displayLimit}
          renewalDate={recos?.renewalDate ?? "1er du mois prochain"}
          nextPlan={usageLimits?.upgrade.nextPlan ?? null}
          nextPlanLabel={usageLimits?.upgrade.nextPlanLabel ?? ""}
          nextPlanPrice={usageLimits?.upgrade.nextPlanPrice}
          nextLimit={
            usageLimits?.upgrade.nextPlan
              ? PLAN_LIMITS_MONTHLY[usageLimits.upgrade.nextPlan]
              : displayLimit
          }
        />
      ) : (
        <>
          {/* Quota display */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                Recommandations utilisées {periodLabel}
              </span>
              <span className={cn("font-bold tabular-nums", textColor)}>
                {displayUsed} / {displayLimit}
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={cn("h-full rounded-full bg-gradient-to-r", barColor)}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className={cn(isWarning && "text-warning font-medium")}>
                {displayRemaining} recommandation{displayRemaining !== 1 ? "s" : ""} restante{displayRemaining !== 1 ? "s" : ""}
                {isWarning && " — approche de la limite"}
              </span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 capitalize font-medium"
                >
                  Plan {plan}
                </Badge>
                {recos && (
                  <span className="text-[10px] text-muted-foreground/60">
                    Renouvellement : {recos.renewalDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Warning inline if approaching */}
          {isWarning && recos && (
            <UpgradePrompt
              type="recos"
              severity="warning"
              currentPlan={plan}
              currentUsage={displayUsed}
              currentLimit={displayLimit}
              renewalDate={recos.renewalDate}
              nextPlan={usageLimits?.upgrade.nextPlan ?? null}
              nextPlanLabel={usageLimits?.upgrade.nextPlanLabel ?? ""}
              nextLimit={
                usageLimits?.upgrade.nextPlan
                  ? PLAN_LIMITS_MONTHLY[usageLimits.upgrade.nextPlan]
                  : displayLimit
              }
            />
          )}

          {/* Generate all button */}
          <Button
            className="w-full h-auto py-3 px-4 flex flex-col items-center gap-1"
            onClick={() => onGenerate("global")}
            disabled={!canGenerateGlobal}
          >
            {isGenerating && generatingType === "global" ? (
              <>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-semibold">Génération en cours... (60–120 sec)</span>
                </div>
                <span className="text-xs opacity-80">
                  L'IA analyse vos données et génère 9 recommandations
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">Générer toutes les recommandations</span>
                </div>
                <span className="text-xs opacity-80">
                  3 Ads + 3 Offres + 3 Emails · utilise 9 crédits
                  {displayRemaining < 9 && displayRemaining > 0 && (
                    <> · <span className="font-semibold">Il vous reste {displayRemaining} crédit{displayRemaining !== 1 ? "s" : ""} (insuffisant)</span></>
                  )}
                </span>
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
