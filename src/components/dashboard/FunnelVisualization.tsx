import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  MousePointer, 
  Play, 
  Mail,
  CheckCircle, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  Heart,
  AlertTriangle,
  Lightbulb,
  TrendingDown
} from "lucide-react";

const funnelSteps = [
  { label: "Visite du site", value: 45230, percentage: 100, icon: Globe },
  { label: "Vues diagnostic", value: 12580, percentage: 27.8, icon: MousePointer },
  { label: "Diagnostic démarré", value: 9845, percentage: 21.8, icon: Play },
  { label: "Optin E-mail & SMS", value: 8200, percentage: 18.1, icon: Mail },
  { label: "Diagnostic complété", value: 7100, percentage: 15.7, icon: CheckCircle },
  { label: "Recommandation affichée", value: 6850, percentage: 15.1, icon: Package },
  { label: "Ajout panier", value: 5400, percentage: 11.9, icon: ShoppingCart },
  { label: "Checkout", value: 4200, percentage: 9.3, icon: CreditCard },
  { label: "Achat", value: 3754, percentage: 8.3, icon: Heart },
];

const frictions = [
  {
    step: "Vues diagnostic",
    issue: "CTA diagnostic peu visible sur la homepage",
    recommendation: "Repositionner le CTA en zone hero avec un design plus contrasté"
  },
  {
    step: "Diagnostic complété",
    issue: "42% d'abandon sur les questions budget/texture",
    recommendation: "Simplifier ces questions ou les répartir avec du contenu intermédiaire"
  },
  {
    step: "Ajout panier",
    issue: "Les pages produits manquent de preuves sociales",
    recommendation: "Ajouter avis clients (4+ étoiles) et garantie satisfait ou remboursé"
  }
];

export function FunnelVisualization() {
  const getLoss = (index: number) => {
    if (index === 0) return null;
    const current = funnelSteps[index];
    const previous = funnelSteps[index - 1];
    const lossVolume = previous.value - current.value;
    const lossPercent = ((lossVolume / previous.value) * 100).toFixed(0);
    return { percent: lossPercent, volume: lossVolume };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading">
          Tunnel de Conversion
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Parcours client complet avec zones de friction détectées
        </p>
      </div>

      {/* Funnel Card */}
      <Card className="border-border/50 shadow-lg overflow-hidden">
        <CardContent className="p-8 md:p-12">
          <div className="space-y-4">
            {funnelSteps.map((step, index) => {
              const Icon = step.icon;
              const loss = getLoss(index);
              // Width directly proportional to percentage, minimum 20% for content readability
              const widthPercent = Math.max(20, step.percentage);
              
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.4 }}
                  className="flex items-center gap-4 md:gap-8"
                >
                  {/* Funnel Bar */}
                  <div className="flex-1 flex justify-center">
                    <div
                      className="h-14 md:h-16 rounded-xl flex items-center justify-between px-4 md:px-6 transition-all duration-300 hover:scale-[1.01] cursor-default shadow-md"
                      style={{
                        width: `${widthPercent}%`,
                        minWidth: '280px',
                        background: `linear-gradient(135deg, hsl(348 83% 47%) 0%, hsl(330 81% 60%) 100%)`,
                      }}
                    >
                      {/* Left: Icon + Label */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-medium text-sm hidden sm:block">
                          {step.label}
                        </span>
                      </div>

                      {/* Right: Percentage + Volume */}
                      <div className="text-right">
                        <div className="text-white font-bold text-base md:text-lg">
                          {step.percentage}%
                        </div>
                        <div className="text-white/80 text-xs">
                          {step.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Loss Indicator - More prominent */}
                  <div className="w-28 md:w-36 flex-shrink-0">
                    {loss && (
                      <div className="flex items-center gap-2 p-2 md:p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                        <TrendingDown className="w-4 h-4 text-destructive flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-destructive">
                            -{loss.percent}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            -{loss.volume.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-10 pt-8 border-t border-border/30">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-center p-4 md:p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/10"
            >
              <p className="text-2xl md:text-3xl font-bold text-foreground">8.3%</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Taux de conversion
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="text-center p-4 md:p-6 rounded-2xl bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/10"
            >
              <p className="text-2xl md:text-3xl font-bold text-destructive">41 476</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Visiteurs perdus
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="text-center p-4 md:p-6 rounded-2xl bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/10"
            >
              <p className="text-2xl md:text-3xl font-bold text-green-600">+23%</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Potentiel d'optimisation
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="text-center p-4 md:p-6 rounded-2xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/10"
            >
              <p className="text-2xl md:text-3xl font-bold text-blue-600">3:42</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Temps moyen
              </p>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Frictions & Recommendations */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-heading font-semibold text-foreground flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            Frictions détectées & Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {frictions.map((friction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                className="p-5 rounded-xl bg-muted/30 border border-border/50 space-y-4"
              >
                {/* Step Badge */}
                <Badge variant="outline" className="text-xs font-medium">
                  {friction.step}
                </Badge>

                {/* Friction */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {friction.issue}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {friction.recommendation}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
