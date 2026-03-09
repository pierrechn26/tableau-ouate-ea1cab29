import { Megaphone } from "lucide-react";
import { AdsRecommendationCard } from "./AdsRecommendationCard";
import { LegacyAds, safeString } from "./legacy/LegacyRecommendations";

interface Props {
  adsData: any;
  isV2: boolean;
  campaignsData?: any[];
}

export function MarketingAdsTab({ adsData, isV2, campaignsData = [] }: Props) {
  const isV2Mode = isV2 && adsData._v2 && Array.isArray(adsData.items) && adsData.items.length > 0;
  const items: any[] = isV2Mode ? adsData.items : [];

  if (isV2Mode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold text-foreground font-heading">
            Recommandations Ads
            <span className="text-sm font-normal text-muted-foreground ml-2">
              · {items.length} recommandation{items.length !== 1 ? "s" : ""}
            </span>
          </h3>
        </div>
        <div className="space-y-3">
          {items.map((ad: any, idx: number) => (
            <AdsRecommendationCard
              key={ad.id ?? idx}
              ad={ad}
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
        <Megaphone className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground font-heading">Ads (Meta / TikTok)</h3>
      </div>
      <LegacyAds ads={adsData} />
    </div>
  );
}
