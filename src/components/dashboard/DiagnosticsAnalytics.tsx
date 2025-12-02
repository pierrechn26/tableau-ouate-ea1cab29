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
  { name: "Emma", value: 42, color: "hsl(345, 65%, 68%)" },
  { name: "Sophie", value: 35, color: "hsl(15, 85%, 75%)" },
  { name: "Léa", value: 23, color: "hsl(30, 50%, 80%)" },
];

const optInData = [
  { month: "Jan", email: 1234, sms: 892 },
  { month: "Fév", email: 1456, sms: 1023 },
  { month: "Mar", email: 1789, sms: 1234 },
  { month: "Avr", email: 2012, sms: 1456 },
  { month: "Mai", email: 2234, sms: 1567 },
  { month: "Juin", email: 2456, sms: 1678 },
];

export function DiagnosticsAnalytics() {
  return (
    <div className="space-y-8">
      {/* Engagement Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Performance du Diagnostic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Vues totales"
            value="12 580"
            icon={Eye}
            trend={{ value: 15, isPositive: true }}
            index={0}
          />
          <MetricCard
            title="Taux de démarrage"
            value="78.2%"
            icon={PlayCircle}
            trend={{ value: 8, isPositive: true }}
            index={1}
          />
          <MetricCard
            title="Taux de complétion"
            value="63.3%"
            icon={CheckCircle}
            trend={{ value: -4, isPositive: false }}
            index={2}
          />
          <MetricCard
            title="Durée moyenne"
            value="4m 23s"
            icon={Clock}
            index={3}
          />
          <MetricCard
            title="Opt-in email"
            value="89.2%"
            icon={Mail}
            trend={{ value: 12, isPositive: true }}
            index={4}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 border-0 bg-gradient-to-br from-card to-secondary/20 shadow-[var(--shadow-medium)]">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Friction par Question
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="question" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="time" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Temps (s)" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              La Q5 (Budget) génère le plus de friction avec 192s en moyenne
            </p>
          </Card>
        </motion.div>

        {/* Persona Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 border-0 bg-gradient-to-br from-card to-secondary/20 shadow-[var(--shadow-medium)]">
            <h3 className="text-lg font-semibold text-foreground mb-4">
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
            <div className="flex justify-center gap-4 mt-4">
              {personaDistribution.map((persona) => (
                <div key={persona.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: persona.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {persona.name}
                  </span>
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
          <Card className="p-6 border-0 bg-gradient-to-br from-card to-secondary/20 shadow-[var(--shadow-medium)]">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Évolution des Opt-in
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={optInData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
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
