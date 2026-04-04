import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Recommendation {
  id: string;
  title: string;
  brief: string | null;
  category: string | null;
  persona_cible: string | null;
  persona_code: string | null;
  priority: number;
  generation_status: string;
  action_status: string;
  generated_at: string | null;
  week_start: string;
  recommendation_version: number;
  generation_type: string | null;
  content: any;
  targeting: any;
  sources_inspirations: any;
  pre_calculated_context: any;
  feedback_score: string | null;
  feedback_notes: string | null;
  feedback_results: any;
  feedback_entered_at: string | null;
  completed_at: string | null;
  // Legacy fields kept for backward compat
  ads_v2: any;
  offers_v2: any;
  emails_v2: any;
  campaigns_overview: any;
  checklist: any;
  persona_focus: any;
  generation_config: any;
  ads_recommendations: any;
  email_recommendations: any;
  offers_recommendations: any;
  sources_consulted: any;
  status: string | null;
  generated_categories: any;
}

export interface RecommendationStats {
  total: number;
  pending: number;
  complete: number;
  todo: number;
  in_progress: number;
  done: number;
}

// Keep legacy exports for backward compat (MarketingOverviewTab etc.)
export type GenerationType = "global" | "ads" | "offers" | "emails" | "single_ad" | "single_offer" | "single_email";
export type GenerationStep = null;
export interface QuotaData {
  total_generated: number;
  monthly_limit: number;
  remaining: number;
  plan: string;
  generations_log: any[];
}

export function useMarketingRecommendations() {
  const [allRecommendations, setAllRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "generate-marketing-recommendations",
        { method: "GET" }
      );
      if (error) throw error;
      setAllRecommendations(result?.recommendations ?? []);
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

  // Generate full content for a pending recommendation
  const generateContent = useCallback(async (recommendationId: string) => {
    // Optimistic: set to generating
    setAllRecommendations((prev) =>
      prev.map((r) => r.id === recommendationId ? { ...r, generation_status: "generating" } : r)
    );

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-recommendation-content",
        { body: { recommendation_id: recommendationId } }
      );
      if (error) throw error;

      if (data?.status === "error") {
        setAllRecommendations((prev) =>
          prev.map((r) => r.id === recommendationId ? { ...r, generation_status: "error" } : r)
        );
        toast({
          title: "Erreur de génération",
          description: data.message || "La génération a échoué. Réessayez.",
          variant: "destructive",
        });
        return;
      }

      // Update local state with complete content
      if (data?.recommendation) {
        setAllRecommendations((prev) =>
          prev.map((r) => r.id === recommendationId ? { ...r, ...data.recommendation, generation_status: "complete" } : r)
        );
      } else {
        // Fallback: refetch all
        await fetchRecommendations();
      }
    } catch (err: any) {
      console.error("[generateContent]", err);
      setAllRecommendations((prev) =>
        prev.map((r) => r.id === recommendationId ? { ...r, generation_status: "error" } : r)
      );
      toast({
        title: "Erreur",
        description: err?.message || "La génération a échoué.",
        variant: "destructive",
      });
    }
  }, [toast, fetchRecommendations]);

  // Update action_status (todo / in_progress / done)
  const updateStatus = useCallback(async (recommendationId: string, status: "todo" | "in_progress" | "done") => {
    const prev = allRecommendations.find((r) => r.id === recommendationId);
    // Optimistic
    setAllRecommendations((all) =>
      all.map((r) => r.id === recommendationId ? { ...r, action_status: status, completed_at: status === "done" ? new Date().toISOString() : r.completed_at } : r)
    );

    try {
      const { error } = await supabase.functions.invoke(
        "generate-marketing-recommendations",
        { body: { action: "update_status", recommendation_id: recommendationId, action_status: status } }
      );
      if (error) throw error;
    } catch (err) {
      console.error("[updateStatus]", err);
      // Rollback
      if (prev) {
        setAllRecommendations((all) =>
          all.map((r) => r.id === recommendationId ? prev : r)
        );
      }
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  }, [allRecommendations, toast]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Split by category (V3 individual recos)
  const v3Recos = allRecommendations.filter((r) => r.recommendation_version === 3);
  const recommendations = {
    ads: v3Recos.filter((r) => r.category === "ads").sort((a, b) => a.priority - b.priority || new Date(b.generated_at ?? 0).getTime() - new Date(a.generated_at ?? 0).getTime()),
    emails: v3Recos.filter((r) => r.category === "emails").sort((a, b) => a.priority - b.priority || new Date(b.generated_at ?? 0).getTime() - new Date(a.generated_at ?? 0).getTime()),
    offers: v3Recos.filter((r) => r.category === "offers").sort((a, b) => a.priority - b.priority || new Date(b.generated_at ?? 0).getTime() - new Date(a.generated_at ?? 0).getTime()),
  };

  const stats: RecommendationStats = {
    total: v3Recos.length,
    pending: v3Recos.filter((r) => r.generation_status === "pending").length,
    complete: v3Recos.filter((r) => r.generation_status === "complete").length,
    todo: v3Recos.filter((r) => r.action_status === "todo").length,
    in_progress: v3Recos.filter((r) => r.action_status === "in_progress").length,
    done: v3Recos.filter((r) => r.action_status === "done").length,
  };

  return {
    allRecommendations,
    recommendations,
    stats,
    loading: isLoading,
    isLoading,
    generateContent,
    updateStatus,
    refresh: fetchRecommendations,
    refetch: fetchRecommendations,
  };
}
