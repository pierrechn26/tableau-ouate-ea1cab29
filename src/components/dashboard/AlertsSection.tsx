import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bell,
  Check,
} from "lucide-react";

interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "insight";
  title: string;
  description: string;
  action: string;
  priority: "high" | "medium" | "low";
}

const initialAlerts: Alert[] = [
  {
    id: "friction-1",
    type: "warning",
    title: "Friction détectée",
    description:
      "Le bloc \"Composition détaillée\" génère le plus de friction avec un temps moyen de 48s",
    action: "Simplifier les explications et ajouter des icônes visuelles",
    priority: "high",
  },
  {
    id: "conversion-1",
    type: "warning",
    title: "Baisse de conversion",
    description:
      "Le persona Sophie est en baisse de conversion de -14% cette semaine",
    action: "Tester proposition bundle \"Routine postpartum express\" en A/B test",
    priority: "high",
  },
  {
    id: "temps-1",
    type: "info",
    title: "Temps de réponse élevé",
    description:
      "Temps moyen sur le bloc \"Besoins spécifiques\" en hausse de +23%",
    action: "Vérifier la clarté des questions et envisager de diviser en 2 blocs",
    priority: "medium",
  },
  {
    id: "besoin-1",
    type: "insight",
    title: "Besoin émergent identifié",
    description:
      "32% des répondantes mentionnent des maux de dos liés à la grossesse",
    action: "Créer contenu éducatif + évaluer ajout produit massage/détente",
    priority: "medium",
  },
  {
    id: "tendance-1",
    type: "insight",
    title: "Tendance post-accouchement",
    description:
      "+18% de clientes mentionnent des cicatrices post-césarienne",
    action: "Ajuster recommandations pour inclure soins cicatrices spécifiques",
    priority: "high",
  },
  {
    id: "bundle-1",
    type: "success",
    title: "Performance bundles",
    description:
      "Les recommandations de packs complets génèrent +47% de conversion vs produits individuels",
    action: "Étendre la stratégie bundle aux autres personas",
    priority: "low",
  },
];

const ALERTS_STORAGE_KEY = "alerts-dismissed-state";

export function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (saved) {
      try {
        const dismissedIds = JSON.parse(saved) as string[];
        return initialAlerts.filter((alert) => !dismissedIds.includes(alert.id));
      } catch {
        return initialAlerts;
      }
    }
    return initialAlerts;
  });

  const dismissAlert = (id: string) => {
    setAlerts((prev) => {
      const newAlerts = prev.filter((alert) => alert.id !== id);
      // Save dismissed IDs to localStorage
      const dismissedIds = initialAlerts
        .filter((alert) => !newAlerts.find((a) => a.id === alert.id))
        .map((alert) => alert.id);
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(dismissedIds));
      return newAlerts;
    });
  };

  const highPriorityCount = alerts.filter((a) => a.priority === "high").length;

  const getAlertStyles = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return {
          border: "border-l-4 border-l-destructive border-t border-r border-b border-destructive/20",
          bg: "bg-destructive/5",
        };
      case "medium":
        return {
          border: "border-l-4 border-l-amber-400 border-t border-r border-b border-amber-200",
          bg: "bg-amber-50",
        };
      case "low":
        return {
          border: "border-l-4 border-l-green-400 border-t border-r border-b border-green-200",
          bg: "bg-green-50",
        };
    }
  };

  const getPriorityBadge = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="bg-destructive text-white border-0 font-medium">
            Haute
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-medium">
            Moyenne
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-300 font-medium">
            Info
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1 font-heading">
            Insights & Alertes
          </h2>
          <p className="text-muted-foreground">
            Système intelligent de détection et recommandations
          </p>
        </div>
        {highPriorityCount > 0 && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full border border-destructive/20">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="font-semibold text-sm">
              {highPriorityCount} alerte{highPriorityCount > 1 ? "s" : ""} haute priorité
            </span>
          </div>
        )}
      </div>

      {/* Alerts Card */}
      <Card className="p-6 bg-card border border-border/50 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-semibold text-foreground">Alertes actives</h3>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {alerts.map((alert) => {
              const { border, bg } = getAlertStyles(alert.priority);
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 1, x: 0 }}
                  exit={{ 
                    opacity: 0, 
                    x: 300,
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }}
                  transition={{ duration: 0.2 }}
                  className={`p-4 rounded-lg ${border} ${bg}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">
                          {alert.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    {getPriorityBadge(alert.priority)}
                  </div>

                  {/* Action recommandée */}
                  <div className="ml-8 bg-background/80 rounded-md p-3 border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Action recommandée
                    </p>
                    <p className="text-sm text-foreground">
                      {alert.action}
                    </p>
                  </div>

                  {/* Mark as read button */}
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-muted-foreground hover:text-primary hover:bg-primary/10 gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Marquer comme lu
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {alerts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-muted-foreground"
            >
              <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">Toutes les alertes ont été traitées !</p>
              <p className="text-sm mt-1">Revenez plus tard pour de nouvelles recommandations.</p>
            </motion.div>
          )}
        </div>
      </Card>
    </div>
  );
}
