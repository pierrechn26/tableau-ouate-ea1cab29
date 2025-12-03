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
import { DollarSign, TrendingUp, ShoppingCart, Users } from "lucide-react";
import { MetricCard } from "./MetricCard";

const revenueByPersona = [
  { persona: "Emma", revenue: 54230, aov: 68.5, conversion: 3.8 },
  { persona: "Sophie", revenue: 48670, aov: 71.2, conversion: 4.2 },
  { persona: "Léa", revenue: 24550, aov: 76.8, conversion: 3.4 },
];

const monthlyRevenue = [
  { month: "Jan", withDiag: 87000, withoutDiag: 54000 },
  { month: "Fév", withDiag: 92000, withoutDiag: 56000 },
  { month: "Mar", withDiag: 98000, withoutDiag: 58000 },
  { month: "Avr", withDiag: 105000, withoutDiag: 61000 },
  { month: "Mai", withDiag: 112000, withoutDiag: 63000 },
  { month: "Juin", withDiag: 127450, withoutDiag: 65000 },
];

export function BusinessMetrics() {
  return (
    <div className="space-y-8">
      {/* Key Business Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 font-heading">
          Business & Conversion
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="CA via diagnostic"
            value="127 450 €"
            subtitle="Ce mois"
            icon={DollarSign}
            trend={{ value: 23, isPositive: true }}
            index={0}
          />
          <MetricCard
            title="% ventes influencées"
            value="66.2%"
            subtitle="des ventes totales"
            icon={TrendingUp}
            trend={{ value: 8, isPositive: true }}
            index={1}
          />
          <MetricCard
            title="AOV après diag"
            value="71.20 €"
            subtitle="vs 52.30 € sans"
            icon={ShoppingCart}
            trend={{ value: 36, isPositive: true }}
            index={2}
          />
          <MetricCard
            title="LTV moyenne"
            value="234 €"
            subtitle="+42% vs sans diag"
            icon={Users}
            trend={{ value: 42, isPositive: true }}
            index={3}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/10 border border-border/50 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              Impact du Diagnostic sur le CA
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => `${value.toLocaleString()} €`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="withDiag"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  name="Avec diagnostic"
                  dot={{ fill: "hsl(var(--primary))", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="withoutDiag"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Sans diagnostic"
                  dot={{ fill: "hsl(var(--muted-foreground))", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Le diagnostic génère +96% de CA supplémentaire en moyenne
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
                  formatter={(value: number) => `${value.toLocaleString()} €`}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                  name="CA"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
              {revenueByPersona.map((persona) => (
                <div key={persona.persona} className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {persona.persona}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AOV: {persona.aov}€
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Conv: {persona.conversion}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Additional Insights */}
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
              <p className="text-sm text-muted-foreground">
                Réduction remboursements
              </p>
              <p className="text-3xl font-bold text-foreground">-23%</p>
              <p className="text-xs text-green-600">
                Meilleur match produit/besoin
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Upsells réussis</p>
              <p className="text-3xl font-bold text-foreground">34%</p>
              <p className="text-xs text-green-600">+12pts vs sans diag</p>
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
