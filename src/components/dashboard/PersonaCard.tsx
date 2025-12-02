import { motion } from "framer-motion";
import { TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PersonaCardProps {
  name: string;
  tagline: string;
  image: string;
  ageRange: string;
  situation: string;
  prospectPercentage: number;
  psychology: string;
  problems: string[];
  keyNeeds: string[];
  behaviors: string[];
  topProducts: string[];
  aiInsights: string[];
  index: number;
}

export function PersonaCard({
  name,
  tagline,
  image,
  ageRange,
  situation,
  prospectPercentage,
  psychology,
  problems,
  keyNeeds,
  behaviors,
  topProducts,
  aiInsights,
  index,
}: PersonaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-card/80 to-secondary/40 backdrop-blur-sm shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)] transition-all duration-300 h-full">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 p-1 shadow-lg">
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{ageRange}</p>
                <Badge 
                  variant="secondary" 
                  className="mt-1.5 bg-gradient-to-r from-primary/15 to-accent/15 text-primary border-primary/30 font-medium"
                >
                  {situation}
                </Badge>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-gradient-to-r from-primary/25 to-accent/25 text-foreground font-bold px-3 py-1.5 whitespace-nowrap shadow-sm"
            >
              {prospectPercentage}% de vos prospects
            </Badge>
          </div>

          {/* Psychology */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
              Psychologie
            </h4>
            <p className="text-xs text-foreground/80 leading-relaxed">{psychology}</p>
          </div>

          {/* Problems */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
              Problématiques
            </h4>
            <ul className="space-y-1">
              {problems.map((problem, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <AlertCircle className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80 leading-relaxed">{problem}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Needs */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
              Besoins clés
            </h4>
            <ul className="space-y-1">
              {keyNeeds.map((need, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80 leading-relaxed">{need}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Behaviors */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
              Comportements
            </h4>
            <ul className="space-y-1">
              {behaviors.map((behavior, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <TrendingUp className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80 leading-relaxed">{behavior}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Products */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
              Top produits recommandés
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topProducts.map((product, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20">
                  {product}
                </Badge>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <motion.div 
            className="space-y-2 pt-3 border-t border-border/50 bg-gradient-to-br from-primary/5 to-accent/5 -mx-6 -mb-6 px-6 py-4 rounded-b-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                Insights IA
              </h4>
            </div>
            <div className="space-y-2">
              {aiInsights.map((insight, i) => (
                <motion.p
                  key={i}
                  className="text-xs text-foreground/90 leading-relaxed pl-2 border-l-2 border-primary/30"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.4 + i * 0.1 }}
                >
                  {insight}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
