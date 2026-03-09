import { Mail } from "lucide-react";
import { EmailsRecommendationCard } from "./EmailsRecommendationCard";
import { LegacyEmail, safeString } from "./legacy/LegacyRecommendations";

interface Props {
  emailsData: any;
  isV2: boolean;
  campaignsData?: any[];
}

export function MarketingEmailsTab({ emailsData, isV2, campaignsData = [] }: Props) {
  const isV2Mode =
    isV2 && emailsData._v2 && Array.isArray(emailsData.items) && emailsData.items.length > 0;
  const items: any[] = isV2Mode ? emailsData.items : [];

  if (isV2Mode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-secondary" />
          <h3 className="text-xl font-bold text-foreground font-heading">
            Recommandations Emailing
            <span className="text-sm font-normal text-muted-foreground ml-2">
              · {items.length} recommandation{items.length !== 1 ? "s" : ""}
            </span>
          </h3>
        </div>
        <div className="space-y-3">
          {items.map((item: any, idx: number) => (
            <EmailsRecommendationCard
              key={item.id ?? idx}
              email={item}
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
        <Mail className="w-5 h-5 text-secondary" />
        <h3 className="text-xl font-bold text-foreground font-heading">Email Marketing</h3>
      </div>
      <LegacyEmail email={emailsData} />
    </div>
  );
}
