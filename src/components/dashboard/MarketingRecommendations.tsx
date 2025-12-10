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
} from "lucide-react";
import { useState } from "react";
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
      <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Checklist hebdomadaire
          </h3>
        </div>

        <div className="space-y-3">
          {items.map((action) => (
            <Collapsible
              key={action.id}
              open={expandedItems.includes(action.id)}
              onOpenChange={() => toggleExpanded(action.id)}
            >
              <div
                className={`rounded-xl border transition-all duration-200 ${
                  action.completed
                    ? "bg-primary/5 border-primary/30"
                    : "bg-background border-border/50 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  <Checkbox
                    checked={action.completed}
                    onCheckedChange={() => toggleItem(action.id)}
                  />
                  <span
                    className={`flex-1 text-sm font-medium ${
                      action.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {action.title}
                  </span>
                  <CollapsibleTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                      {expandedItems.includes(action.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 pt-0"
                    >
                      <div className="pl-8 space-y-4">
                        {action.details.map((detail, idx) => (
                          <div key={idx} className="space-y-2">
                            <h5 className="text-xs font-semibold text-primary uppercase tracking-wide">
                              {detail.section}
                            </h5>
                            <ul className="space-y-1.5">
                              {detail.items.map((item, itemIdx) => (
                                <li
                                  key={itemIdx}
                                  className="text-xs text-muted-foreground pl-3 border-l-2 border-primary/30"
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

        {/* Progress */}
        <div className="mt-6 p-4 rounded-xl bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary">Progression</span>
            <span className="text-sm font-bold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
          {progress === 100 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium text-primary mt-2 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Bravo ! Vous avez complété toutes les recommandations marketing de la semaine 🎉
            </motion.p>
          )}
        </div>
      </Card>

      {/* Section 2: Recommandations complètes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recommendationCategories.map((category, index) => {
          const Icon = category.icon;
          const isFullWidth = category.id === "bundles";
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={isFullWidth ? "lg:col-span-2" : ""}
            >
              <Card className="p-6 h-full bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 shadow-md">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2.5 rounded-xl ${category.bgColor}`}>
                    <Icon className={`w-5 h-5 ${category.color}`} />
                  </div>
                  <h3 className={`text-lg font-semibold ${category.color}`}>
                    {category.title}
                  </h3>
                </div>

                <div className={`space-y-5 ${isFullWidth ? "grid grid-cols-1 md:grid-cols-3 gap-6 space-y-0" : ""}`}>
                  {category.sections.map((section, sectionIdx) => (
                    <div
                      key={sectionIdx}
                      className="p-4 rounded-xl bg-muted/30 border border-border/30"
                    >
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        {section.title}
                      </h4>
                      <ul className="space-y-2">
                        {section.items.map((item, itemIdx) => (
                          <li
                            key={itemIdx}
                            className="text-xs text-muted-foreground pl-3 border-l-2 border-primary/30 leading-relaxed"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
