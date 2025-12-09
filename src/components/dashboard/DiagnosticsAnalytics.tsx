import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Eye, PlayCircle, CheckCircle, Mail, Clock } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { DateRange } from "react-day-picker";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface DiagnosticsAnalyticsProps {
  dateRange?: DateRange;
}

const engagementData = [
  { question: "Q1: Trimestre", time: 12, completion: 98 },
  { question: "Q2: Préoccupations", time: 45, completion: 94 },
  { question: "Q3: Peau actuelle", time: 28, completion: 91 },
  { question: "Q4: Routine actuelle", time: 35, completion: 88 },
  { question: "Q5: Budget", time: 192, completion: 63 },
  { question: "Q6: Texture", time: 48, completion: 78 },
  { question: "Q7: Ingrédients", time: 52, completion: 75 },
  { question: "Q8: Contact", time: 22, completion: 89 },
];

const personaDistribution = [
  { name: "Emma", typology: "Enceinte 1er trimestre", value: 25, color: "hsl(200, 70%, 60%)" },
  { name: "Sophie", typology: "Jeune maman postpartum", value: 22, color: "hsl(330, 70%, 65%)" },
  { name: "Léa", typology: "Maman de 2 enfants", value: 18, color: "hsl(140, 60%, 55%)" },
  { name: "Autre", typology: "Profils en découverte", value: 35, color: "hsl(0, 0%, 60%)" },
];

const topFrictions = [
  { theme: "Budget & Prix", abandonRate: 42, avgTime: 192, description: "Questions sur le budget génèrent le plus d'hésitation" },
  { theme: "Ingrédients & Composition", abandonRate: 28, avgTime: 52, description: "Besoin de plus d'explications sur les actifs" },
  { theme: "Texture & Sensorialité", abandonRate: 22, avgTime: 48, description: "Difficultés à choisir entre les textures proposées" },
];

// Generate dynamic opt-in data based on date range
function generateOptInData(dateRange?: DateRange) {
  if (!dateRange?.from || !dateRange?.to) {
    // Default data if no range
    return [
      { label: "Jan", email: 1234, sms: 892 },
      { label: "Fév", email: 1456, sms: 1023 },
      { label: "Mar", email: 1789, sms: 1234 },
      { label: "Avr", email: 2012, sms: 1456 },
      { label: "Mai", email: 2234, sms: 1567 },
      { label: "Juin", email: 2456, sms: 1678 },
    ];
  }

  const days = differenceInDays(dateRange.to, dateRange.from);
  
  // Determine granularity based on date range
  if (days <= 14) {
    // Daily granularity for up to 2 weeks
    const dates = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return dates.map((date, index) => ({
      label: format(date, "dd MMM", { locale: fr }),
      email: Math.floor(150 + Math.random() * 100 + index * 8),
      sms: Math.floor(100 + Math.random() * 80 + index * 5),
    }));
  } else if (days <= 90) {
    // Weekly granularity for up to 3 months
    const weeks = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to }, { locale: fr });
    return weeks.map((week, index) => ({
      label: `Sem. ${format(week, "dd/MM", { locale: fr })}`,
      email: Math.floor(800 + Math.random() * 400 + index * 80),
      sms: Math.floor(500 + Math.random() * 300 + index * 50),
    }));
  } else {
    // Monthly granularity for longer periods
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map((month, index) => ({
      label: format(month, "MMM yyyy", { locale: fr }),
      email: Math.floor(1200 + Math.random() * 600 + index * 150),
      sms: Math.floor(800 + Math.random() * 400 + index * 100),
    }));
  }
}

export function DiagnosticsAnalytics({ dateRange }: DiagnosticsAnalyticsProps) {
  const optInData = useMemo(() => generateOptInData(dateRange), [dateRange]);
  
  return (
    <div className="space-y-8">
      {/* Engagement Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 font-heading">
          Performance du Diagnostic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Vues totales"
            value="12 580"
            icon={Eye}
            trend={{ value: 15, isPositive: true }}
            comparison={{ value: "10 939", period: "vs période précédente" }}
            index={0}
          />
          <MetricCard
            title="Taux de démarrage"
            value="78.2%"
            icon={PlayCircle}
            trend={{ value: 8, isPositive: true }}
            comparison={{ value: "72.4%", period: "vs période précédente" }}
            index={1}
          />
          <MetricCard
            title="Taux de complétion"
            value="63.3%"
            icon={CheckCircle}
            trend={{ value: -4, isPositive: false }}
            comparison={{ value: "65.9%", period: "vs période précédente" }}
            index={2}
          />
          <MetricCard
            title="Durée moyenne"
            value="4m 23s"
            icon={Clock}
            trend={{ value: 10, isPositive: true }}
            comparison={{ value: "3m 59s", period: "vs période précédente" }}
            index={3}
          />
          <MetricCard
            title="Opt-in email"
            value="89.2%"
            icon={Mail}
            trend={{ value: 12, isPositive: true }}
            comparison={{ value: "79.6%", period: "vs période précédente" }}
            index={4}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Frictions by Theme */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-destructive/5 border border-border/50 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              Principales Frictions par Thème
            </h3>
            <div className="space-y-4">
              {topFrictions.map((friction, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{friction.theme}</span>
                    <span className="text-sm font-bold text-destructive">{friction.abandonRate}% abandon</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-destructive to-destructive/60 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${friction.abandonRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{friction.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Temps moyen: {friction.avgTime}s</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Persona Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/10 border border-border/50 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              Répartition des Personas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={personaDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {personaDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {personaDistribution.map((persona) => (
                <div key={persona.name} className="flex items-start gap-2">
                  <div
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: persona.color }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {persona.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {persona.typology}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Opt-in Evolution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 bg-gradient-to-br from-card via-card to-accent/10 border border-border/50 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4 font-heading">
              Évolution des Opt-in
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={optInData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="email"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Email"
                  dot={{ fill: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="sms"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  name="Email + SMS"
                  dot={{ fill: "hsl(var(--accent))" }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">89.2%</p>
                <p className="text-xs text-muted-foreground mt-1">Taux opt-in email</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">68.3%</p>
                <p className="text-xs text-muted-foreground mt-1">Email + Phone</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">+23%</p>
                <p className="text-xs text-muted-foreground mt-1">vs benchmark marché</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
