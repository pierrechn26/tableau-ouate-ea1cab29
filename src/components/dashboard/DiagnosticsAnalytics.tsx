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

const optInData = [
  { month: "Jan", email: 1234, sms: 892, emailDashed: null, smsDashed: null },
  { month: "Fév", email: 1456, sms: 1023, emailDashed: null, smsDashed: null },
  { month: "Mar", email: 1789, sms: 1234, emailDashed: null, smsDashed: null },
  { month: "Avr", email: 2012, sms: 1456, emailDashed: null, smsDashed: null },
  { month: "Mai", email: 2234, sms: 1567, emailDashed: null, smsDashed: null },
  { month: "Juin", email: 2456, sms: 1678, emailDashed: null, smsDashed: null },
  { month: "Juil", email: 2612, sms: 1789, emailDashed: null, smsDashed: null },
  { month: "Août", email: 2734, sms: 1856, emailDashed: null, smsDashed: null },
  { month: "Sept", email: 2891, sms: 1934, emailDashed: null, smsDashed: null },
  { month: "Oct", email: 3056, sms: 2012, emailDashed: null, smsDashed: null },
  { month: "Nov", email: 3189, sms: 2089, emailDashed: 3189, smsDashed: 2089 },
  { month: "Déc", email: null, sms: null, emailDashed: 3320, smsDashed: 2156 },
];

export function DiagnosticsAnalytics() {
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground font-heading">
                Évolution des Opt-in
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Données depuis le début de l'année
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={optInData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  tickFormatter={(value) => value.toLocaleString('fr-FR')}
                  label={{ value: 'Inscrits', angle: -90, position: 'insideLeft', dx: -15, style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === "email" || name === "emailDashed" ? "Email" : "SMS";
                    return [value.toLocaleString(), label];
                  }}
                  filterNull={true}
                  itemSorter={(item) => {
                    // Priorité aux données principales, filtrer les doublons de Nov
                    if (item.dataKey === "emailDashed" || item.dataKey === "smsDashed") {
                      return 1;
                    }
                    return 0;
                  }}
                  payload={undefined}
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    
                    // Filtrer pour éviter les doublons sur Novembre
                    const filteredPayload = payload.filter((entry: any) => {
                      if (label === "Nov") {
                        // Pour Nov, n'afficher que email et sms (pas les dashed)
                        return entry.dataKey === "email" || entry.dataKey === "sms";
                      }
                      // Pour Déc, n'afficher que les dashed
                      if (label === "Déc") {
                        return entry.dataKey === "emailDashed" || entry.dataKey === "smsDashed";
                      }
                      // Pour les autres mois, n'afficher que email et sms
                      return entry.dataKey === "email" || entry.dataKey === "sms";
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
                              {entry.dataKey === "email" || entry.dataKey === "emailDashed" ? "Email" : "SMS"}:
                            </span>
                            <span className="font-medium text-foreground">
                              {entry.value?.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                {/* Lignes continues pour les données complètes (Jan-Nov) */}
                <Line
                  type="monotone"
                  dataKey="email"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Email"
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  connectNulls={false}
                  animationDuration={1500}
                  animationBegin={0}
                />
                <Line
                  type="monotone"
                  dataKey="sms"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  name="SMS"
                  dot={{ fill: "hsl(var(--accent))", r: 4 }}
                  connectNulls={false}
                  animationDuration={1500}
                  animationBegin={0}
                />
                {/* Lignes pointillées pour Nov-Déc (données incomplètes) */}
                <Line
                  type="monotone"
                  dataKey="emailDashed"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  connectNulls
                  legendType="none"
                  animationDuration={800}
                  animationBegin={1400}
                />
                <Line
                  type="monotone"
                  dataKey="smsDashed"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--accent))", r: 4 }}
                  connectNulls
                  legendType="none"
                  animationDuration={800}
                  animationBegin={1400}
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
                <p className="text-xs text-muted-foreground mt-1">Taux opt-in SMS</p>
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
