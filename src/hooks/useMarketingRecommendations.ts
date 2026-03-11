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

export type GenerationType =
  | "global"
  | "ads"
  | "offers"
  | "emails"
  | "single_ad"
  | "single_offer"
  | "single_email";

// Steps reflect the new simplified architecture
export type GenerationStep =
  | "generate"
  | "generate_ads"
  | "generate_offers"
  | "generate_emails"
  | "finalize"
  | null;

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
  const [generationStep, setGenerationStep] = useState<GenerationStep>(null);
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

  const generateByCategory = useCallback(
    async (type: GenerationType) => {
      setGeneratingType(type);
      setGenerationStep(null);
      setQuotaExceeded(false);

      try {
        if (type === "global") {
          // ── Global : 4 appels séquentiels orchestrés par le frontend ──

          // 1. Générer les Ads (crée une nouvelle ligne)
          setGenerationStep("generate_ads");
          const adsResult = await supabase.functions.invoke(
            "generate-marketing-recommendations",
            { body: { type: "ads" } }
          );
          if (adsResult.error) throw new Error(adsResult.error.message);
          if (adsResult.data?.error) {
            if (adsResult.data.error === "quota_exceeded") {
              setQuotaExceeded(true);
              setQuota((prev) => ({
                ...prev,
                remaining: adsResult.data.remaining ?? 0,
                total_generated: adsResult.data.current ?? prev.total_generated,
              }));
              toast({
                title: "Quota atteint",
                description: `Limite mensuelle atteinte. Passez au plan supérieur pour plus de recommandations.`,
                variant: "destructive",
              });
              return;
            }
            throw new Error(adsResult.data.error);
          }
          const recommendation_id: string = adsResult.data.recommendation_id;

          // 2. Générer les Offres (update la même ligne)
          setGenerationStep("generate_offers");
          const offersResult = await supabase.functions.invoke(
            "generate-marketing-recommendations",
            { body: { type: "offers", recommendation_id } }
          );
          if (offersResult.error) throw new Error(offersResult.error.message);
          if (offersResult.data?.error) throw new Error(offersResult.data.error);

          // 3. Générer les Emails (update la même ligne)
          setGenerationStep("generate_emails");
          const emailsResult = await supabase.functions.invoke(
            "generate-marketing-recommendations",
            { body: { type: "emails", recommendation_id } }
          );
          if (emailsResult.error) throw new Error(emailsResult.error.message);
          if (emailsResult.data?.error) throw new Error(emailsResult.data.error);

          // 4. Finaliser (campaigns + checklist + persona_focus)
          setGenerationStep("finalize");
          const finalResult = await supabase.functions.invoke(
            "generate-marketing-recommendations",
            { body: { type: "finalize", recommendation_id } }
          );
          if (finalResult.error) throw new Error(finalResult.error.message);
          if (finalResult.data?.error) throw new Error(finalResult.data.error);

          if (finalResult.data?.recommendations) {
            setAllRecommendations(finalResult.data.recommendations);
          }
          if (finalResult.data?.quota) {
            setQuota(finalResult.data.quota);
          }

          toast({
            title: "Recommandations générées",
            description: "9 recommandations marketing prêtes (Ads + Offres + Emails).",
          });
        } else {
          // ── Catégorie ou single : 1 seul appel ──
          setGenerationStep("generate");

          const result = await supabase.functions.invoke(
            "generate-marketing-recommendations",
            { body: { type } }
          );

          if (result.error) throw new Error(result.error.message);

          if (result.data?.error) {
            if (result.data.error === "quota_exceeded") {
              setQuotaExceeded(true);
              setQuota((prev) => ({
                ...prev,
                remaining: result.data.remaining ?? 0,
                total_generated: result.data.current ?? prev.total_generated,
              }));
              toast({
                title: "Quota atteint",
                description: `Vous avez utilisé ${result.data.current}/${result.data.limit} recommandations ce mois.`,
                variant: "destructive",
              });
              return;
            }
            if (result.data.error === "no_intelligence") {
              toast({
                title: "Intelligence mensuelle manquante",
                description:
                  "Aucune analyse de marché disponible. Lancez l'intelligence mensuelle d'abord.",
                variant: "destructive",
              });
              return;
            }
            throw new Error(result.data.error);
          }

          if (result.data?.recommendations) {
            setAllRecommendations(result.data.recommendations);
          }
          if (result.data?.quota) {
            setQuota(result.data.quota);
          }

          const count = type.startsWith("single_") ? 1 : 3;
          const typeLabel =
            type === "ads"
              ? "Ads"
              : type === "offers"
              ? "Offres"
              : type === "emails"
              ? "Emails"
              : type === "single_ad"
              ? "Ad"
              : type === "single_offer"
              ? "Offre"
              : "Email";

          toast({
            title: "Recommandations générées",
            description: `${count} recommandation${count > 1 ? "s" : ""} ${typeLabel} prête${count > 1 ? "s" : ""}.`,
          });
        }
      } catch (err: any) {
        console.error("[generate]", err);
        toast({
          title: "Erreur de génération",
          description: err?.message || "La génération a échoué. Veuillez réessayer.",
          variant: "destructive",
        });
      } finally {
        setGeneratingType(null);
        setGenerationStep(null);
        // Always refresh after generation attempt
        await fetchRecommendations();
      }
    },
    [toast, fetchRecommendations]
  );

  const updateChecklistItem = useCallback(
    async (recId: string, taskId: string, completed: boolean) => {
      const rec = allRecommendations.find((r) => r.id === recId);
      if (!rec) return;

      const newChecklist = (rec.checklist || []).map((item: any) =>
        item.id === taskId ? { ...item, completed } : item
      );

      setAllRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, checklist: newChecklist } : r))
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
          prev.map((r) => (r.id === recId ? { ...r, checklist: rec.checklist } : r))
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

  const latestRec = allRecommendations[0] || null;
  const campaignsData = Array.isArray(latestRec?.campaigns_overview)
    ? latestRec.campaigns_overview
    : [];
  const isV2 = allAdsV2.length > 0 || allOffersV2.length > 0 || allEmailsV2.length > 0;

  const adsData =
    allAdsV2.length > 0
      ? { _v2: true, items: allAdsV2 }
      : { _v2: false, ...(latestRec?.ads_recommendations || {}) };
  const offersData =
    allOffersV2.length > 0
      ? { _v2: true, items: allOffersV2 }
      : { _v2: false, ...(latestRec?.offers_recommendations || {}) };
  const emailsData =
    allEmailsV2.length > 0
      ? { _v2: true, items: allEmailsV2 }
      : { _v2: false, ...(latestRec?.email_recommendations || {}) };

  const latestChecklist = (latestRec?.checklist || []) as any[];
  const latestChecklistRecId = latestRec?.id || null;

  return {
    allRecommendations,
    latestRec,
    quota,
    isLoading,
    isGenerating,
    generatingType,
    generationStep,
    quotaExceeded,
    generateByCategory,
    updateChecklistItem: (taskId: string, completed: boolean) => {
      if (!latestChecklistRecId) return;
      updateChecklistItem(latestChecklistRecId, taskId, completed);
    },
    refetch: fetchRecommendations,
    isV2,
    adsData,
    offersData,
    emailsData,
    campaignsData,
    latestChecklist,
    generationConfig: latestRec?.generation_config ?? {},
  };
}
