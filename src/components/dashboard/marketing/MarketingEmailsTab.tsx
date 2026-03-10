import { Mail } from "lucide-react";
import { EmailsRecommendationCard } from "./EmailsRecommendationCard";
import { LegacyEmail } from "./legacy/LegacyRecommendations";
import { GenerateCategoryButton } from "./GenerateCategoryButton";
import { GenerationType, GenerationStep, QuotaData } from "@/hooks/useMarketingRecommendations";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Props {
  emailsData: any;
  isV2: boolean;
  campaignsData?: any[];
  quota: QuotaData;
  isGenerating: boolean;
  generatingType: GenerationType | null;
  generationStep: GenerationStep;
  onGenerate: (type: GenerationType) => void;
}

function isNew(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

function groupByDate(items: any[]): { date: string; items: any[] }[] {
  const map = new Map<string, any[]>();
  for (const item of items) {
    const date = item._generated_at || "unknown";
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(item);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return dateStr;
  }
}

export function MarketingEmailsTab({ emailsData, isV2, campaignsData = [], quota, isGenerating, generatingType, generationStep, onGenerate }: Props) {
  const isV2Mode = isV2 && emailsData._v2 && Array.isArray(emailsData.items) && emailsData.items.length > 0;
  const items: any[] = isV2Mode ? emailsData.items : [];
  const groups = groupByDate(items);

  return (
    <div className="space-y-5">
      {/* Header + generate button */}
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-secondary" />
          <h3 className="text-xl font-bold text-foreground font-heading">
            Recommandations Emailing
            {items.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                · {items.length} recommandation{items.length !== 1 ? "s" : ""}
              </span>
            )}
          </h3>
        </div>
        <div className="w-64 shrink-0">
          <GenerateCategoryButton
            type="emails"
            label="Générer 3 recommandations Emails"
            icon={<Mail className="w-3.5 h-3.5" />}
            quota={quota}
            isGenerating={isGenerating}
            generatingType={generatingType}
            generationStep={generationStep}
            onGenerate={onGenerate}
            singleType="single_email"
          />
        </div>
      </div>

      {isV2Mode ? (
        <div className="space-y-6">
          {groups.map(({ date, items: groupItems }) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>Générées le {formatDate(date)}</span>
                {isNew(date) && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/30 border">Nouveau</Badge>}
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {groupItems.map((item: any, idx: number) => (
                  <EmailsRecommendationCard key={item.id ?? idx} email={item} campaignsData={campaignsData} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <LegacyEmail email={emailsData} />
      )}
    </div>
  );
}
