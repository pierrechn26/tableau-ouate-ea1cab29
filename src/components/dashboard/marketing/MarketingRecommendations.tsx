import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  LayoutGrid,
  Megaphone,
  Gift,
  Mail,
} from "lucide-react";
import { useMarketingRecommendations } from "@/hooks/useMarketingRecommendations";
import { MarketingAdsTab } from "./MarketingAdsTab";
import { MarketingOffersTab } from "./MarketingOffersTab";
import { MarketingEmailsTab } from "./MarketingEmailsTab";
import { Badge } from "@/components/ui/badge";

export function MarketingRecommendations() {
  const {
    recommendations,
    stats,
    loading,
    generateContent,
    updateStatus,
  } = useMarketingRecommendations();

  const [activeTab, setActiveTab] = useState("overview");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Chargement des recommandations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading mb-2">Marketing IA Hub</h2>
        {stats.total > 0 && (
          <p className="text-xs text-muted-foreground">
            {stats.total} recommandation{stats.total !== 1 ? "s" : ""} cette semaine
            {stats.pending > 0 && <> · <span className="text-primary font-medium">{stats.pending} à découvrir</span></>}
            {stats.done > 0 && <> · {stats.done} terminée{stats.done !== 1 ? "s" : ""}</>}
          </p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-auto w-full items-center justify-between gap-2 rounded-lg bg-muted/30 p-1.5">
          <TabsTrigger value="overview" className="flex-1">
            <LayoutGrid className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex-1 gap-1">
            <Megaphone className="w-4 h-4" />
            Ads
            {recommendations.ads.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{recommendations.ads.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex-1 gap-1">
            <Gift className="w-4 h-4" />
            Offres
            {recommendations.offers.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{recommendations.offers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex-1 gap-1">
            <Mail className="w-4 h-4" />
            Emailing
            {recommendations.emails.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{recommendations.emails.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Vue d'ensemble — Refonte en cours (étape 3)</p>
          </div>
        </TabsContent>

        <TabsContent value="ads" className="mt-0">
          <MarketingAdsTab
            recommendations={recommendations.ads}
            onGenerateContent={generateContent}
            onStatusChange={updateStatus}
          />
        </TabsContent>

        <TabsContent value="offers" className="mt-0">
          <MarketingOffersTab
            recommendations={recommendations.offers}
            onGenerateContent={generateContent}
            onStatusChange={updateStatus}
          />
        </TabsContent>

        <TabsContent value="emails" className="mt-0">
          <MarketingEmailsTab
            recommendations={recommendations.emails}
            onGenerateContent={generateContent}
            onStatusChange={updateStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
