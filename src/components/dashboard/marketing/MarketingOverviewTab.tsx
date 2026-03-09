import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Zap,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { CampaignCard } from "./CampaignCard";
import { PersonaBadges } from "./shared/PersonaBadge";
import { renderChecklistDetail, safeString } from "./legacy/LegacyRecommendations";

// Animated counter hook
function useAnimatedCounter(value: number, duration: number = 400) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      setDisplayValue(Math.round(currentValue));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    previousValue.current = value;
  }, [value, duration]);

  return displayValue;
}

interface Props {
  checklist: any[];
  campaignsData: any[];
  updateChecklistItem: (id: string, completed: boolean) => void;
}

export function MarketingOverviewTab({ checklist, campaignsData, updateChecklistItem }: Props) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;
  const animatedProgress = useAnimatedCounter(Math.round(progress), 500);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Campagnes ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold text-foreground font-heading">Campagnes de la semaine</h3>
        </div>

        {campaignsData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground bg-muted/20">
            Les campagnes orchestrées seront disponibles avec la prochaine génération.
          </div>
        ) : (
          <div className="space-y-3">
            {campaignsData.map((c: any, idx: number) => (
              <CampaignCard key={c.id ?? idx} campaign={c} />
            ))}
          </div>
        )}
      </div>

      {/* ── Checklist ─────────────────────────────────────────────── */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-card to-accent/5 border-2 border-primary/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground font-heading">Checklist hebdomadaire</h3>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{checklist.length} actions complétées
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-primary">{animatedProgress}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
            />
          </div>
          {progress === 100 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-primary mt-3 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Bravo ! Vous avez complété toutes les recommandations marketing de la semaine 🎉
            </motion.p>
          )}
        </div>

        <div className="space-y-3">
          {checklist.map((action: any) => (
            <Collapsible
              key={action.id}
              open={expandedItems.includes(action.id)}
              onOpenChange={() => toggleExpanded(action.id)}
            >
              <div
                className={`rounded-xl border-2 transition-all duration-200 ${
                  action.completed
                    ? "bg-primary/10 border-primary/40"
                    : "bg-background border-border hover:border-primary/40 hover:shadow-md"
                }`}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-4 cursor-pointer">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={action.completed}
                        onCheckedChange={() => updateChecklistItem(action.id, !action.completed)}
                        className="h-5 w-5"
                      />
                    </div>
                    <span
                      className={`flex-1 text-sm font-medium ${
                        action.completed ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {action.category && (
                        <span className="font-bold mr-1.5">
                          {action.category === "ads" ? "Ads" : action.category === "email" ? "E-mail" : action.category === "offers" ? "Offre" : ""}
                          {" · "}
                        </span>
                      )}
                      {safeString(action.title)}
                      {action.reconduite && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] px-1.5 py-0 h-5 font-bold bg-orange-500/15 text-orange-600 border-orange-500/30"
                        >
                          <RotateCcw className="w-3 h-3 mr-0.5" />
                          Reconduite
                        </Badge>
                      )}
                      <PersonaBadges personas={action.personas} />
                    </span>
                    <div className="flex items-center gap-2 text-primary">
                      <span className="text-xs font-medium">Voir le détail</span>
                      {expandedItems.includes(action.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 pt-0"
                    >
                      <div className="pl-8 space-y-4 border-t border-border/50 pt-4 mt-1">
                        {renderChecklistDetail(action.detail, action.category)}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </Card>
    </div>
  );
}
