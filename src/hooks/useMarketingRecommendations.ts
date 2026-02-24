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

  return {
    data,
    isLoading,
    isGenerating,
    isOutdated,
    generateRecommendations,
    updateChecklistItem,
    refetch: fetchRecommendations,
  };
}
