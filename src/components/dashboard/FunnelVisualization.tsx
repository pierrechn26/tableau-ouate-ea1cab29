import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AlertCircle, Sparkles, Eye, MousePointer, Play, CheckCircle, Package, ShoppingCart, CreditCard, Heart, Star, TrendingDown } from "lucide-react";

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

export function FunnelVisualization() {
  const totalSteps = funnelSteps.length;
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2 font-heading">
          Funnel de Conversion
        </h2>
        <p className="text-muted-foreground">
          Parcours client complet avec zones de friction détectées
        </p>
      </div>

      <Card className="p-10 bg-card border border-border/50 shadow-md overflow-hidden">
        {/* Funnel Container */}
        <div className="relative max-w-4xl mx-auto">
          {/* SVG Funnel Shape */}
          <svg 
            viewBox="0 0 400 500" 
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
              </linearGradient>
              <filter id="funnelShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15"/>
              </filter>
            </defs>
            
            {/* Main Funnel Shape */}
            <motion.path
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              d="M50,20 L350,20 L280,480 L120,480 Z"
              fill="url(#funnelGradient)"
              filter="url(#funnelShadow)"
              className="drop-shadow-lg"
            />
            
            {/* Horizontal divider lines */}
            {funnelSteps.map((_, index) => {
              if (index === 0) return null;
              const y = 20 + (index * 46);
              const leftX = 50 + (index * 7);
              const rightX = 350 - (index * 7);
              return (
                <motion.line
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  x1={leftX}
                  y1={y}
                  x2={rightX}
                  y2={y}
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* Step icons */}
            {funnelSteps.map((step, index) => {
              const y = 20 + (index * 46) + 23;
              return (
                <motion.g
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.08 }}
                >
                  <circle cx="200" cy={y} r="14" fill="white" fillOpacity="0.25" />
                </motion.g>
              );
            })}
          </svg>

          {/* Left Labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-6" style={{ width: '35%' }}>
            {funnelSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.08 }}
                className="flex flex-col items-end pr-4 text-right"
              >
                <p className="text-sm font-medium text-foreground leading-tight">{step.label}</p>
                <p className="text-xl font-bold text-primary">{step.percentage.toFixed(1)}%</p>
              </motion.div>
            ))}
          </div>

          {/* Right Labels */}
          <div className="absolute right-0 top-0 h-full flex flex-col justify-between py-6" style={{ width: '35%' }}>
            {funnelSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.08 }}
                className="flex items-center gap-3 pl-4"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/30 text-primary">
                  <span className="text-sm font-bold">{index + 1}</span>
                </div>
                {step.loss > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <TrendingDown className="w-3 h-3" />
                    <span className="text-sm font-medium">-{step.loss.toLocaleString()}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-6 mt-16 pt-8 border-t border-border/30">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/10"
          >
            <p className="text-4xl font-bold text-foreground">4.0%</p>
            <p className="text-sm text-muted-foreground mt-2">
              Taux de conversion global
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="text-center p-6 rounded-2xl bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/10"
          >
            <p className="text-4xl font-bold text-destructive">43 306</p>
            <p className="text-sm text-muted-foreground mt-2">
              Visiteurs perdus
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/10"
          >
            <p className="text-4xl font-bold text-green-600">+23%</p>
            <p className="text-sm text-muted-foreground mt-2">
              Potentiel d'optimisation
            </p>
          </motion.div>
        </div>
      </Card>

      {/* Frictions & Recommendations - Separate Card */}
      <Card className="p-8 bg-card border border-border/50 shadow-md">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          Frictions détectées & Recommandations IA
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {frictions.map((friction, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 + index * 0.1 }}
              className="space-y-3"
            >
              <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-destructive">{friction.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{friction.description}</p>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">Recommandation</p>
                    <p className="text-sm text-muted-foreground mt-1">{friction.recommendation}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
