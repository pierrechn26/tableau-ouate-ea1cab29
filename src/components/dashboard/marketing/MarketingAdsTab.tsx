import { Megaphone } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import { type Recommendation } from "@/hooks/useMarketingRecommendations";

interface Props {
  recommendations: Recommendation[];
  onGenerateContent: (id: string) => void;
  onStatusChange: (id: string, status: "todo" | "in_progress" | "done") => void;
}

export function MarketingAdsTab({ recommendations, onGenerateContent, onStatusChange }: Props) {
  const allDone = recommendations.length > 0 && recommendations.every((r) => r.action_status === "done");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground font-heading">Recommandations Ads</h3>
        <span className="text-sm text-muted-foreground ml-1">
          · {recommendations.length} recommandation{recommendations.length !== 1 ? "s" : ""} cette semaine
        </span>
      </div>

      {allDone && (
        <p className="text-sm text-primary font-medium">✓ Toutes les recommandations de la semaine sont terminées</p>
      )}

      {recommendations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aucune recommandation Ads cette semaine. Les recommandations sont générées automatiquement chaque lundi.
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onGenerateContent={onGenerateContent}
              onStatusChange={onStatusChange}
              category="ads"
            />
          ))}
        </div>
      )}
    </div>
  );
}
