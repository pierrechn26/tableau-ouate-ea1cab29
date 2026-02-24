import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, ShoppingCart, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { usePersonaStats, PersonaStat } from "@/hooks/usePersonaStats";
import { DateRange } from "react-day-picker";

import personaP1 from "@/assets/persona-p1.png";
import personaP2 from "@/assets/persona-sophie.png";
import personaP3 from "@/assets/persona-p3.png";
import personaP4 from "@/assets/persona-lea.png";
import personaP5 from "@/assets/persona-p5.png";
import personaP6 from "@/assets/persona-p6.png";
import personaP7 from "@/assets/persona-p7.png";
import personaP8 from "@/assets/persona-p8.png";
import personaP9 from "@/assets/persona-p9.png";
import { Loader2 } from "lucide-react";

const PERSONA_COLORS: Record<string, string> = {
  P1: "348 83% 47%", P2: "330 81% 60%", P3: "15 85% 55%", P4: "205 85% 55%",
  P5: "155 65% 45%", P6: "270 60% 55%", P7: "45 90% 50%", P8: "348 70% 35%", P9: "195 70% 45%",
};

const PERSONA_META: Record<string, { name: string; title: string; image: string }> = {
  P1: { name: "Clara", title: "La Novice Imperfections", image: personaP1 },
  P2: { name: "Nathalie", title: "La Novice Pré-ado", image: personaP2 },
  P3: { name: "Amandine", title: "La Novice Atopique", image: personaP3 },
  P4: { name: "Julie", title: "La Novice Sensible", image: personaP4 },
  P5: { name: "Stéphanie", title: "La Multi-enfants", image: personaP5 },
  P6: { name: "Camille", title: "La Novice Découverte", image: personaP6 },
  P7: { name: "Sandrine", title: "L'Insatisfaite", image: personaP7 },
  P8: { name: "Virginie", title: "La Fidèle Imperfections", image: personaP8 },
  P9: { name: "Marine", title: "La Fidèle Exploratrice", image: personaP9 },
};

const KEY_ISSUES: Record<string, string[]> = {
  P1: ["Découvre les imperfections cutanées pour la première fois", "Craint d'utiliser des produits inadaptés"],
  P2: ["Le pré-ado refuse parfois d'appliquer les soins", "Hésite entre produits ado classiques et soins adaptés"],
  P3: ["Peau atopique réactive au moindre changement", "Expériences négatives avec des allergènes"],
  P4: ["Peau qui rougit facilement", "Difficulté à trouver des formulations douces"],
  P5: ["Besoins cutanés différents par enfant", "Budget multiplié par le nombre d'enfants"],
  P6: ["Se sent perdue face à la multitude de produits", "Pas encore les repères pour évaluer la qualité"],
  P7: ["Déçue par des promesses non tenues", "Très sceptique face aux arguments marketing"],
  P8: ["Cherche des solutions ciblées qui évoluent", "Besoin de recommandations personnalisées"],
  P9: ["Veut découvrir les nouveautés en avant-première", "Risque de lassitude sans innovation"],
};

const KEY_NEEDS: Record<string, string[]> = {
  P1: ["Résultats visibles rapidement", "Accompagnement pédagogique"],
  P2: ["Produits adaptés à la peau jeune", "Expérience qui implique le pré-ado"],
  P3: ["Formulations hypoallergéniques sans parfum", "Transparence totale sur les ingrédients"],
  P4: ["Textures ultra-douces, formulations minimalistes", "Routine simple en 1-2 étapes"],
  P5: ["Packs modulables par enfant", "Excellent rapport qualité-prix"],
  P6: ["Contenus éducatifs et parcours guidé", "Recommandations claires pour débutantes"],
  P7: ["Preuves concrètes d'efficacité", "Satisfaction garantie pour lever les freins"],
  P8: ["Recommandations complémentaires personnalisées", "Programme de fidélité"],
  P9: ["Accès anticipé aux nouveautés", "Programme ambassadeur"],
};

function getColor(code: string) {
  return PERSONA_COLORS[code] || "200 60% 50%";
}

function MiniPersonaCard({ persona, globalAvg }: { persona: PersonaStat; globalAvg: { conversionRate: number; aov: number } }) {
  const color = getColor(persona.code);
  const meta = PERSONA_META[persona.code];
  const convRate = persona.business ? (persona.business.conversions / Math.max(persona.count, 1)) * 100 : 0;
  const convVsGlobal = globalAvg.conversionRate > 0 ? Math.round(((convRate / globalAvg.conversionRate) - 1) * 1000) / 10 : null;
  const issues = KEY_ISSUES[persona.code] || [];
  const needs = KEY_NEEDS[persona.code] || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            {meta?.image && (
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2" style={{ borderColor: `hsl(${color})` }}>
                <img src={meta.image} alt={meta.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-base font-bold text-foreground leading-tight">
                {meta?.name || persona.name} <span className="font-medium text-muted-foreground">— {meta?.title || persona.subtitle}</span>
              </h4>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Représente {persona.percentage}% de vos prospects</p>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "hsl(348 83% 47%)" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(persona.percentage * 2, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* KPIs — 2x2 compact */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { icon: Users, label: "Volume", value: String(persona.count) },
              { icon: TrendingUp, label: "Conversion", value: `${convRate.toFixed(1)}%`, sub: convVsGlobal != null ? `${convVsGlobal > 0 ? "+" : ""}${convVsGlobal}% vs moy.` : undefined, subColor: convVsGlobal != null ? (convVsGlobal >= 0 ? "text-green-600" : "text-red-500") : "" },
              { icon: ShoppingCart, label: "AOV", value: persona.business?.aov ? `${persona.business.aov.toFixed(0)}€` : "–", sub: persona.business?.aovVsGlobal != null ? `${persona.business.aovVsGlobal > 0 ? "+" : ""}${persona.business.aovVsGlobal}% vs moy.` : undefined, subColor: persona.business?.aovVsGlobal != null ? (persona.business.aovVsGlobal >= 0 ? "text-green-600" : "text-red-500") : "" },
              { icon: Zap, label: "Engagement", value: persona.behavior?.engagementAvg != null ? `${Math.round(persona.behavior.engagementAvg)}/100` : "–" },
            ].map((kpi, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                <kpi.icon className="w-4 h-4 shrink-0" style={{ color: `hsl(${color})` }} />
                <div>
                  <p className="text-sm font-bold text-foreground">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                  {kpi.sub && <p className={`text-[11px] font-medium ${kpi.subColor}`}>{kpi.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Issues & Needs */}
        <div className="px-4 pb-4 space-y-3 flex-1 text-sm">
          {issues.length > 0 && (
            <div>
              <h5 className="font-semibold text-foreground mb-1 flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Problématiques
              </h5>
              <ul className="space-y-0.5 text-muted-foreground text-xs">
                {issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {needs.length > 0 && (
            <div>
              <h5 className="font-semibold text-foreground mb-1 flex items-center gap-1 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Besoins essentiels
              </h5>
              <ul className="space-y-0.5 text-muted-foreground text-xs">
                {needs.map((need, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{need}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

interface PersonasOverviewPreviewProps {
  dateRange?: DateRange;
  onViewAll: () => void;
}

export function PersonasOverviewPreview({ dateRange, onViewAll }: PersonasOverviewPreviewProps) {
  const { personas, isLoading, globalAvg } = usePersonaStats(dateRange);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-card via-card to-secondary/10 rounded-xl border border-border/50 p-6 shadow-md">
        <h3 className="text-xl font-bold text-foreground mb-4 font-heading">Top 3 Personas</h3>
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  const top3 = [...personas].filter(p => p.count >= 20).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-card via-card to-secondary/10 rounded-xl border border-border/50 p-6 shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-foreground font-heading">Top 3 Personas</h3>
        <button onClick={onViewAll} className="text-sm text-primary font-medium hover:underline">
          Voir tous les personas →
        </button>
      </div>

      {top3.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Pas assez de données sur cette période (minimum 20 sessions par persona).
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((p) => (
            <MiniPersonaCard key={p.code} persona={p} globalAvg={globalAvg} />
          ))}
        </div>
      )}
    </div>
  );
}
