import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Eye, PlayCircle, CheckCircle, Mail, Clock, MessageSquare, Loader2, RefreshCw, Users } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { useDiagnosticStats } from "@/hooks/useDiagnosticStats";
import { usePersonaStats } from "@/hooks/usePersonaStats";
import { DateRange } from "react-day-picker";

interface DiagnosticsAnalyticsProps {
  dateRange?: DateRange;
}

const PERSONA_COLORS: Record<string, string> = {
  P1: "hsl(348, 83%, 47%)",
  P2: "hsl(330, 81%, 60%)",
  P3: "hsl(15, 85%, 55%)",
  P4: "hsl(205, 85%, 55%)",
  P5: "hsl(155, 65%, 45%)",
  P6: "hsl(270, 60%, 55%)",
  P7: "hsl(45, 90%, 50%)",
  P8: "hsl(348, 70%, 35%)",
  P9: "hsl(195, 70%, 45%)",
};

const PERSONA_NAMES: Record<string, string> = {
  P1: "Clara — La Novice Imperfections",
  P2: "Nathalie — La Novice Pré-ado",
  P3: "Amandine — La Novice Atopique",
  P4: "Julie — La Novice Sensible",
  P5: "Stéphanie — La Multi-enfants",
  P6: "Camille — La Novice Découverte",
  P7: "Sandrine — L'Insatisfaite",
  P8: "Virginie — La Fidèle Imperfections",
  P9: "Marine — La Fidèle Exploratrice",
};

const DEFAULT_COLOR = "hsl(0, 0%, 60%)";

function getPersonaChartColor(code: string): string {
  if (PERSONA_COLORS[code]) return PERSONA_COLORS[code];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

export function DiagnosticsAnalytics({ dateRange }: DiagnosticsAnalyticsProps) {
  const stats = useDiagnosticStats(dateRange);
  const personaData = usePersonaStats(dateRange);

  // Build pie chart from persona-stats (real persona_code distribution)
  const DISPLAY_NAMES: Record<string, string> = {
    P1: "Clara", P2: "Nathalie", P3: "Amandine", P4: "Julie", P5: "Stéphanie",
    P6: "Camille", P7: "Sandrine", P8: "Virginie", P9: "Marine",
  };
  const TITLES: Record<string, string> = {
    P1: "La Novice Imperfections", P2: "La Novice Pré-ado", P3: "La Novice Atopique",
    P4: "La Novice Sensible", P5: "La Multi-enfants", P6: "La Novice Découverte",
    P7: "L'Insatisfaite", P8: "La Fidèle Imperfections", P9: "La Fidèle Exploratrice",
  };
  const personaChartData = personaData.personas
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(p => ({
      name: PERSONA_NAMES[p.code] || `Persona ${p.code}`,
      shortName: p.code,
      displayName: DISPLAY_NAMES[p.code] || p.code,
      title: TITLES[p.code] || p.subtitle,
      value: p.percentage,
      count: p.count,
      color: getPersonaChartColor(p.code),
    }));

  if (stats.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <p>Erreur lors du chargement des données</p>
          <p className="text-sm text-muted-foreground">{stats.error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm text-muted-foreground">Données en temps réel</span>
      </div>

      {/* Engagement Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 font-heading">
          Performance du Diagnostic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Total sessions"
            value={stats.totalResponses.toLocaleString('fr-FR')}
            icon={Users}
            index={0}
          />
          <MetricCard
            title="Complétées"
            value={stats.completedResponses.toLocaleString('fr-FR')}
            icon={CheckCircle}
            index={1}
          />
          <MetricCard
            title="Taux de complétion"
            value={`${stats.completionRate.toFixed(1)}%`}
            icon={PlayCircle}
            index={2}
          />
          <MetricCard
            title="Opt-in email"
            value={`${stats.emailOptinRate.toFixed(1)}%`}
            subtitle={`${stats.emailOptinCount} inscrits`}
            icon={Mail}
            index={3}
          />
          <MetricCard
            title="Opt-in SMS"
            value={`${stats.smsOptinRate.toFixed(1)}%`}
            subtitle={`${stats.smsOptinCount} inscrits`}
            icon={MessageSquare}
            index={4}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Persona Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/10 border border-border/50 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-6 font-heading">
              Répartition des Personas
            </h3>
            {personaChartData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={260} height={260}>
                    <PieChart>
                      <Pie
                        data={personaChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={120}
                        paddingAngle={3}
                        cornerRadius={6}
                        dataKey="value"
                        stroke="none"
                      >
                        {personaChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "10px",
                          padding: "10px 14px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        formatter={(value: number, _name: string, props: any) => [
                          `${props.payload.count} sessions · ${value}%`,
                          `${props.payload.displayName} — ${props.payload.title}`
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-bold text-foreground">{personaData.totalCompleted}</p>
                    <p className="text-xs text-muted-foreground">sessions</p>
                  </div>
                </div>
                <div className="w-full space-y-1.5 mt-4">
                  {personaChartData.map((persona) => (
                    <div key={persona.shortName} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: persona.color }} />
                        <span className="text-sm text-foreground truncate">
                          <strong>{persona.displayName}</strong> <span className="text-muted-foreground">— {persona.title}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-foreground">{persona.value}%</span>
                        <span className="text-xs text-muted-foreground">({persona.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée de persona disponible
              </div>
            )}
          </Card>
        </motion.div>

        {/* Opt-in Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-accent/10 border border-border/50 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              Résumé des Opt-in
            </h3>
            <div className="space-y-6">
              {/* Email opt-in */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Email</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {stats.emailOptinCount} inscrits
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary to-primary/60 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.emailOptinRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {stats.emailOptinRate.toFixed(1)}% des vues opt-in
                </p>
              </div>

              {/* SMS opt-in */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-foreground">SMS</span>
                  </div>
                  <span className="text-sm font-bold text-accent">
                    {stats.smsOptinCount} inscrits
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-accent to-accent/60 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.smsOptinRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {stats.smsOptinRate.toFixed(1)}% des vues opt-in
                </p>
              </div>

              {/* Double opt-in */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Double opt-in (Email + SMS)</span>
                  <span className="text-lg font-bold text-foreground">
                    {stats.doubleOptinCount}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground font-heading">
                Dernières Réponses
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4" />
                <span>Mise à jour automatique</span>
              </div>
            </div>
            {stats.responses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Prénom enfant</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Âge</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Persona</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Opt-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.responses.slice(0, 10).map((response) => (
                      <tr key={response.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 text-muted-foreground">
                          {response.created_at 
                            ? new Date(response.created_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Europe/Paris'
                              })
                            : '-'}
                        </td>
                        <td className="py-2 px-3 font-medium">{response.child_name || '-'}</td>
                        <td className="py-2 px-3">{response.child_age ? `${response.child_age} ans` : '-'}</td>
                        <td className="py-2 px-3">
                          {response.detected_persona ? (
                            <span 
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ 
                                backgroundColor: PERSONA_COLORS[response.detected_persona.toLowerCase()] || DEFAULT_COLOR 
                              }}
                            >
                              {response.detected_persona}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            {response.email_optin && (
                              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">Email</span>
                            )}
                            {response.sms_optin && (
                              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">SMS</span>
                            )}
                            {!response.email_optin && !response.sms_optin && '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Aucune réponse pour cette période
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
