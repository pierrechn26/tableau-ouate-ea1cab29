import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';

interface DiagnosticResponse {
  id: string;
  session_id: string;
  created_at: string | null;
  child_name: string | null;
  child_age: number | null;
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  email_optin: boolean | null;
  sms_optin: boolean | null;
  detected_persona: string | null;
  persona_confidence: number | null;
  persona_scores: Record<string, number> | null;
  answers: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

interface DiagnosticStats {
  // Compteurs principaux
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  
  // Opt-ins
  emailOptinCount: number;
  smsOptinCount: number;
  emailOptinRate: number;
  smsOptinRate: number;
  
  // Personas
  personaDistribution: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  
  // Données brutes
  responses: DiagnosticResponse[];
  
  // État
  isLoading: boolean;
  error: Error | null;
}

export function useDiagnosticStats(dateRange?: DateRange): DiagnosticStats {
  const [responses, setResponses] = useState<DiagnosticResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Récupérer les données initiales
  useEffect(() => {
    async function fetchResponses() {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('diagnostic_responses')
          .select('*')
          .order('created_at', { ascending: false });

        // Filtrer par date si spécifié
        if (dateRange?.from) {
          query = query.gte('created_at', dateRange.from.toISOString());
        }
        if (dateRange?.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setResponses((data as DiagnosticResponse[]) || []);
      } catch (err) {
        console.error('[useDiagnosticStats] Error fetching responses:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchResponses();
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  // Abonnement temps réel
  useEffect(() => {
    const channel = supabase
      .channel('diagnostic_responses_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diagnostic_responses',
        },
        (payload) => {
          console.log('[useDiagnosticStats] Realtime update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newResponse = payload.new as DiagnosticResponse;
            
            // Vérifier si dans la plage de dates
            if (dateRange?.from || dateRange?.to) {
              const createdAt = new Date(newResponse.created_at || '');
              if (dateRange.from && createdAt < dateRange.from) return;
              if (dateRange.to) {
                const endOfDay = new Date(dateRange.to);
                endOfDay.setHours(23, 59, 59, 999);
                if (createdAt > endOfDay) return;
              }
            }
            
            setResponses((prev) => [newResponse, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setResponses((prev) =>
              prev.map((r) =>
                r.id === (payload.new as DiagnosticResponse).id
                  ? (payload.new as DiagnosticResponse)
                  : r
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setResponses((prev) =>
              prev.filter((r) => r.id !== (payload.old as DiagnosticResponse).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalResponses = responses.length;
    
    // On considère une réponse "complète" si elle a un persona détecté ET un email
    const completedResponses = responses.filter(
      (r) => r.detected_persona && r.email
    ).length;
    const completionRate = totalResponses > 0 
      ? (completedResponses / totalResponses) * 100 
      : 0;

    // Opt-ins
    const emailOptinCount = responses.filter((r) => r.email_optin).length;
    const smsOptinCount = responses.filter((r) => r.sms_optin).length;
    const emailOptinRate = completedResponses > 0 
      ? (emailOptinCount / completedResponses) * 100 
      : 0;
    const smsOptinRate = completedResponses > 0 
      ? (smsOptinCount / completedResponses) * 100 
      : 0;

    // Distribution des personas
    const personaCounts: Record<string, number> = {};
    responses.forEach((r) => {
      if (r.detected_persona) {
        personaCounts[r.detected_persona] = (personaCounts[r.detected_persona] || 0) + 1;
      }
    });

    const personaDistribution = Object.entries(personaCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalResponses,
      completedResponses,
      completionRate,
      emailOptinCount,
      smsOptinCount,
      emailOptinRate,
      smsOptinRate,
      personaDistribution,
      responses,
      isLoading,
      error,
    };
  }, [responses, isLoading, error]);

  return stats;
}
