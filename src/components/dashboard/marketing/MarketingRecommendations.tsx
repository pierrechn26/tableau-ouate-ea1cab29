import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  LayoutGrid,
  Megaphone,
  Gift,
  Mail,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useMarketingRecommendations } from "@/hooks/useMarketingRecommendations";
import { MarketingOverviewTab } from "./MarketingOverviewTab";
import { MarketingAdsTab } from "./MarketingAdsTab";
import { MarketingOffersTab } from "./MarketingOffersTab";
import { MarketingEmailsTab } from "./MarketingEmailsTab";
import { QuotaBar } from "./QuotaBar";

// ── Date helpers ─────────────────────────────────────────────────────
function formatGeneratedAt(dateStr: string | null) {
  if (!dateStr) return "";
  try {
    const utcDate = parseISO(dateStr);
    const parisStr = utcDate.toLocaleString("sv-SE", { timeZone: "Europe/Paris" });
    const parisDate = new Date(parisStr.replace(" ", "T"));
    return format(parisDate, "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return dateStr;
  }
}

// ── Component ────────────────────────────────────────────────────────

export function MarketingRecommendations() {
  const {
    allRecommendations,
    latestRec,
    quota,
    isLoading,
    isGenerating,
    generatingType,
    generationStep,
    generateByCategory,
    updateChecklistItem,
    isV2,
    adsData,
    offersData,
    emailsData,
    campaignsData,
    latestChecklist,
  } = useMarketingRecommendations();

  const [activeTab, setActiveTab] = useState("overview");

  // ── Loading state ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Chargement des recommandations...</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading mb-2">Marketing IA Hub</h2>
        {latestRec?.generated_at && (
          <p className="text-xs text-muted-foreground">
            Dernière génération : {formatGeneratedAt(latestRec.generated_at)}
            {" · "}
            {allRecommendations.length} série{allRecommendations.length !== 1 ? "s" : ""} de recommandations
          </p>
        )}
      </div>

      {/* ── 4-tab navigation ─────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-auto w-full items-center justify-between gap-2 rounded-lg bg-muted/30 p-1.5">
          <TabsTrigger value="overview" className="flex-1">
            <LayoutGrid className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex-1">
            <Megaphone className="w-4 h-4" />
            Ads
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex-1">
            <Gift className="w-4 h-4" />
            Offres & Bundles
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex-1">
            <Mail className="w-4 h-4" />
            Emailing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <MarketingOverviewTab
            checklist={latestChecklist}
            campaignsData={campaignsData}
            updateChecklistItem={updateChecklistItem}
            quota={quota}
            isGenerating={isGenerating}
            generatingType={generatingType}
            onGenerate={generateByCategory}
            allRecommendations={allRecommendations}
          />
        </TabsContent>

        <TabsContent value="ads" className="mt-0">
          <MarketingAdsTab
            adsData={adsData}
            isV2={isV2}
            campaignsData={campaignsData}
            quota={quota}
            isGenerating={isGenerating}
            generatingType={generatingType}
            generationStep={generationStep}
            onGenerate={generateByCategory}
          />
        </TabsContent>

        <TabsContent value="offers" className="mt-0">
          <MarketingOffersTab
            offersData={offersData}
            isV2={isV2}
            campaignsData={campaignsData}
            quota={quota}
            isGenerating={isGenerating}
            generatingType={generatingType}
            generationStep={generationStep}
            onGenerate={generateByCategory}
          />
        </TabsContent>

        <TabsContent value="emails" className="mt-0">
          <MarketingEmailsTab
            emailsData={emailsData}
            isV2={isV2}
            campaignsData={campaignsData}
            quota={quota}
            isGenerating={isGenerating}
            generatingType={generatingType}
            generationStep={generationStep}
            onGenerate={generateByCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
