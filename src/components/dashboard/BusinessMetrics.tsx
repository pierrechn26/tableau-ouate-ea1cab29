import { useState } from "react";
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
import { useRevenueTimeseries, type Granularity } from "@/hooks/useRevenueTimeseries";
import { useInsightsMetrics } from "@/hooks/useInsightsMetrics";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BusinessMetricsProps {
  dateRange?: DateRange;
}


function fmtEuro(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function percentDiff(a: number, b: number): { value: string; positive: boolean } | null {
  if (b === 0) return null;
  const diff = ((a - b) / b) * 100;
  return { value: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`, positive: diff >= 0 };
}

export function BusinessMetrics({ dateRange }: BusinessMetricsProps) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const metrics = useBusinessMetrics(dateRange);
  const revenue = useRevenueTimeseries(dateRange, granularity);
  const insights = useInsightsMetrics(dateRange);

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
  const caWithDiag = metrics.revenueTotal;
  const caWithoutDiag = metrics.revenueTotal - metrics.revenueDiag;
  const caDiff = percentDiff(caWithDiag, caWithoutDiag);

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
              comparison={{
                period: "CA total vs CA sans diagnostic",
                value: `${fmt(caWithDiag)} € vs ${fmt(caWithoutDiag)} €`,
                diff: caDiff ? caDiff.value : undefined,
                positive: caDiff?.positive,
              }}
              index={0}
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
              subtitle="Valeur moyenne par commande"
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Comparison — real data */}
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
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {dateRange?.from
                    ? `${format(dateRange.from, "dd MMM yyyy", { locale: fr })} – ${format(dateRange.to ?? new Date(), "dd MMM yyyy", { locale: fr })}`
                    : "30 derniers jours"}
                </span>
                <ToggleGroup
                  type="single"
                  value={granularity}
                  onValueChange={(v) => { if (v) setGranularity(v as Granularity); }}
                  size="sm"
                  variant="outline"
                >
                  <ToggleGroupItem value="day" className="text-xs px-2">Jour</ToggleGroupItem>
                  <ToggleGroupItem value="week" className="text-xs px-2">Semaine</ToggleGroupItem>
                  <ToggleGroupItem value="month" className="text-xs px-2">Mois</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            {revenue.isLoading ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Chargement...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenue.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => fmtEuro(v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-foreground mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">
                                {entry.dataKey === "withDiag" ? "CA total (avec diagnostic)" : "CA sans diagnostic"}:
                              </span>
                              <span className="font-medium text-foreground">
                                {fmtEuro(entry.value ?? 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="withDiag" stroke="hsl(var(--primary))" strokeWidth={3} name="CA total (avec diagnostic)" dot={{ fill: "hsl(var(--primary))", r: 3 }} animationDuration={1200} />
                  <Line type="monotone" dataKey="withoutDiag" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="CA sans diagnostic" dot={{ fill: "hsl(var(--muted-foreground))", r: 2 }} animationDuration={1200} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Performance by Persona — à venir */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/10 border border-border/50 shadow-md flex flex-col items-center justify-center h-full min-h-[380px]">
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              CA par Persona
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              Les données par persona seront disponibles prochainement.
            </p>
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
          {insights.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Chargement...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Routine complète</p>
                <p className="text-3xl font-bold text-foreground">{fmt(insights.routineCompletePercent, 1)}%</p>
                <p className="text-xs text-muted-foreground">adoptent une routine 3+ produits</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Écart panier recommandé vs acheté</p>
                {insights.ecartPanier != null ? (
                  <>
                    <p className={`text-3xl font-bold ${insights.ecartPanier >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {insights.ecartPanier >= 0 ? "+" : ""}{fmt(insights.ecartPanier, 2)} €
                    </p>
                    <p className="text-xs text-muted-foreground">panier réel vs recommandé</p>
                    <p className={`text-xs ${insights.ecartPanier >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {insights.ecartPanier >= 0 ? "les clients achètent plus" : "les clients achètent moins"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-muted-foreground">—</p>
                    <p className="text-xs text-muted-foreground">données insuffisantes</p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Top produit recommandé</p>
                <p className="text-2xl font-bold text-foreground truncate" title={insights.topProduct ?? ""}>
                  {insights.topProduct ?? "—"}
                </p>
                {insights.topProduct && (
                  <p className="text-xs text-muted-foreground">produit le + recommandé ({insights.topProductCount} fois)</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Clients existants</p>
                <p className="text-3xl font-bold text-foreground">{fmt(insights.clientsExistantsPercent, 1)}%</p>
                <p className="text-xs text-muted-foreground">utilisaient déjà Ouate</p>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
