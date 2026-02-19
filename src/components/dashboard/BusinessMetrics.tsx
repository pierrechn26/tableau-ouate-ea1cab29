import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, ShoppingCart, Users, Loader2 } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { useBusinessMetrics } from "@/hooks/useBusinessMetrics";
import type { DateRange } from "react-day-picker";

interface BusinessMetricsProps {
  dateRange?: DateRange;
}

const revenueByPersona = [
  { persona: "Emma", typology: "Enceinte 1er trimestre", revenue: 54230, aov: 68.5, conversion: 3.8 },
  { persona: "Sophie", typology: "Jeune maman postpartum", revenue: 48670, aov: 71.2, conversion: 4.2 },
  { persona: "Léa", typology: "Maman de 2 enfants", revenue: 24550, aov: 76.8, conversion: 3.4 },
  { persona: "Autres", typology: "Profils en découverte", revenue: 68450, aov: 58.3, conversion: 2.1, locked: true },
];

const totalRevenue = revenueByPersona.reduce((sum, p) => sum + p.revenue, 0);

const monthlyRevenue = [
  { month: "Jan", withDiag: 87000, withoutDiag: 54000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Fév", withDiag: 92000, withoutDiag: 56000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Mar", withDiag: 98000, withoutDiag: 58000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Avr", withDiag: 105000, withoutDiag: 61000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Mai", withDiag: 112000, withoutDiag: 63000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Juin", withDiag: 118000, withoutDiag: 65000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Juil", withDiag: 121000, withoutDiag: 66000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Août", withDiag: 119000, withoutDiag: 64000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Sep", withDiag: 124000, withoutDiag: 68000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Oct", withDiag: 131000, withoutDiag: 71000, withDiagDashed: null, withoutDiagDashed: null },
  { month: "Nov", withDiag: 127450, withoutDiag: 69000, withDiagDashed: 127450, withoutDiagDashed: 69000 },
  { month: "Déc", withDiag: null, withoutDiag: null, withDiagDashed: 134000, withoutDiagDashed: 72000 },
];

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function percentDiff(a: number, b: number): { value: string; positive: boolean } | null {
  if (b === 0) return null;
  const diff = ((a - b) / b) * 100;
  return { value: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`, positive: diff >= 0 };
}

export function BusinessMetrics({ dateRange }: BusinessMetricsProps) {
  const metrics = useBusinessMetrics(dateRange);

  const percentInfluenced = metrics.revenueTotal > 0
    ? (metrics.revenueDiag / metrics.revenueTotal) * 100
    : 0;

  // Conversion rate: diag purchases / diagnostic page views (GA4)
  const convRateDiag = metrics.diagnosticPageViews > 0
    ? (metrics.orderCountDiag / metrics.diagnosticPageViews) * 100
    : 0;

  // Global conversion rate: non-diag orders / site sessions (GA4)
  const convRateGlobal = metrics.siteSessions > 0
    ? (metrics.orderCountNonDiag / metrics.siteSessions) * 100
    : 0;

  const aovDiff = percentDiff(metrics.aovDiag, metrics.aovNonDiag);
  const convDiff = percentDiff(convRateDiag, convRateGlobal);

  return (
    <div className="space-y-8">
      {/* Key Business Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 font-heading">
          Business & Conversion
        </h2>
        {metrics.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Chargement des données...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="CA via diagnostic"
              value={`${fmt(metrics.revenueDiag)} €`}
              subtitle={`${metrics.orderCountDiag} commandes`}
              icon={DollarSign}
              index={0}
              largeValue
            />
            <MetricCard
              title="% ventes influencées"
              value={`${fmt(percentInfluenced, 1)}%`}
              subtitle={`${metrics.orderCountDiag} / ${metrics.orderCountTotal} commandes`}
              icon={TrendingUp}
              comparison={{ period: `${fmt(percentInfluenced, 1)}% du CA total`, value: `${fmt(metrics.revenueDiag)} € sur ${fmt(metrics.revenueTotal)} €` }}
              index={1}
            />
            <MetricCard
              title="AOV après diag"
              value={`${fmt(metrics.aovDiag, 2)} €`}
              subtitle={`${metrics.orderCountDiag} commandes`}
              icon={ShoppingCart}
              comparison={{
                period: "vs sans diagnostic",
                value: `${fmt(metrics.aovNonDiag, 2)} €`,
                diff: aovDiff ? aovDiff.value : undefined,
                positive: aovDiff?.positive,
              }}
              index={2}
            />
            <MetricCard
              title="Taux de conversion diag"
              value={`${fmt(convRateDiag, 1)}%`}
              subtitle={`${metrics.orderCountDiag} achats / ${metrics.diagnosticPageViews.toLocaleString()} vues diag`}
              icon={Users}
              comparison={{
                period: "vs global",
                value: `${fmt(convRateGlobal, 2)}%`,
                diff: convDiff ? convDiff.value : undefined,
                positive: convDiff?.positive,
              }}
              index={3}
            />
          </div>
        )}
      </div>

      {/* Charts — kept as static/fictive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/10 border border-border/50 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground font-heading">
                Impact du Diagnostic sur le CA
              </h3>
              <span className="text-xs text-muted-foreground">
                Données depuis le début de l'année
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    
                    const filteredPayload = payload.filter((entry: any) => {
                      if (label === "Nov") {
                        return entry.dataKey === "withDiag" || entry.dataKey === "withoutDiag";
                      }
                      if (label === "Déc") {
                        return entry.dataKey === "withDiagDashed" || entry.dataKey === "withoutDiagDashed";
                      }
                      return entry.dataKey === "withDiag" || entry.dataKey === "withoutDiag";
                    });

                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-foreground mb-2">{label}</p>
                        {filteredPayload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">
                              {entry.dataKey === "withDiag" || entry.dataKey === "withDiagDashed" ? "Avec diagnostic" : "Sans diagnostic"}:
                            </span>
                            <span className="font-medium text-foreground">
                              {entry.value?.toLocaleString()} €
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="withDiag" stroke="hsl(var(--primary))" strokeWidth={3} name="Avec diagnostic" dot={{ fill: "hsl(var(--primary))", r: 4 }} connectNulls={false} animationDuration={1500} animationBegin={0} />
                <Line type="monotone" dataKey="withoutDiag" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Sans diagnostic" dot={{ fill: "hsl(var(--muted-foreground))", r: 3 }} connectNulls={false} animationDuration={1500} animationBegin={0} />
                <Line type="monotone" dataKey="withDiagDashed" stroke="hsl(var(--primary))" strokeWidth={3} strokeDasharray="5 5" dot={{ fill: "hsl(var(--primary))", r: 4 }} connectNulls={false} legendType="none" animationDuration={800} animationBegin={1400} />
                <Line type="monotone" dataKey="withoutDiagDashed" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "hsl(var(--muted-foreground))", r: 3 }} connectNulls={false} legendType="none" animationDuration={800} animationBegin={1400} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Les lignes pointillées représentent les données partielles du mois en cours
            </p>
          </Card>
        </motion.div>

        {/* Performance by Persona */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/10 border border-border/50 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              CA par Persona
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByPersona}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="persona" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [
                    `${value.toLocaleString()} € (${((value / totalRevenue) * 100).toFixed(1)}% du CA total)`,
                    "CA"
                  ]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="CA" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
              {revenueByPersona.map((persona) => (
                <div key={persona.persona} className={`text-center ${persona.locked ? 'opacity-60' : ''}`}>
                  <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
                    {persona.persona}
                    {persona.locked && <span className="text-xs">🔒</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{persona.typology}</p>
                  <p className="text-xs text-muted-foreground mt-1">AOV: {persona.aov}€</p>
                  <p className="text-xs text-muted-foreground">Conv: {persona.conversion}%</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Additional Insights — kept as static */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-gradient-to-br from-card via-card to-accent/10 border border-border/50 shadow-md">
          <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
            Insights Business
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Réduction remboursements</p>
              <p className="text-3xl font-bold text-foreground">-23%</p>
              <p className="text-xs text-green-600">Meilleur match produit/besoin</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Upsells réussis</p>
              <p className="text-3xl font-bold text-foreground">34%</p>
              <p className="text-xs text-green-600">panier moyen plus élevé</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Routine complète</p>
              <p className="text-3xl font-bold text-foreground">28%</p>
              <p className="text-xs text-green-600">adoptent 3+ produits</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Taux de réachat</p>
              <p className="text-3xl font-bold text-foreground">47%</p>
              <p className="text-xs text-green-600">à 90 jours</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
