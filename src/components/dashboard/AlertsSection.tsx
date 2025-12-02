import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Lightbulb,
} from "lucide-react";

interface Alert {
  type: "warning" | "info" | "success" | "insight";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

const alerts: Alert[] = [
  {
    type: "warning",
    title: "Friction majeure détectée",
    description:
      "Le bloc de décision 'Préoccupations principales' génère 42% d'abandon. Temps moyen : 3min12s vs 45s attendu.",
    priority: "high",
  },
  {
    type: "warning",
    title: "Baisse de conversion persona Sophie",
    description:
      "Le persona Sophie (jeune maman postpartum) affiche une baisse de conversion de -14% cette semaine vs semaine précédente.",
    priority: "high",
  },
  {
    type: "info",
    title: "Temps anormal sur thème 'Texture préférée'",
    description:
      "Le temps moyen sur cette question est en hausse de +38%. Possible incompréhension ou trop d'options.",
    priority: "medium",
  },
  {
    type: "insight",
    title: "Nouveau besoin émergent : maux de dos",
    description:
      "32% des répondantes mentionnent spontanément 'douleurs dorsales' dans les commentaires libres. Opportunité produit ?",
    priority: "medium",
  },
  {
    type: "insight",
    title: "Cicatrices post-accouchement en hausse",
    description:
      "+18% de clientes mentionnent des préoccupations liées aux cicatrices. Ajuster les recommandations pour Sophie et Léa.",
    priority: "medium",
  },
  {
    type: "success",
    title: "Performance exceptionnelle sur recommandations bundles",
    description:
      "Les recommandations de packs complets génèrent +47% de conversion vs produits individuels cette semaine.",
    priority: "low",
  },
];

export function AlertsSection() {
  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return {
          bg: "bg-destructive/5 border-destructive/30",
          icon: AlertTriangle,
          iconColor: "text-destructive",
        };
      case "info":
        return {
          bg: "bg-blue-500/5 border-blue-500/30",
          icon: Clock,
          iconColor: "text-blue-500",
        };
      case "success":
        return {
          bg: "bg-green-500/5 border-green-500/30",
          icon: TrendingUp,
          iconColor: "text-green-500",
        };
      case "insight":
        return {
          bg: "bg-primary/5 border-primary/30",
          icon: Lightbulb,
          iconColor: "text-primary",
        };
    }
  };

  const getPriorityBadge = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            Priorité haute
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-accent/20 text-accent-foreground border-accent/30">
            Priorité moyenne
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            Info
          </Badge>
        );
    }
  };

  return (
    <Card className="p-8 bg-background border border-border shadow-sm">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2 font-heading">
            Insights & Alertes Intelligentes
          </h2>
          <p className="text-muted-foreground">
            Détection automatique des opportunités et points d'attention
          </p>
        </div>

        <div className="grid gap-4">
          {alerts.map((alert, index) => {
            const { bg, icon: Icon, iconColor } = getAlertStyles(alert.type);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`p-4 rounded-xl border ${bg} hover:shadow-[var(--shadow-soft)] transition-all duration-300`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg bg-background/80 ${iconColor}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm">
                        {alert.title}
                      </h3>
                      {getPriorityBadge(alert.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
