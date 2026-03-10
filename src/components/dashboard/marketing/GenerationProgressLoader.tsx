import { Check, Loader2, Search, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenerationStep, GenerationType } from "@/hooks/useMarketingRecommendations";

interface Step {
  id: GenerationStep;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    id: "prepare",
    label: "Analyse de vos données et recherche marché...",
    sublabel: "Étape 1/3 · ~30 secondes",
    Icon: Search,
  },
  {
    id: "analyze",
    label: "Analyse approfondie des tendances et opportunités...",
    sublabel: "Étape 2/3 · ~50 secondes",
    Icon: Brain,
  },
  {
    id: "generate",
    label: "Rédaction de vos recommandations personnalisées...",
    sublabel: "Étape 3/3 · ~40 secondes",
    Icon: Sparkles,
  },
];

const stepIndex = (step: GenerationStep): number =>
  STEPS.findIndex((s) => s.id === step);

interface Props {
  generationStep: GenerationStep;
  generatingType: GenerationType | null;
}

export function GenerationProgressLoader({ generationStep, generatingType }: Props) {
  const currentIdx = stepIndex(generationStep);

  const typeLabel =
    generatingType === "global" ? "toutes les recommandations" :
    generatingType === "ads" ? "Ads" :
    generatingType === "offers" ? "Offres" :
    generatingType === "emails" ? "Emails" : "";

  return (
    <div className="w-full rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <p className="text-sm font-semibold text-foreground">
        Génération en cours — {typeLabel}
      </p>

      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all",
                isActive && "bg-primary/8 border border-primary/20",
                isDone && "opacity-70",
                isPending && "opacity-40"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isDone && "bg-emerald-500/15 text-emerald-600",
                  isActive && "bg-primary/15 text-primary",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isActive ? (
                  <step.Icon className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <step.Icon className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    isDone && "text-emerald-600",
                    isActive && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {isDone ? step.label.replace("...", " ✓").replace(" ✓", "") : step.label}
                </p>
                <p
                  className={cn(
                    "text-[11px] mt-0.5",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}
                >
                  {step.sublabel}
                </p>
                {/* Indeterminate progress bar for active step */}
                {isActive && (
                  <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-primary/20">
                    <div className="h-full bg-primary animate-[shimmer_1.5s_ease-in-out_infinite] w-1/3 rounded-full" />
                  </div>
                )}
              </div>

              {/* Spinner for active */}
              {isActive && (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary mt-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
