import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Megaphone,
  Mail,
  Package,
  Sparkles,
  Video,
  Target,
} from "lucide-react";
import { useState } from "react";

interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  completed: boolean;
}

const recommendations: Recommendation[] = [
  {
    id: "ad-1",
    category: "Ads Meta/TikTok",
    title: "Hook créatif : 'Les 3 erreurs qui abîment votre peau pendant la grossesse'",
    description:
      "Angle fear-based testé sur Emma. CTR attendu +28%. Format carrousel avec transition douce.",
    impact: "high",
    completed: false,
  },
  {
    id: "ad-2",
    category: "Ads Meta/TikTok",
    title: "Concept vidéo UGC : routine 1er trimestre en 60s",
    description:
      "Influenceuse enceinte montre sa routine matin. Ton rassurant + focus ingrédients safe.",
    impact: "high",
    completed: false,
  },
  {
    id: "ad-3",
    category: "Ads Meta/TikTok",
    title: "Angle scientifique : 'Dermatologues recommandent...'",
    description:
      "Vidéo expert + motion design sur les actifs clés. Cible Léa (bio-consciente).",
    impact: "medium",
    completed: false,
  },
  {
    id: "email-1",
    category: "Email Marketing",
    title: "Flow automatisé Emma : Welcome + éducation produits",
    description:
      "5 emails sur 2 semaines. Email 1 : réassurance. Email 3 : guide trimestre. Email 5 : offer.",
    impact: "high",
    completed: false,
  },
  {
    id: "email-2",
    category: "Email Marketing",
    title: "Newsletter : 'Préparez votre peau au 2e trimestre'",
    description:
      "Contenu éducatif + CTA vers routine personnalisée. Segmentation par trimestre.",
    impact: "medium",
    completed: false,
  },
  {
    id: "email-3",
    category: "Email Marketing",
    title: "Ligne objet gagnante : '{{Prénom}}, votre peau vous dit merci 🤰'",
    description: "A/B testé, +34% d'open rate vs baseline. Ton chaleureux.",
    impact: "medium",
    completed: false,
  },
  {
    id: "bundle-1",
    category: "Offres & Bundles",
    title: "Pack '1er Trimestre Essentiel' pour Emma",
    description:
      "Huile anti-vergetures + crème hydratante + baume lèvres. Prix psychologique : 67€ au lieu de 82€.",
    impact: "high",
    completed: false,
  },
  {
    id: "bundle-2",
    category: "Offres & Bundles",
    title: "Bundle postpartum Sophie : routine en 2 étapes",
    description:
      "Sérum réparateur + crème raffermissante. Packaging 'gagner du temps'. 59€.",
    impact: "high",
    completed: false,
  },
  {
    id: "bundle-3",
    category: "Offres & Bundles",
    title: "Upsell intelligent : complément alimentaire",
    description:
      "Proposition après ajout soin visage. +18% d'AOV constaté sur tests.",
    impact: "medium",
    completed: false,
  },
];

export function MarketingRecommendations() {
  const [items, setItems] = useState(recommendations);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  const impactColors = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-accent/10 text-accent-foreground border-accent/20",
    low: "bg-muted text-muted-foreground border-border",
  };

  const categoryIcons: Record<string, any> = {
    "Ads Meta/TikTok": Megaphone,
    "Email Marketing": Mail,
    "Offres & Bundles": Package,
  };

  const groupedRecos = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Recommendation[]>);

  return (
    <Card className="p-8 border-0 bg-gradient-to-br from-card to-secondary/20 shadow-[var(--shadow-medium)]">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Hub Marketing IA
            </h2>
          </div>
          <p className="text-muted-foreground">
            Recommandations actionnables basées sur vos personas
          </p>
        </div>

        {/* Progress */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Progression hebdo
            </span>
            <span className="text-sm font-bold text-primary">
              {completedCount}/{items.length}
            </span>
          </div>
          <div className="h-3 bg-background/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
          {progress === 100 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium text-primary mt-2 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Bravo ! Toutes les recommandations complétées 🎉
            </motion.p>
          )}
        </div>

        {/* Recommendations by category */}
        <div className="space-y-6">
          {Object.entries(groupedRecos).map(([category, recos], catIndex) => {
            const Icon = categoryIcons[category] || Target;
            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIndex * 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{category}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {recos.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {recos.map((reco, index) => (
                    <motion.div
                      key={reco.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: catIndex * 0.1 + index * 0.05 }}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        reco.completed
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background/50 border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={reco.completed}
                          onCheckedChange={() => toggleItem(reco.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`font-medium text-sm ${
                                reco.completed
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {reco.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-xs whitespace-nowrap ${
                                impactColors[reco.impact]
                              }`}
                            >
                              {reco.impact === "high"
                                ? "Impact élevé"
                                : reco.impact === "medium"
                                ? "Impact moyen"
                                : "Impact faible"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {reco.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
