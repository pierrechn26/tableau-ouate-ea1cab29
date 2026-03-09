import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  // V2 columns
  ads_v2: any[];
  offers_v2: any[];
  emails_v2: any[];
  campaigns_overview: any[];
  recommendation_version: number;
  generation_config: any;
}

export function useMarketingRecommendations() {
  const [data, setData] = useState<MarketingRecommendationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "generate-marketing-recommendations",
        { method: "GET" }
      );
      if (error) throw error;
      if (result?.status === "empty" || !result?.id) {
        setData(null);
        setIsOutdated(false);
      } else {
        setData(result);
        // Check if outdated (> 7 days)
        const weekStart = new Date(result.week_start);
        const now = new Date();
        const diffDays = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
        setIsOutdated(diffDays > 7);
      }
    } catch (err) {
      console.error("Erreur fetch recommandations:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les recommandations marketing.",
        variant: "destructive",
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const generateRecommendations = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "generate-marketing-recommendations",
        { method: "POST" }
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result);
      setIsOutdated(false);
      toast({
        title: "Recommandations générées",
        description: "Les nouvelles recommandations marketing sont prêtes.",
      });
    } catch (err: any) {
      console.error("Erreur génération recommandations:", err);
      toast({
        title: "Erreur de génération",
        description: err?.message || "La génération a échoué. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const updateChecklistItem = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!data) return;
      // Optimistic update
      const newChecklist = (data.checklist || []).map((item: any) =>
        item.id === taskId ? { ...item, completed } : item
      );
      setData({ ...data, checklist: newChecklist });

      try {
        const { error } = await supabase
          .from("marketing_recommendations")
          .update({ checklist: newChecklist as any })
          .eq("id", data.id);
        if (error) throw error;
      } catch (err) {
        console.error("Erreur update checklist:", err);
        // Revert
        setData(data);
      }
    },
    [data]
  );

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // ── V2 derived data ──────────────────────────────────────────────
  const version = data?.recommendation_version ?? 1;
  const adsV2 = Array.isArray(data?.ads_v2) ? data!.ads_v2 : [];
  const offersV2 = Array.isArray(data?.offers_v2) ? data!.offers_v2 : [];
  const emailsV2 = Array.isArray(data?.emails_v2) ? data!.emails_v2 : [];
  const campaignsV2 = Array.isArray(data?.campaigns_overview) ? data!.campaigns_overview : [];

  const isV2 = version >= 2 && (adsV2.length > 0 || offersV2.length > 0 || emailsV2.length > 0);

  const adsData = isV2 && adsV2.length > 0 ? { _v2: true, items: adsV2 } : { _v2: false, ...(data?.ads_recommendations || {}) };
  const offersData = isV2 && offersV2.length > 0 ? { _v2: true, items: offersV2 } : { _v2: false, ...(data?.offers_recommendations || {}) };
  const emailsData = isV2 && emailsV2.length > 0 ? { _v2: true, items: emailsV2 } : { _v2: false, ...(data?.email_recommendations || {}) };
  const campaignsData = isV2 ? campaignsV2 : [];
  const generationConfig = data?.generation_config ?? {};

  return {
    data,
    isLoading,
    isGenerating,
    isOutdated,
    generateRecommendations,
    updateChecklistItem,
    refetch: fetchRecommendations,
    // V2 extras
    isV2,
    adsData,
    offersData,
    emailsData,
    campaignsData,
    generationConfig,
  };
}
