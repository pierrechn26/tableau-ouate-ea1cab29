import { motion } from "framer-motion";
import { TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PersonaCardProps {
  name: string;
  tagline: string;
  image: string;
  age: number;
  traits: { label: string; value: number; color: string }[];
  icpScore: number;
  insights: string[];
  index: number;
}

export function PersonaCard({
  name,
  tagline,
  image,
  age,
  traits,
  icpScore,
  insights,
  index,
}: PersonaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-card/80 to-secondary/40 backdrop-blur-sm shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)] transition-all duration-300">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 p-1">
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{age} ans</p>
                <p className="text-sm font-medium text-primary mt-1 italic">
                  {tagline}
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-gradient-to-r from-primary/20 to-accent/20 text-foreground font-semibold px-3 py-1"
            >
              ICP {icpScore}%
            </Badge>
          </div>

          {/* Traits */}
          <div className="space-y-3">
            {traits.map((trait) => (
              <div key={trait.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">
                    {trait.label}
                  </span>
                  <span className="text-muted-foreground font-semibold">
                    {trait.value}%
                  </span>
                </div>
                <Progress value={trait.value} className="h-2" />
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Insights clés
            </h4>
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground/80 leading-relaxed">{insight}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
