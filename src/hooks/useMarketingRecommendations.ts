import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QuotaData {
  total_generated: number;
  monthly_limit: number;
  remaining: number;
  plan: string;
  generations_log: {
    timestamp: string;
    type: "global" | "ads" | "offers" | "emails";
    count: number;
    recommendation_id: string;
  }[];
}

export interface MarketingRecommendationData {
  id: string;
  week_start: string;
  generated_at: string | null;
  persona_focus: any;
  checklist: any[];
  ads_recommendations: any;
  email_recommendations: any;
  offers_recommendations: any;
  sources_consulted: any;
  status: string | null;
  generation_type: string | null;
  generated_categories: string[] | null;
  // V2 columns
  ads_v2: any[];
  offers_v2: any[];
  emails_v2: any[];
  campaigns_overview: any[];
  recommendation_version: number;
  generation_config: any;
}

export type GenerationType = "global" | "ads" | "offers" | "emails";

export function useMarketingRecommendations() {
  const [allRecommendations, setAllRecommendations] = useState<MarketingRecommendationData[]>([]);
  const [quota, setQuota] = useState<QuotaData>({
    total_generated: 0,
    monthly_limit: 36,
    remaining: 36,
    plan: "starter",
    generations_log: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<GenerationType | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "generate-marketing-recommendations",
        { method: "GET" }
      );
      if (error) throw error;

      if (result?.recommendations) {
        setAllRecommendations(result.recommendations);
      } else {
        setAllRecommendations([]);
      }

      if (result?.quota) {
        setQuota(result.quota);
      }
    } catch (err) {
      console.error("Erreur fetch recommandations:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les recommandations marketing.",
        variant: "destructive",
      });
      setAllRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const generateByCategory = useCallback(async (type: GenerationType) => {
    setGeneratingType(type);
    setQuotaExceeded(false);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "generate-marketing-recommendations",
        {
          method: "POST",
          body: { type },
        }
      );

      if (error) throw error;

      if (result?.error === "quota_exceeded") {
        setQuotaExceeded(true);
        setQuota((prev) => ({
          ...prev,
          remaining: result.remaining ?? 0,
          total_generated: result.current ?? prev.total_generated,
        }));
        toast({
          title: "Quota atteint",
          description: `Vous avez utilisé ${result.current}/${result.limit} recommandations ce mois.`,
          variant: "destructive",
        });
        return;
      }

      if (result?.recommendations) {
        setAllRecommendations(result.recommendations);
      }
      if (result?.quota) {
        setQuota(result.quota);
      }

      const typeLabel = type === "global" ? "toutes les recommandations" :
        type === "ads" ? "les recommandations Ads" :
        type === "offers" ? "les recommandations Offres" :
        "les recommandations Emails";

      toast({
        title: "Recommandations générées",
        description: `Nouvelles ${typeLabel} prêtes.`,
      });
    } catch (err: any) {
      console.error("Erreur génération recommandations:", err);
      toast({
        title: "Erreur de génération",
        description: err?.message || "La génération a échoué. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setGeneratingType(null);
    }
  }, [toast]);

  const updateChecklistItem = useCallback(
    async (recId: string, taskId: string, completed: boolean) => {
      const rec = allRecommendations.find((r) => r.id === recId);
      if (!rec) return;

      const newChecklist = (rec.checklist || []).map((item: any) =>
        item.id === taskId ? { ...item, completed } : item
      );

      setAllRecommendations((prev) =>
        prev.map((r) => r.id === recId ? { ...r, checklist: newChecklist } : r)
      );

      try {
        const { error } = await supabase
          .from("marketing_recommendations")
          .update({ checklist: newChecklist as any })
          .eq("id", recId);
        if (error) throw error;
      } catch (err) {
        console.error("Erreur update checklist:", err);
        setAllRecommendations((prev) =>
          prev.map((r) => r.id === recId ? { ...r, checklist: rec.checklist } : r)
        );
      }
    },
    [allRecommendations]
  );

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // ── Aggregated V2 data from all recommendations ──────────────────
  const isGenerating = generatingType !== null;

  // Flatten all ads_v2, offers_v2, emails_v2 across all recommendations
  // Most recent first (recommendations are already sorted DESC)
  const allAdsV2 = allRecommendations.flatMap((r) =>
    Array.isArray(r.ads_v2) && r.ads_v2.length > 0
      ? r.ads_v2.map((ad: any) => ({ ...ad, _generated_at: r.generated_at, _rec_id: r.id }))
      : []
  );
  const allOffersV2 = allRecommendations.flatMap((r) =>
    Array.isArray(r.offers_v2) && r.offers_v2.length > 0
      ? r.offers_v2.map((offer: any) => ({ ...offer, _generated_at: r.generated_at, _rec_id: r.id }))
      : []
  );
  const allEmailsV2 = allRecommendations.flatMap((r) =>
    Array.isArray(r.emails_v2) && r.emails_v2.length > 0
      ? r.emails_v2.map((email: any) => ({ ...email, _generated_at: r.generated_at, _rec_id: r.id }))
      : []
  );

  // Latest recommendation for campaigns, checklist, persona_focus
  const latestRec = allRecommendations[0] || null;
  const campaignsData = Array.isArray(latestRec?.campaigns_overview) ? latestRec.campaigns_overview : [];

  // Check if any V2 data exists
  const isV2 = allAdsV2.length > 0 || allOffersV2.length > 0 || allEmailsV2.length > 0;

  // V1 fallback from latest rec
  const adsData = allAdsV2.length > 0
    ? { _v2: true, items: allAdsV2 }
    : { _v2: false, ...(latestRec?.ads_recommendations || {}) };
  const offersData = allOffersV2.length > 0
    ? { _v2: true, items: allOffersV2 }
    : { _v2: false, ...(latestRec?.offers_recommendations || {}) };
  const emailsData = allEmailsV2.length > 0
    ? { _v2: true, items: allEmailsV2 }
    : { _v2: false, ...(latestRec?.email_recommendations || {}) };

  // Latest checklist
  const latestChecklist = (latestRec?.checklist || []) as any[];
  const latestChecklistRecId = latestRec?.id || null;

  return {
    // Core data
    allRecommendations,
    latestRec,
    quota,
    isLoading,
    isGenerating,
    generatingType,
    quotaExceeded,
    // Actions
    generateByCategory,
    updateChecklistItem: (taskId: string, completed: boolean) => {
      if (!latestChecklistRecId) return;
      updateChecklistItem(latestChecklistRecId, taskId, completed);
    },
    refetch: fetchRecommendations,
    // Aggregated V2 data
    isV2,
    adsData,
    offersData,
    emailsData,
    campaignsData,
    latestChecklist,
    generationConfig: latestRec?.generation_config ?? {},
  };
}
