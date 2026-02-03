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
import { DateRange } from "react-day-picker";

interface DiagnosticsAnalyticsProps {
  dateRange?: DateRange;
}

const PERSONA_COLORS: Record<string, string> = {
  emma: "hsl(200, 70%, 60%)",
  sophie: "hsl(330, 70%, 65%)",
  lea: "hsl(140, 60%, 55%)",
  léa: "hsl(140, 60%, 55%)",
};

const PERSONA_TYPOLOGIES: Record<string, string> = {
  emma: "Enceinte 1er trimestre",
  sophie: "Jeune maman postpartum",
  lea: "Maman de 2 enfants",
  léa: "Maman de 2 enfants",
};

const DEFAULT_COLOR = "hsl(0, 0%, 60%)";

export function DiagnosticsAnalytics({ dateRange }: DiagnosticsAnalyticsProps) {
  const stats = useDiagnosticStats(dateRange);

  // Préparer les données pour le graphique en camembert
  const personaChartData = stats.personaDistribution.map((p) => ({
    name: p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase(),
    value: Math.round(p.percentage * 10) / 10,
    count: p.count,
    typology: PERSONA_TYPOLOGIES[p.name.toLowerCase()] || "Profil en découverte",
    color: PERSONA_COLORS[p.name.toLowerCase()] || DEFAULT_COLOR,
  }));

  // Ajouter "Autre" pour les réponses sans persona
  const responsesWithoutPersona = stats.responses.filter((r) => !r.detected_persona).length;
  if (responsesWithoutPersona > 0) {
    personaChartData.push({
      name: "Non défini",
      value: Math.round((responsesWithoutPersona / stats.totalResponses) * 1000) / 10,
      count: responsesWithoutPersona,
      typology: "Diagnostic incomplet",
      color: DEFAULT_COLOR,
    });
  }

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
            title="Total réponses"
            value={stats.totalResponses.toLocaleString('fr-FR')}
            icon={Users}
            index={0}
          />
          <MetricCard
            title="Complétés"
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
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              Répartition des Personas
            </h3>
            {personaChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={personaChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${value}%`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {personaChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${props.payload.count} réponses (${value}%)`,
                        props.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {personaChartData.map((persona) => (
                    <div key={persona.name} className="flex items-start gap-2">
                      <div
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: persona.color }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {persona.name} ({persona.count})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {persona.typology}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
                  {stats.emailOptinRate.toFixed(1)}% des complétés
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
                  {stats.smsOptinRate.toFixed(1)}% des complétés
                </p>
              </div>

              {/* Double opt-in */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Double opt-in (Email + SMS)</span>
                  <span className="text-lg font-bold text-foreground">
                    {stats.responses.filter((r) => r.email_optin && r.sms_optin).length}
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
                            ? new Date(response.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
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
