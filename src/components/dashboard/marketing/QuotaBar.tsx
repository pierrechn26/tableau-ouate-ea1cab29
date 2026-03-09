import { motion } from "framer-motion";
import { Sparkles, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GenerationType, QuotaData } from "@/hooks/useMarketingRecommendations";
import { cn } from "@/lib/utils";

interface Props {
  quota: QuotaData;
  isGenerating: boolean;
  generatingType: GenerationType | null;
  onGenerate: (type: GenerationType) => void;
}

export function QuotaBar({ quota, isGenerating, generatingType, onGenerate }: Props) {
  const { total_generated, monthly_limit, remaining } = quota;
  const pct = monthly_limit > 0 ? (total_generated / monthly_limit) * 100 : 0;
  const isLimitReached = remaining <= 0;
  const canGenerateGlobal = remaining >= 9 && !isGenerating;

  const barColor =
    pct > 85
      ? "from-red-500 to-red-400"
      : pct > 60
      ? "from-orange-500 to-amber-400"
      : "from-primary to-accent";

  const textColor =
    pct > 85 ? "text-red-500" : pct > 60 ? "text-orange-500" : "text-primary";

  return (
    <div className="space-y-4">
      {/* Quota display */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              Recommandations utilisées ce mois
            </span>
            <span className={cn("font-bold tabular-nums", textColor)}>
              {total_generated} / {monthly_limit}
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
            <span>
              {isLimitReached
                ? "Limite atteinte"
                : `${remaining} recommandation${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""}`}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 capitalize font-medium"
            >
              Plan {quota.plan}
            </Badge>
          </div>
        </div>
      </div>

      {/* Generate all button */}
      {isLimitReached ? (
        <div className="rounded-xl border-2 border-dashed border-border p-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Vous avez atteint votre limite de{" "}
            <span className="font-semibold">{monthly_limit} recommandations</span> ce mois.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => {}}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Découvrir le plan Growth →
          </Button>
        </div>
      ) : (
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
                {remaining < 9 && remaining > 0 && (
                  <> · <span className="font-semibold">Il vous reste {remaining} crédit{remaining !== 1 ? "s" : ""} (insuffisant)</span></>
                )}
              </span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
