import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  LayoutGrid,
  Megaphone,
  Gift,
  Mail,
} from "lucide-react";
import { format, parseISO, nextMonday, isMonday, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useMarketingRecommendations } from "@/hooks/useMarketingRecommendations";
import { MarketingOverviewTab } from "./MarketingOverviewTab";
import { MarketingAdsTab } from "./MarketingAdsTab";
import { MarketingOffersTab } from "./MarketingOffersTab";
import { MarketingEmailsTab } from "./MarketingEmailsTab";

// ── Date helpers ─────────────────────────────────────────────────────

function formatWeekStart(dateStr: string) {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

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
    data,
    isLoading,
    isGenerating,
    isOutdated,
    generateRecommendations,
    updateChecklistItem,
    isV2,
    adsData,
    offersData,
    emailsData,
    campaignsData,
  } = useMarketingRecommendations();

  const [weeklyUpdateDone, setWeeklyUpdateDone] = useState(false);
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Compute next Monday
  const nextMondayDate = useMemo(() => {
    const now = new Date();
    if (isMonday(now)) {
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      return startOfDay(next);
    }
    return startOfDay(nextMonday(now));
  }, []);

  // Auto-generate logic (preserved from original)
  useEffect(() => {
    if (isLoading || isGenerating || autoGenerateTriggered) return;

    if (!data) {
      setAutoGenerateTriggered(true);
      generateRecommendations();
      return;
    }

    const weekStart = new Date(data.week_start);
    const now = new Date();
    const diffDays = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= 7) {
      setAutoGenerateTriggered(true);
      generateRecommendations();
    }
  }, [isLoading, data, isGenerating, autoGenerateTriggered, generateRecommendations]);

  // ── Loading states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Chargement des recommandations...</span>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">Génération en cours... (~2 min)</p>
        <p className="text-sm text-muted-foreground">
          L'IA analyse vos données personas et génère des recommandations personnalisées
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Sparkles className="w-12 h-12 text-primary/40" />
        <p className="text-lg font-medium text-foreground">Aucune recommandation générée</p>
        <Button onClick={generateRecommendations} disabled={isGenerating}>
          <Sparkles className="w-4 h-4 mr-2" />
          Générer les premières recommandations
        </Button>
      </div>
    );
  }

  const checklist = (data.checklist || []) as any[];

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading mb-2">Marketing IA Hub</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Recommandations de la semaine du {formatWeekStart(data.week_start)}
            {data.generated_at && (
              <span className="ml-1">— Générées le {formatGeneratedAt(data.generated_at)}</span>
            )}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" />
              Prochaine mise à jour : lundi {format(nextMondayDate, "d MMMM yyyy", { locale: fr })} à 08h00
            </p>
            {isOutdated && !weeklyUpdateDone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setWeeklyUpdateDone(true);
                  generateRecommendations();
                }}
                disabled={isGenerating}
                className="text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${isGenerating ? "animate-spin" : ""}`} />
                Mettre à jour
              </Button>
            )}
          </div>
        </div>
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
            checklist={checklist}
            campaignsData={campaignsData}
            updateChecklistItem={updateChecklistItem}
          />
        </TabsContent>

        <TabsContent value="ads" className="mt-0">
          <MarketingAdsTab adsData={adsData} isV2={isV2} campaignsData={campaignsData} />
        </TabsContent>

        <TabsContent value="offers" className="mt-0">
          <MarketingOffersTab offersData={offersData} isV2={isV2} campaignsData={campaignsData} />
        </TabsContent>

        <TabsContent value="emails" className="mt-0">
          <MarketingEmailsTab emailsData={emailsData} isV2={isV2} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
