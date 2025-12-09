import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AlertCircle, Sparkles, Eye, MousePointer, Play, CheckCircle, Package, ShoppingCart, CreditCard, Heart, Star } from "lucide-react";

interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
  loss: number;
  icon: React.ReactNode;
}

const funnelSteps: FunnelStep[] = [
  { label: "Visite du site", value: 45230, percentage: 100, loss: 0, icon: <Eye className="w-5 h-5" /> },
  { label: "Clic diagnostic", value: 12580, percentage: 27.8, loss: 32650, icon: <MousePointer className="w-5 h-5" /> },
  { label: "Diagnostic démarré", value: 9845, percentage: 21.8, loss: 2735, icon: <Play className="w-5 h-5" /> },
  { label: "Diagnostic complété", value: 6234, percentage: 13.8, loss: 3611, icon: <CheckCircle className="w-5 h-5" /> },
  { label: "Recommandation affichée", value: 6123, percentage: 13.5, loss: 111, icon: <Package className="w-5 h-5" /> },
  { label: "Page produit visitée", value: 4567, percentage: 10.1, loss: 1556, icon: <Eye className="w-5 h-5" /> },
  { label: "Ajout panier", value: 2890, percentage: 6.4, loss: 1677, icon: <ShoppingCart className="w-5 h-5" /> },
  { label: "Checkout", value: 2234, percentage: 4.9, loss: 656, icon: <CreditCard className="w-5 h-5" /> },
  { label: "Achat", value: 1789, percentage: 4.0, loss: 445, icon: <Heart className="w-5 h-5" /> },
  { label: "Satisfaction (NPS 8+)", value: 1523, percentage: 85.1, loss: 266, icon: <Star className="w-5 h-5" /> },
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

function FunnelShape({ steps }: { steps: FunnelStep[] }) {
  const totalSteps = steps.length;
  const baseWidth = 100;
  const minWidth = 20;
  
  return (
    <div className="relative flex flex-col items-center py-8">
      {steps.map((step, index) => {
        const widthPercent = baseWidth - ((baseWidth - minWidth) * (index / (totalSteps - 1)));
        const nextWidthPercent = index < totalSteps - 1 
          ? baseWidth - ((baseWidth - minWidth) * ((index + 1) / (totalSteps - 1)))
          : widthPercent * 0.8;
        
        // Calculate opacity for gradient effect (darker as we go down)
        const opacity = 0.6 + (index / totalSteps) * 0.4;
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className="relative w-full flex items-center justify-center"
            style={{ marginBottom: index < totalSteps - 1 ? '-1px' : 0 }}
          >
            {/* Left label */}
            <div className="absolute left-0 w-1/4 text-right pr-6 z-10">
              <p className="text-sm font-medium text-foreground truncate">{step.label}</p>
              <p className="text-2xl font-bold text-primary">{step.percentage.toFixed(1)}%</p>
            </div>
            
            {/* Trapezoid shape */}
            <div className="relative" style={{ width: '50%' }}>
              <svg 
                viewBox="0 0 200 50" 
                className="w-full h-14"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`funnelGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={opacity} />
                    <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity={opacity} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={opacity} />
                  </linearGradient>
                </defs>
                <polygon 
                  points={`${100 - widthPercent},0 ${100 + widthPercent},0 ${100 + nextWidthPercent},50 ${100 - nextWidthPercent},50`}
                  fill={`url(#funnelGradient-${index})`}
                  className="transition-all duration-300"
                />
              </svg>
              
              {/* Icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center text-white/90">
                {step.icon}
              </div>
            </div>
            
            {/* Right label - Step number and loss */}
            <div className="absolute right-0 w-1/4 pl-6 flex items-center gap-3 z-10">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/30">
                <span className="text-xs font-bold text-primary">{index + 1}</span>
              </div>
              {step.loss > 0 && (
                <span className="text-xs text-muted-foreground">
                  <span className="text-destructive font-medium">-{step.loss.toLocaleString()}</span>
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function FunnelVisualization() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2 font-heading">
          Funnel de Conversion
        </h2>
        <p className="text-muted-foreground">
          Parcours client complet avec zones de friction détectées
        </p>
      </div>

      <Card className="p-8 bg-card border border-border/50 shadow-md">
        {/* Funnel Visualization */}
        <FunnelShape steps={funnelSteps} />

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 pt-6 border-t border-border/50">
          {funnelSteps.slice(0, 5).map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.05 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary">
                {step.icon}
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[80px] truncate">{step.label}</p>
              <p className="text-sm font-bold text-primary">{step.percentage.toFixed(1)}%</p>
            </motion.div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/50">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5">
            <p className="text-3xl font-bold text-foreground">4.0%</p>
            <p className="text-sm text-muted-foreground mt-1">
              Taux de conversion global
            </p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-destructive/5 to-destructive/10">
            <p className="text-3xl font-bold text-destructive">43 306</p>
            <p className="text-sm text-muted-foreground mt-1">
              Visiteurs perdus
            </p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/10">
            <p className="text-3xl font-bold text-green-600">+23%</p>
            <p className="text-sm text-muted-foreground mt-1">
              Potentiel d'optimisation
            </p>
          </div>
        </div>

        {/* Frictions & Recommendations */}
        <div className="space-y-4 pt-8 mt-8 border-t border-border/50">
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
                transition={{ delay: 1 + index * 0.1 }}
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
