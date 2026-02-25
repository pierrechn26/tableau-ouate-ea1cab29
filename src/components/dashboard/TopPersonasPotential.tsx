import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { usePersonaPriorities } from "@/hooks/usePersonaPriorities";
import { PERSONA_PROFILES } from "@/constants/personas";

import personaP1 from "@/assets/persona-p1.png";
import personaP2 from "@/assets/persona-sophie.png";
import personaP3 from "@/assets/persona-p3.png";
import personaP4 from "@/assets/persona-lea.png";
import personaP5 from "@/assets/persona-p5.png";
import personaP6 from "@/assets/persona-p6.png";
import personaP7 from "@/assets/persona-p7.png";
import personaP8 from "@/assets/persona-p8.png";
import personaP9 from "@/assets/persona-p9.png";

const PERSONA_IMAGES: Record<string, string> = {
  P1: personaP1, P2: personaP2, P3: personaP3, P4: personaP4, P5: personaP5,
  P6: personaP6, P7: personaP7, P8: personaP8, P9: personaP9,
};

const PERSONA_COLORS: Record<string, string> = {
  P1: "348 83% 47%", P2: "330 81% 60%", P3: "15 85% 55%", P4: "205 85% 55%",
  P5: "155 65% 45%", P6: "270 60% 55%", P7: "45 90% 50%", P8: "348 70% 35%", P9: "195 70% 45%",
};

interface CategoryCardProps {
  emoji: string;
  title: string;
  borderColor: string;
  bgAccent: string;
  personaCode: string | null;
  mainMetric: string;
  mainMetricColor: string;
  secondaryMetrics: string;
  explanation: string;
}

function CategoryCard({ emoji, title, borderColor, bgAccent, personaCode, mainMetric, mainMetricColor, secondaryMetrics, explanation }: CategoryCardProps) {
  const profile = personaCode ? PERSONA_PROFILES[personaCode] : null;
  const image = personaCode ? PERSONA_IMAGES[personaCode] : null;
  const color = personaCode ? PERSONA_COLORS[personaCode] || "200 60% 50%" : "200 60% 50%";

  if (!personaCode || !profile) {
    return (
      <Card className="p-5 opacity-50">
        <p className="text-sm font-semibold">{emoji} {title}</p>
        <p className="text-xs text-muted-foreground mt-2">Données insuffisantes</p>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden h-full flex flex-col" style={{ borderTop: `3px solid ${borderColor}` }}>
        {/* Category header */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-sm font-bold text-foreground">{emoji} {title}</p>
        </div>

        {/* Persona winner */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            {image && (
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2" style={{ borderColor: `hsl(${color})` }}>
                <img src={image} alt={profile.displayName} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground leading-tight">
                {profile.displayName}
              </p>
              <p className="text-xs text-muted-foreground">{profile.title}</p>
            </div>
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: `hsl(${color} / 0.12)`, color: `hsl(${color})` }}
            >
              {personaCode}
            </span>
          </div>

          {/* Main metric */}
          <p className="text-2xl font-extrabold" style={{ color: mainMetricColor }}>
            {mainMetric}
          </p>

          {/* Secondary metrics */}
          <p className="text-xs text-muted-foreground mt-1">{secondaryMetrics}</p>
        </div>

        {/* Explanation */}
        <div className="px-5 pb-4 mt-auto">
          <p className="text-xs text-muted-foreground/80 leading-relaxed">{explanation}</p>
        </div>
      </Card>
    </motion.div>
  );
}

interface TopPersonasPotentialProps {
  showTitle?: boolean;
}

export function TopPersonasPotential({ showTitle = true }: TopPersonasPotentialProps) {
  const { bestROI, bestGrowth, bestLTV, globalConvRate, isLoading } = usePersonaPriorities();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-muted/30 via-card to-muted/20 rounded-xl border border-border/50 p-6 shadow-sm">
        {showTitle && <p className="text-lg font-bold text-foreground mb-4">🏆 Top 3 Personas — Potentiel de la semaine</p>}
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  if (!bestROI && !bestGrowth && !bestLTV) {
    return (
      <div className="bg-gradient-to-br from-muted/30 via-card to-muted/20 rounded-xl border border-border/50 p-6 shadow-sm">
        {showTitle && <p className="text-lg font-bold text-foreground mb-2">🏆 Top 3 Personas — Potentiel de la semaine</p>}
        <p className="text-sm text-muted-foreground text-center py-4">
          Pas assez de données sur les 30 derniers jours pour calculer le potentiel.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-muted/30 via-card to-muted/20 rounded-xl border border-border/50 p-6 shadow-sm">
      {showTitle && (
        <div className="mb-1">
          <p className="text-lg font-bold text-foreground">🏆 Top 3 Personas — Potentiel de la semaine</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-5">
        Basé sur les 30 derniers jours de données — mis à jour en temps réel
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Catégorie 1: Meilleur ROI Acquisition */}
        <CategoryCard
          emoji="🎯"
          title="Meilleur ROI Acquisition"
          borderColor="hsl(142 70% 45%)"
          bgAccent="hsl(142 70% 45% / 0.06)"
          personaCode={bestROI?.code || null}
          mainMetric={bestROI ? `${bestROI.valuePerSession.toFixed(2)}€/session` : "–"}
          mainMetricColor="hsl(142 70% 40%)"
          secondaryMetrics={bestROI ? `Conv. ${bestROI.convRate}% · AOV ${bestROI.aov.toFixed(0)}€` : ""}
          explanation="Le persona qui génère le plus de revenu par visite du diagnostic. C'est celui à cibler en priorité dans vos publicités."
        />

        {/* Catégorie 2: Plus gros levier de croissance */}
        <CategoryCard
          emoji="🚀"
          title="Plus gros levier de croissance"
          borderColor="hsl(25 90% 55%)"
          bgAccent="hsl(25 90% 55% / 0.06)"
          personaCode={bestGrowth?.code || null}
          mainMetric={bestGrowth ? `+${bestGrowth.caManquant}€/mois` : "–"}
          mainMetricColor="hsl(25 85% 50%)"
          secondaryMetrics={bestGrowth ? `Conv. ${bestGrowth.convRate}% vs moy. ${globalConvRate}% · ${bestGrowth.volume} sessions` : ""}
          explanation="Le persona avec le plus gros manque à gagner. En améliorant son taux de conversion vers la moyenne, voici le CA additionnel estimé."
        />

        {/* Catégorie 3: Meilleur potentiel de fidélisation */}
        <CategoryCard
          emoji="💎"
          title="Meilleur potentiel de fidélisation"
          borderColor="hsl(270 60% 55%)"
          bgAccent="hsl(270 60% 55% / 0.06)"
          personaCode={bestLTV?.code || null}
          mainMetric={bestLTV ? `Score ${bestLTV.ltvScore.toFixed(2)}` : "–"}
          mainMetricColor="hsl(270 55% 50%)"
          secondaryMetrics={bestLTV ? `Âge dom. ${bestLTV.dominantAgeRange || "?"} · Opt-in ${bestLTV.optinEmailPct}% · Multi-enfants ${bestLTV.multiChildrenPct}%` : ""}
          explanation="Le persona avec le plus fort potentiel de relation à long terme, basé sur l'âge des enfants, la capacité de recontact par email et le potentiel multi-produits."
        />
      </div>
    </div>
  );
}
