import { useEffect, useMemo, useRef, useState } from 'react';
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

type PerformancePayload = {
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  emailOptinCount: number;
  smsOptinCount: number;
  emailOptinRate: number;
  smsOptinRate: number;
  personaDistribution: Array<{ name: string; count: number; percentage: number }>;
  responses: Array<{
    id: string;
    created_at: string | null;
    child_name: string | null;
    child_age: number | null;
    detected_persona: string | null;
    email_optin: boolean | null;
    sms_optin: boolean | null;
  }>;
};

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
  const [serverStats, setServerStats] = useState<Omit<DiagnosticStats,
    'responses' | 'isLoading' | 'error'
  > | null>(null);

  const pollRef = useRef<number | null>(null);

  // Récupérer les métriques depuis une fonction backend (évite les soucis RLS + ne renvoie pas de PII)
  useEffect(() => {
    async function fetchPerformance() {
      setIsLoading(true);
      setError(null);

      try {
        const from = dateRange?.from?.toISOString();
        const to = dateRange?.to
          ? (() => {
              const endOfDay = new Date(dateRange.to);
              endOfDay.setHours(23, 59, 59, 999);
              return endOfDay.toISOString();
            })()
          : undefined;

        const { data, error: fnError } = await supabase.functions.invoke<PerformancePayload>(
          'diagnostic-performance',
          { body: { from, to } }
        );

        if (fnError) throw fnError;
        if (!data) throw new Error('No data returned from diagnostic-performance');

        setServerStats({
          totalResponses: data.totalResponses,
          completedResponses: data.completedResponses,
          completionRate: data.completionRate,
          emailOptinCount: data.emailOptinCount,
          smsOptinCount: data.smsOptinCount,
          emailOptinRate: data.emailOptinRate,
          smsOptinRate: data.smsOptinRate,
          personaDistribution: data.personaDistribution,
        });

        // Map sanitized recent responses into local shape (fields not provided become null)
        setResponses(
          (data.responses || []).map((r) => ({
            id: r.id,
            session_id: '',
            created_at: r.created_at,
            child_name: r.child_name,
            child_age: r.child_age,
            parent_name: null,
            email: null,
            phone: null,
            email_optin: r.email_optin,
            sms_optin: r.sms_optin,
            detected_persona: r.detected_persona,
            persona_confidence: null,
            persona_scores: null,
            answers: null,
            metadata: null,
            source_url: null,
            utm_source: null,
            utm_medium: null,
            utm_campaign: null,
            utm_content: null,
            utm_term: null,
          }))
        );
      } catch (err) {
        console.error('[useDiagnosticStats] Error fetching performance:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    // initial
    fetchPerformance();

    // poll (simple + reliable)
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(fetchPerformance, 15000);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalResponses = serverStats?.totalResponses ?? 0;
    const completedResponses = serverStats?.completedResponses ?? 0;
    const completionRate = serverStats?.completionRate ?? 0;
    const emailOptinCount = serverStats?.emailOptinCount ?? 0;
    const smsOptinCount = serverStats?.smsOptinCount ?? 0;
    const emailOptinRate = serverStats?.emailOptinRate ?? 0;
    const smsOptinRate = serverStats?.smsOptinRate ?? 0;
    const personaDistribution = serverStats?.personaDistribution ?? [];

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
  }, [responses, isLoading, error, serverStats]);

  return stats;
}
