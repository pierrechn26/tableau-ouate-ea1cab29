import { Gift } from "lucide-react";
import { OffersRecommendationCard } from "./OffersRecommendationCard";
import { LegacyOffers } from "./legacy/LegacyRecommendations";

interface Props {
  offersData: any;
  isV2: boolean;
  campaignsData?: any[];
}

export function MarketingOffersTab({ offersData, isV2, campaignsData = [] }: Props) {
  const isV2Mode =
    isV2 && offersData._v2 && Array.isArray(offersData.items) && offersData.items.length > 0;
  const items: any[] = isV2Mode ? offersData.items : [];

  if (isV2Mode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-foreground" />
          <h3 className="text-xl font-bold text-foreground font-heading">
            Recommandations Offres & Bundles
            <span className="text-sm font-normal text-muted-foreground ml-2">
              · {items.length} recommandation{items.length !== 1 ? "s" : ""}
            </span>
          </h3>
        </div>
        <div className="space-y-3">
          {items.map((item: any, idx: number) => (
            <OffersRecommendationCard
              key={item.id ?? idx}
              offer={item}
              campaignsData={campaignsData}
            />
          ))}
        </div>
      </div>
    );
  }

  // V1 fallback
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-5 h-5 text-foreground" />
        <h3 className="text-xl font-bold text-foreground font-heading">Offres & Bundles</h3>
      </div>
      <LegacyOffers offers={offersData} />
    </div>
  );
}
