import { Check, Loader2, Megaphone, Gift, Mail, Sparkles, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenerationStep, GenerationType } from "@/hooks/useMarketingRecommendations";

interface Step {
  id: GenerationStep;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
}

// ── 4 étapes pour le mode global ─────────────────────────────────────
const STEPS_GLOBAL: Step[] = [
  {
    id: "generate_ads",
    label: "Génération des recommandations Ads...",
    sublabel: "Étape 1/4 · ~30 secondes",
    Icon: Megaphone,
  },
  {
    id: "generate_offers",
    label: "Génération des recommandations Offres...",
    sublabel: "Étape 2/4 · ~30 secondes",
    Icon: Gift,
  },
  {
    id: "generate_emails",
    label: "Génération des recommandations Emails...",
    sublabel: "Étape 3/4 · ~30 secondes",
    Icon: Mail,
  },
  {
    id: "finalize",
    label: "Orchestration des campagnes et checklist...",
    sublabel: "Étape 4/4 · ~15 secondes",
    Icon: LayoutGrid,
  },
];

// ── 1 étape pour catégorie ou single ──────────────────────────────────
const STEP_SINGLE: Step = {
  id: "generate",
  label: "Génération de votre recommandation...",
  sublabel: "~15 secondes",
  Icon: Sparkles,
};

const STEP_CATEGORY: Step = {
  id: "generate",
  label: "Génération de vos recommandations...",
  sublabel: "~30 secondes",
  Icon: Sparkles,
};

function stepIndex(step: GenerationStep, steps: Step[]): number {
  return steps.findIndex((s) => s.id === step);
}

function typeLabelFor(t: GenerationType | null): string {
  if (!t) return "";
  if (t === "global") return "toutes les recommandations";
  if (t === "ads") return "Ads (×3)";
  if (t === "offers") return "Offres (×3)";
  if (t === "emails") return "Emails (×3)";
  if (t === "single_ad") return "1 recommandation Ads";
  if (t === "single_offer") return "1 recommandation Offre";
  if (t === "single_email") return "1 recommandation Email";
  return "";
}

interface Props {
  generationStep: GenerationStep;
  generatingType: GenerationType | null;
}

export function GenerationProgressLoader({ generationStep, generatingType }: Props) {
  const isGlobal = generatingType === "global";
  const isSingle = generatingType?.startsWith("single_") ?? false;

  let steps: Step[];
  if (isGlobal) {
    steps = STEPS_GLOBAL;
  } else if (isSingle) {
    steps = [STEP_SINGLE];
  } else {
    steps = [STEP_CATEGORY];
  }

  const currentIdx = stepIndex(generationStep, steps);

  return (
    <div className="w-full rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <p className="text-sm font-semibold text-foreground">
        Génération en cours — {typeLabelFor(generatingType)}
      </p>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div
              key={step.id ?? idx}
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
                  {isDone ? step.label.replace("...", " ✓") : step.label}
                </p>
                <p
                  className={cn(
                    "text-[11px] mt-0.5",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}
                >
                  {step.sublabel}
                </p>
                {isActive && (
                  <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-primary/20">
                    <div className="h-full bg-primary animate-[shimmer_1.5s_ease-in-out_infinite] w-1/3 rounded-full" />
                  </div>
                )}
              </div>

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
