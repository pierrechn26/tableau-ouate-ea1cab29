import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Megaphone,
  Mail,
  Gift,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  Video,
  Zap,
  Users,
  TrendingUp,
  Tag,
  Percent,
  ShoppingCart,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChecklistAction {
  id: string;
  title: string;
  completed: boolean;
  details: {
    section: string;
    items: string[];
  }[];
}

interface RecommendationCategory {
  id: string;
  title: string;
  icon: any;
  color: string;
  bgColor: string;
  sections: {
    title: string;
    items: string[];
  }[];
}

const checklistActions: ChecklistAction[] = [
  {
    id: "action-1",
    title: 'Lancer campagne Meta "Peur vergetures 1er trimestre"',
    completed: false,
    details: [
      {
        section: "Hooks créatifs",
        items: [
          "Tester une créa type UGC : \"Enceinte j'étais terrifiée par les vergetures... Voici la routine que j'ai utilisée pour les éviter\"",
          "\"Voici ce que ton dermatologue ne te dira jamais pour éviter les vergetures quand t'es enceinte\"",
          "\"78% des mamans regrettent de ne pas avoir fait ça pendant leur grossesse\"",
        ],
      },
      {
        section: "Concepts vidéo",
        items: [
          "Avant/après vergetures postpartum - témoignage authentique",
          "Routine 1er trimestre expliquée par une sage-femme",
          "ASMR application huile anti-vergetures",
        ],
      },
      {
        section: "Ciblage",
        items: [
          "Femmes 25-35 ans, intérêts grossesse/maternité",
          "Lookalike acheteurs crème vergetures",
          "Retargeting visiteurs page diagnostic",
        ],
      },
    ],
  },
  {
    id: "action-2",
    title: "Créer vidéo UGC routine postpartum Sophie",
    completed: false,
    details: [
      {
        section: "Brief créatif",
        items: [
          "Jeune maman épuisée : sa routine soin en 2 minutes chrono",
          "Montrer le manque de temps + solution rapide",
          "Ton empathique et réaliste",
        ],
      },
      {
        section: "Points clés à inclure",
        items: [
          "Mention des 2 produits essentiels seulement",
          "Résultats visibles en 2 semaines",
          "Témoignage authentique et émotionnel",
        ],
      },
    ],
  },
  {
    id: "action-3",
    title: 'Envoyer flow email "Emma anxieuse" aux nouvelles inscrites',
    completed: false,
    details: [
      {
        section: "Structure du flow",
        items: [
          "J1 : Email de bienvenue réassurant + guide 1er trimestre",
          "J3 : Éducation ingrédients safe pour bébé",
          "J5 : Routine personnalisée selon trimestre",
          "J7 : Témoignage maman + offre spéciale",
        ],
      },
      {
        section: "Lignes d'objet suggérées",
        items: [
          "\"Emma, voici ta routine 1er trimestre personnalisée\"",
          "\"Ces ingrédients sont-ils safe pour bébé ? La réponse\"",
          "\"Une maman comme toi partage son expérience 💕\"",
        ],
      },
    ],
  },
  {
    id: "action-4",
    title: 'Tester bundle "Pack 1er trimestre" à 89€',
    completed: false,
    details: [
      {
        section: "Composition du pack",
        items: [
          "Crème anti-vergetures 200ml",
          "Huile douce massage 100ml",
          "Gel nettoyant doux 150ml",
          "Valeur totale : 112€ → Prix pack : 89€ (-20%)",
        ],
      },
      {
        section: "Arguments de vente",
        items: [
          "Tout ce qu'il faut pour le 1er trimestre",
          "Routine complète validée par des sages-femmes",
          "Économie de 23€ vs achat séparé",
        ],
      },
    ],
  },
  {
    id: "action-5",
    title: 'Optimiser page produit avec badge "safe grossesse"',
    completed: false,
    details: [
      {
        section: "Éléments à ajouter",
        items: [
          "Badge vert \"Validé safe grossesse\" bien visible",
          "Section réassurance ingrédients en haut de page",
          "Avis filtrés de mamans enceintes",
        ],
      },
      {
        section: "Tests A/B suggérés",
        items: [
          "Position du badge : sous le prix vs sous le titre",
          "Couleur du badge : vert vs bleu pastel",
          "Texte : \"Safe grossesse\" vs \"Approuvé par des mamans\"",
        ],
      },
    ],
  },
];

const recommendationCategories: RecommendationCategory[] = [
  {
    id: "ads",
    title: "Ads (Meta / TikTok)",
    icon: Megaphone,
    color: "text-primary",
    bgColor: "bg-primary/10",
    sections: [
      {
        title: "Hooks créatifs",
        items: [
          "\"Enceinte et terrifiée par les vergetures ? Voici ce que les dermatologues recommandent vraiment\"",
          "\"Jeune maman épuisée : ta routine soin en 2 minutes chrono\"",
          "\"Pourquoi 78% des mamans regrettent d'avoir acheté ces produits grossesse\"",
        ],
      },
      {
        title: "Concepts vidéo",
        items: [
          "Avant/après vergetures postpartum - témoignage Sophie",
          "Routine 1er trimestre expliquée par sage-femme",
          "Composition décryptée : ce qui est vraiment safe",
        ],
      },
      {
        title: "Angles psychologiques",
        items: [
          "Fear of missing out : \"Ne faites pas ces 5 erreurs pendant votre grossesse\"",
          "Réassurance scientifique : \"Approuvé par 340 dermatologues\"",
          "Simplicité : \"3 produits. C'est tout ce dont tu as besoin.\"",
        ],
      },
    ],
  },
  {
    id: "email",
    title: "Email Marketing",
    icon: Mail,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    sections: [
      {
        title: "Flows automatisés",
        items: [
          "Flow Emma : J1 éducation ingrédients → J3 routine trimestre → J7 testimonial",
          "Flow Sophie : J1 bénéfices rapides → J3 avant/après → J5 bundle postpartum",
          "Flow Léa : J1 transparence composition → J4 vidéo scientifique → J8 offre loyauté",
        ],
      },
      {
        title: "Lignes d'objet",
        items: [
          "\"Emma, voici ta routine 1er trimestre personnalisée\"",
          "\"Sophie : 3 produits pour retrouver confiance en 2 min/jour\"",
          "\"Les 2 ingrédients que Léa vérifie toujours (et vous ?)\"",
        ],
      },
      {
        title: "Segmentation optimisée",
        items: [
          "Tag \"postpartum 0-6 mois\" → routine Sophie en 2 produits",
          "Tag \"1er trimestre\" → contenu éducatif composition",
          "Tag \"multipare\" → offres bundles + argumentaire scientifique",
        ],
      },
    ],
  },
  {
    id: "bundles",
    title: "Offres & Bundles",
    icon: Gift,
    color: "text-accent",
    bgColor: "bg-accent/10",
    sections: [
      {
        title: "Bundles personnalisés",
        items: [
          "Pack Emma \"1er trimestre serein\" : Crème vergetures + huile douce + gel nettoyant → 89€",
          "Pack Sophie \"Routine express\" : Sérum réparateur + crème raffermissante → 59€",
          "Pack Léa \"Pure & Clean\" : Gamme bio complète + analyse composition → 129€",
        ],
      },
      {
        title: "Prix psychologiques",
        items: [
          "Seuil 89€ (sous les 90€) pour pack découverte",
          "Offre \"-20% sur le 2e produit\" vs \"-10% sur tout\"",
          "Livraison offerte dès 65€ (panier moyen actuel : 58€)",
        ],
      },
      {
        title: "Upsells intelligents",
        items: [
          "Après ajout crème visage → proposer sérum (taux acceptation : 23%)",
          "Post-achat J+7 → email routine complète avec -15%",
          "Panier > 80€ → mini-format offert (coût 3€, valeur perçue 12€)",
        ],
      },
    ],
  },
];

// Hook for animated counter
function useAnimatedCounter(value: number, duration: number = 400) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    previousValue.current = value;
  }, [value, duration]);

  return displayValue;
}

export function MarketingRecommendations() {
  const [items, setItems] = useState(checklistActions);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const animatedProgress = useAnimatedCounter(Math.round(progress), 500);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading">
          Marketing IA Hub
        </h2>
        <p className="text-muted-foreground">
          Recommandations actionnables basées sur vos personas
        </p>
      </div>

      {/* Section 1: Checklist hebdomadaire */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-card to-accent/5 border-2 border-primary/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground font-heading">
                Checklist hebdomadaire
              </h3>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{items.length} actions complétées
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-primary">{animatedProgress}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
            />
          </div>
        </div>

        {progress === 100 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="p-4 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-primary font-heading mb-2">
              Bravo ! 🎉
            </h3>
            <p className="text-lg text-foreground font-medium">
              Vous avez complété toutes les recommandations marketing de la semaine
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {items.map((action) => (
              <Collapsible
                key={action.id}
                open={expandedItems.includes(action.id)}
                onOpenChange={() => toggleExpanded(action.id)}
              >
                <div
                  className={`rounded-xl border-2 transition-all duration-200 ${
                    action.completed
                      ? "bg-primary/10 border-primary/40"
                      : "bg-background border-border hover:border-primary/40 hover:shadow-md"
                  }`}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 p-4 cursor-pointer">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={action.completed}
                          onCheckedChange={() => toggleItem(action.id)}
                          className="h-5 w-5"
                        />
                      </div>
                      <span
                        className={`flex-1 text-sm font-medium ${
                          action.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {action.title}
                      </span>
                      <div className="flex items-center gap-2 text-primary">
                        <span className="text-xs font-medium">Voir le détail</span>
                        {expandedItems.includes(action.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4 pt-0"
                      >
                        <div className="pl-8 space-y-4 border-t border-border/50 pt-4 mt-1">
                          {action.details.map((detail, idx) => (
                            <div key={idx} className="space-y-2">
                              <h5 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                {detail.section}
                              </h5>
                              <ul className="space-y-2">
                                {detail.items.map((item, itemIdx) => (
                                  <li
                                    key={itemIdx}
                                    className="text-xs text-foreground bg-muted/50 rounded-lg p-2.5 border border-border/50"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </Card>

      {/* Section 2: Recommandations complètes */}
      <div>
        <h3 className="text-xl font-bold text-foreground font-heading mb-4">
          Recommandations complètes
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recommendationCategories.map((category, index) => {
            const Icon = category.icon;
            const isFullWidth = category.id === "bundles";
            
            const getSectionIcon = (title: string) => {
              if (title.includes("Hook")) return Lightbulb;
              if (title.includes("Concept") || title.includes("vidéo")) return Video;
              if (title.includes("Angle")) return Target;
              if (title.includes("Flow")) return TrendingUp;
              if (title.includes("Ligne") || title.includes("objet")) return Mail;
              if (title.includes("Segmentation")) return Users;
              if (title.includes("Bundle")) return Gift;
              if (title.includes("Prix")) return Tag;
              if (title.includes("Upsell")) return ShoppingCart;
              return Zap;
            };
            
            const getSectionColor = (categoryId: string, sectionIdx: number) => {
              const colors = {
                ads: ["bg-primary/10 border-primary/30", "bg-accent/10 border-accent/30", "bg-secondary/10 border-secondary/30"],
                email: ["bg-secondary/10 border-secondary/30", "bg-primary/10 border-primary/30", "bg-accent/10 border-accent/30"],
                bundles: ["bg-accent/10 border-accent/30", "bg-secondary/10 border-secondary/30", "bg-primary/10 border-primary/30"],
              };
              return colors[categoryId as keyof typeof colors]?.[sectionIdx] || "bg-muted/30 border-border/30";
            };
            
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={isFullWidth ? "lg:col-span-2" : ""}
              >
                <Card className="p-6 h-full bg-gradient-to-br from-card via-card to-muted/20 border-2 border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`p-3 rounded-xl ${category.bgColor} shadow-sm`}>
                      <Icon className={`w-6 h-6 ${category.color}`} />
                    </div>
                    <h3 className={`text-lg font-bold ${category.color}`}>
                      {category.title}
                    </h3>
                  </div>

                  <div className={`space-y-4 ${isFullWidth ? "grid grid-cols-1 md:grid-cols-3 gap-5 space-y-0" : ""}`}>
                    {category.sections.map((section, sectionIdx) => {
                      const SectionIcon = getSectionIcon(section.title);
                      const sectionColor = getSectionColor(category.id, sectionIdx);
                      
                      return (
                        <div
                          key={sectionIdx}
                          className={`p-4 rounded-xl border-2 ${sectionColor} transition-all duration-200 hover:shadow-md`}
                        >
                          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                            <SectionIcon className="w-4 h-4 text-primary" />
                            {section.title}
                          </h4>
                          <ul className="space-y-2.5">
                            {section.items.map((item, itemIdx) => (
                              <li
                                key={itemIdx}
                                className="text-xs text-foreground bg-background/80 rounded-lg p-3 border border-border/50 leading-relaxed shadow-sm"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
