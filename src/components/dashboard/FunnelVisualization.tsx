import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, Sparkles } from "lucide-react";

interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
  loss: number;
  friction?: string;
  recommendation?: string;
}

const funnelSteps: FunnelStep[] = [
  { label: "Visite du site", value: 45230, percentage: 100, loss: 0 },
  {
    label: "Clic diagnostic",
    value: 12580,
    percentage: 27.8,
    loss: 32650,
    friction: "CTA pas assez visible",
    recommendation: "Repositionner le CTA en hero",
  },
  { label: "Diagnostic démarré", value: 9845, percentage: 21.8, loss: 2735 },
  {
    label: "Diagnostic complété",
    value: 6234,
    percentage: 13.8,
    loss: 3611,
    friction: "Questions Q5-Q7 génèrent 42% d'abandon",
    recommendation: "Simplifier le bloc décisions",
  },
  { label: "Recommandation affichée", value: 6123, percentage: 13.5, loss: 111 },
  {
    label: "Page produit visitée",
    value: 4567,
    percentage: 10.1,
    loss: 1556,
    friction: "Manque de preuves sociales",
    recommendation: "Ajouter avis clients + garantie",
  },
  { label: "Ajout panier", value: 2890, percentage: 6.4, loss: 1677 },
  { label: "Checkout", value: 2234, percentage: 4.9, loss: 656 },
  {
    label: "Achat",
    value: 1789,
    percentage: 4.0,
    loss: 445,
    friction: "Frais de livraison surprise",
    recommendation: "Afficher les frais plus tôt",
  },
  { label: "Satisfaction (NPS 8+)", value: 1523, percentage: 85.1, loss: 266 },
];

export function FunnelVisualization() {
  return (
    <Card className="p-8 border-0 bg-gradient-to-br from-card to-secondary/20 shadow-[var(--shadow-medium)]">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Funnel de Conversion
          </h2>
          <p className="text-muted-foreground">
            Parcours client complet avec zones de friction détectées
          </p>
        </div>

        <div className="space-y-3">
          {funnelSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative"
            >
              {/* Main step bar */}
              <div
                className="relative rounded-lg overflow-hidden bg-gradient-to-r from-primary/20 to-accent/20 hover:shadow-[var(--shadow-soft)] transition-all duration-300"
                style={{
                  width: `${Math.max(step.percentage, 10)}%`,
                }}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold text-primary bg-background/80 px-2 py-0.5 rounded">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-foreground text-sm">
                        {step.label}
                      </h4>
                      {step.friction && (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-bold text-foreground">
                        {step.value.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        {step.percentage.toFixed(1)}%
                      </span>
                      {step.loss > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <TrendingDown className="w-3 h-3" />-
                          {step.loss.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 pointer-events-none" />
              </div>

              {/* Friction details */}
              {step.friction && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 ml-8 space-y-2"
                >
                  <div className="flex items-start gap-2 text-sm bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">
                        Friction détectée
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {step.friction}
                      </p>
                    </div>
                  </div>
                  {step.recommendation && (
                    <div className="flex items-start gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-primary">
                          Recommandation IA
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {step.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-border/50 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">4.0%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Taux de conversion global
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">6</p>
            <p className="text-xs text-muted-foreground mt-1">
              Points de friction
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">+23%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Potentiel d'optimisation
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
