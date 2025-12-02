import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AlertCircle, Sparkles, TrendingDown } from "lucide-react";

interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
  loss: number;
}

const funnelSteps: FunnelStep[] = [
  { label: "Visite du site", value: 45230, percentage: 100, loss: 0 },
  { label: "Clic diagnostic", value: 12580, percentage: 27.8, loss: 32650 },
  { label: "Diagnostic démarré", value: 9845, percentage: 21.8, loss: 2735 },
  { label: "Diagnostic complété", value: 6234, percentage: 13.8, loss: 3611 },
  { label: "Recommandation affichée", value: 6123, percentage: 13.5, loss: 111 },
  { label: "Page produit visitée", value: 4567, percentage: 10.1, loss: 1556 },
  { label: "Ajout panier", value: 2890, percentage: 6.4, loss: 1677 },
  { label: "Checkout", value: 2234, percentage: 4.9, loss: 656 },
  { label: "Achat", value: 1789, percentage: 4.0, loss: 445 },
  { label: "Satisfaction (NPS 8+)", value: 1523, percentage: 85.1, loss: 266 },
];

const frictions = [
  {
    title: "CTA diagnostic peu visible",
    description: "Le bouton de démarrage du diagnostic n'est pas assez mis en avant sur la homepage",
    recommendation: "Repositionner le CTA en zone hero avec un design plus contrasté"
  },
  {
    title: "Bloc décisions trop complexe",
    description: "Les questions Q5-Q7 génèrent 42% d'abandon (budget, texture, ingrédients)",
    recommendation: "Simplifier ces questions ou les répartir avec du contenu intermédiaire"
  },
  {
    title: "Manque de preuves sociales",
    description: "Les pages produits manquent d'avis clients et de garanties visibles",
    recommendation: "Ajouter avis clients (4+ étoiles) et garantie satisfait ou remboursé 30j"
  },
  {
    title: "Frais de livraison surprise",
    description: "Les frais de livraison ne sont révélés qu'au checkout, causant des abandons",
    recommendation: "Afficher les frais dès l'ajout au panier + seuil livraison offerte visible"
  }
];

export function FunnelVisualization() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Funnel de Conversion
        </h2>
        <p className="text-muted-foreground">
          Parcours client complet avec zones de friction détectées
        </p>
      </div>

      <Card className="p-8 border-0 bg-gradient-to-br from-card to-secondary/20 shadow-[var(--shadow-medium)]">
        {/* Funnel Visualization */}
        <div className="relative flex flex-col items-center space-y-2 mb-8">
          {funnelSteps.map((step, index) => {
            const width = Math.max(step.percentage, 12);
            const isLast = index === funnelSteps.length - 1;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 }}
                className="w-full flex justify-center"
              >
                <div
                  className="relative rounded-lg overflow-hidden bg-gradient-to-r from-primary/30 to-accent/30 hover:shadow-[var(--shadow-soft)] transition-all duration-300 backdrop-blur-sm border border-primary/20"
                  style={{
                    width: `${width}%`,
                    minWidth: '200px'
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary bg-background/80 px-2 py-0.5 rounded">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-foreground text-sm">
                          {step.label}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">
                        {step.value.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {isLast ? step.percentage.toFixed(1) + "%" : step.percentage.toFixed(1) + "%"}
                        </span>
                        {step.loss > 0 && (
                          <span className="flex items-center gap-1 text-destructive font-semibold">
                            <TrendingDown className="w-3 h-3" />
                            -{step.loss.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 pointer-events-none" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 pt-6 border-t border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">4.0%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Taux de conversion global
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">43 306</p>
            <p className="text-xs text-muted-foreground mt-1">
              Visiteurs perdus
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">+23%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Potentiel d'optimisation
            </p>
          </div>
        </div>

        {/* Frictions & Recommendations */}
        <div className="space-y-4 pt-6 border-t border-border/50">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Frictions détectées & Recommandations IA
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frictions.map((friction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="space-y-2"
              >
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-destructive text-sm">{friction.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{friction.description}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-primary text-sm">Recommandation</p>
                      <p className="text-xs text-muted-foreground mt-1">{friction.recommendation}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
