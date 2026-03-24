import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerationType, GenerationStep, QuotaData } from "@/hooks/useMarketingRecommendations";
import { GenerationProgressLoader } from "./GenerationProgressLoader";
import { cn } from "@/lib/utils";
import { type UsageLimits } from "@/hooks/useUsageLimits";

interface Props {
  type: Exclude<GenerationType, "global">;
  label: string;
  icon: React.ReactNode;
  quota: QuotaData;
  isGenerating: boolean;
  generatingType: GenerationType | null;
  generationStep: GenerationStep;
  onGenerate: (type: GenerationType) => void;
  /** If true, renders the single-reco secondary button variant */
  singleType?: GenerationType;
  usageLimits?: UsageLimits;
}

export function GenerateCategoryButton({
  type,
  label,
  icon,
  quota,
  isGenerating,
  generatingType,
  generationStep,
  onGenerate,
  singleType,
  usageLimits,
}: Props) {
  const primaryType = type;
  const secondaryType = singleType;

  // Prefer live usageLimits for remaining calculation
  const remaining = usageLimits?.recos.remaining ?? quota.remaining;
  const isLimitReached = usageLimits?.recos.isExceeded ?? remaining <= 0;

  const isPrimaryGenerating = isGenerating && generatingType === primaryType;
  const isSecondaryGenerating = isGenerating && generatingType === secondaryType;
  const isAnyThisTabGenerating = isPrimaryGenerating || isSecondaryGenerating;

  if (isAnyThisTabGenerating) {
    return <GenerationProgressLoader generationStep={generationStep} generatingType={generatingType} />;
  }

  const canGenerate3 = remaining >= 3 && !isGenerating && !isLimitReached;
  const canGenerate1 = remaining >= 1 && !isGenerating && !isLimitReached;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Primary button: generate 3 */}
      <Button
        variant="outline"
        className={cn(
          "w-full h-auto py-2.5 px-4 flex flex-col items-center gap-0.5",
          "border-2 border-dashed hover:border-solid hover:border-primary/60 transition-all",
          isLimitReached && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => onGenerate(primaryType)}
        disabled={!canGenerate3}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {label}
        </div>
        <span className={cn(
          "text-[11px]",
          isLimitReached ? "text-destructive/80" : remaining < 3 ? "text-destructive/80" : "text-muted-foreground"
        )}>
          {isLimitReached
            ? "Limite mensuelle atteinte"
            : <>
                Utilise 3 crédits
                {remaining < 3 && <> · {remaining} crédit{remaining !== 1 ? "s" : ""} restant{remaining !== 1 ? "s" : ""}</>}
              </>
          }
        </span>
      </Button>

      {/* Secondary button: generate 1 */}
      {secondaryType && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full h-auto py-1.5 px-3 text-xs text-muted-foreground",
            "border border-dashed border-border/60 hover:border-primary/40 hover:text-foreground transition-all",
            isLimitReached && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => onGenerate(secondaryType)}
          disabled={!canGenerate1}
        >
          <Sparkles className="w-3 h-3 mr-1.5 shrink-0" />
          Générer 1 recommandation · 1 crédit
        </Button>
      )}
    </div>
  );
}
