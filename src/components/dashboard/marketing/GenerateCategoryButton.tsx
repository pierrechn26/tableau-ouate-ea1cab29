import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerationType, QuotaData } from "@/hooks/useMarketingRecommendations";
import { cn } from "@/lib/utils";

interface Props {
  type: Exclude<GenerationType, "global">;
  label: string;
  icon: React.ReactNode;
  quota: QuotaData;
  isGenerating: boolean;
  generatingType: GenerationType | null;
  onGenerate: (type: GenerationType) => void;
}

export function GenerateCategoryButton({
  type,
  label,
  icon,
  quota,
  isGenerating,
  generatingType,
  onGenerate,
}: Props) {
  const { remaining } = quota;
  const canGenerate = remaining >= 3 && !isGenerating;
  const isThisGenerating = isGenerating && generatingType === type;

  return (
    <Button
      variant="outline"
      className={cn(
        "w-full h-auto py-2.5 px-4 flex flex-col items-center gap-0.5",
        "border-2 border-dashed hover:border-solid hover:border-primary/60 transition-all"
      )}
      onClick={() => onGenerate(type)}
      disabled={!canGenerate}
    >
      {isThisGenerating ? (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Génération en cours...
          </div>
          <span className="text-[11px] text-muted-foreground">
            ~60–120 secondes
          </span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {icon}
            {label}
          </div>
          <span className={cn(
            "text-[11px]",
            remaining < 3 ? "text-destructive/80" : "text-muted-foreground"
          )}>
            Utilise 3 crédits
            {remaining < 3 && <> · {remaining} crédit{remaining !== 1 ? "s" : ""} restant{remaining !== 1 ? "s" : ""}</>}
          </span>
        </>
      )}
    </Button>
  );
}
