import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { usePersonaPriorities } from "@/hooks/usePersonaPriorities";
import { usePersonaProfiles } from "@/hooks/usePersonaProfiles";

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
  personaCode: string | null;
  mainMetric: string;
  mainMetricColor: string;
  secondaryMetrics: string;
  explanation: string;
}

function CategoryCard({ emoji, title, borderColor, personaCode, mainMetric, mainMetricColor, secondaryMetrics, explanation }: CategoryCardProps) {
  const { profiles: dbProfiles } = usePersonaProfiles();
  const dbProfile = personaCode ? dbProfiles.find(p => p.code === personaCode) : null;
  const fullLabel = dbProfile?.full_label ?? "";
  const labelParts = fullLabel.split(" — ");
  const displayName = labelParts[0] || personaCode || "";
  const titleStr = labelParts.slice(1).join(" — ") || "";
  const image = personaCode ? PERSONA_IMAGES[personaCode] : null;
  const color = personaCode ? PERSONA_COLORS[personaCode] || "200 60% 50%" : "200 60% 50%";

  if (!personaCode || !dbProfile) {
    return (
      <Card className="p-5 opacity-50">
        <p className="text-base font-bold">{emoji} {title}</p>
        <p className="text-sm text-muted-foreground mt-2">Données insuffisantes</p>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden h-full flex flex-col" style={{ borderTop: `3px solid ${borderColor}` }}>
        {/* Category header */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-base font-bold text-foreground">{emoji} {title}</p>
        </div>

        {/* Persona winner */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3 mt-1 mb-3">
            {image && (
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2" style={{ borderColor: `hsl(${color})` }}>
                <img src={image} alt={displayName} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground leading-tight">
                {displayName}
              </p>
              <p className="text-sm text-muted-foreground">{titleStr}</p>
            </div>
          </div>

          {/* Main metric */}
          <p className="text-2xl font-extrabold mt-3" style={{ color: mainMetricColor }}>
            {mainMetric}
          </p>

          {/* Secondary metrics */}
          <p className="text-sm text-muted-foreground mt-1.5">{secondaryMetrics}</p>
        </div>

        {/* Explanation */}
        <div className="px-5 pb-5 mt-auto">
          <p className="text-sm text-foreground/70 leading-relaxed">{explanation}</p>
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
  const { profiles: dbProfiles } = usePersonaProfiles();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-muted/30 via-card to-muted/20 rounded-xl border border-border/50 p-6 shadow-sm">
        {showTitle && <p className="text-lg font-bold text-foreground mb-4">🏆 Top 3 Personas du mois</p>}
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
        {showTitle && <p className="text-lg font-bold text-foreground mb-2">🏆 Top 3 Personas du mois</p>}
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
          <p className="text-lg font-bold text-foreground">🏆 Top 3 Personas du mois</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-5">
        Basé sur les 30 derniers jours de données — mis à jour en temps réel
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CategoryCard
          emoji="🎯"
          title="Meilleur ROI Acquisition"
          borderColor="hsl(142 70% 45%)"
          personaCode={bestROI?.code || null}
          mainMetric={bestROI ? `${bestROI.valuePerSession.toFixed(2)}€ / session` : "–"}
          mainMetricColor="hsl(142 70% 40%)"
          secondaryMetrics={bestROI ? [
            `Taux de conversion : ${bestROI.convRate}%`,
            `AOV : ${bestROI.aov.toFixed(0)}€`,
            bestROI.avgChildAge != null ? `Âge moyen enfants : ${bestROI.avgChildAge} ans` : null,
          ].filter(Boolean).join(" · ") : ""}
          explanation="Le persona qui génère le plus de revenu par visite du diagnostic. C'est celui à cibler en priorité dans vos publicités."
        />

        <CategoryCard
          emoji="🚀"
          title="Plus gros levier de croissance"
          borderColor="hsl(25 90% 55%)"
          personaCode={bestGrowth?.code || null}
          mainMetric={bestGrowth ? `${bestGrowth.convRate}% de conversion (moy. ${globalConvRate}%)` : "–"}
          mainMetricColor="hsl(25 85% 50%)"
          secondaryMetrics={bestGrowth ? [
            `AOV : ${bestGrowth.aov.toFixed(0)}€`,
            `${bestGrowth.volume} sessions`,
            bestGrowth.avgChildAge != null ? `Âge moyen enfants : ${bestGrowth.avgChildAge} ans` : null,
          ].filter(Boolean).join(" · ") : ""}
          explanation="Le persona avec le plus gros potentiel d'amélioration. En améliorant son taux de conversion vers la moyenne, c'est là que le CA additionnel sera le plus important."
        />

        <CategoryCard
          emoji="💎"
          title="Meilleur potentiel de fidélisation"
          borderColor="hsl(270 60% 55%)"
          personaCode={bestLTV?.code || null}
          mainMetric={bestLTV?.avgChildAge != null ? `Âge moyen enfants : ${bestLTV.avgChildAge} ans` : "–"}
          mainMetricColor="hsl(270 55% 50%)"
          secondaryMetrics={bestLTV ? [
            `Opt-in email : ${bestLTV.optinEmailPct}%`,
            `Multi-enfants : ${bestLTV.multiChildrenPct}%`,
            `AOV : ${bestLTV.aov.toFixed(0)}€`,
          ].join(" · ") : ""}
          explanation="Le persona avec le plus fort potentiel à long terme. Enfants jeunes, forte capacité de recontact email et potentiel multi-produits."
        />
      </div>
    </div>
  );
}
