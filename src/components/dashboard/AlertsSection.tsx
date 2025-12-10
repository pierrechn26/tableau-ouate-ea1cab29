import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Check,
  Lightbulb,
  TrendingUp,
  Undo2,
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
    id: "tendance-1",
    type: "insight",
    title: "Tendance post-accouchement",
    description:
      "+18% de clientes mentionnent des cicatrices post-césarienne",
    action: "Ajuster recommandations pour inclure soins cicatrices spécifiques",
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
    id: "bundle-1",
    type: "success",
    title: "Performance bundles",
    description:
      "Les recommandations de packs complets génèrent +47% de conversion vs produits individuels",
    action: "Étendre la stratégie bundle aux autres personas",
    priority: "low",
  },
];

const priorityOrder = { high: 0, medium: 1, low: 2 };

const ALERTS_STORAGE_KEY = "alerts-dismissed-state";

export function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (saved) {
      try {
        const dismissedIds = JSON.parse(saved) as string[];
        return initialAlerts
          .filter((alert) => !dismissedIds.includes(alert.id))
          .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      } catch {
        return [...initialAlerts].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      }
    }
    return [...initialAlerts].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  });

  const [lastDismissed, setLastDismissed] = useState<Alert | null>(null);

  const dismissAlert = (id: string) => {
    const alertToDismiss = alerts.find((a) => a.id === id);
    if (alertToDismiss) {
      setLastDismissed(alertToDismiss);
    }
    setAlerts((prev) => {
      const newAlerts = prev.filter((alert) => alert.id !== id);
      const dismissedIds = initialAlerts
        .filter((alert) => !newAlerts.find((a) => a.id === alert.id))
        .map((alert) => alert.id);
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(dismissedIds));
      return newAlerts;
    });
  };

  const undoLastDismiss = () => {
    if (!lastDismissed) return;
    setAlerts((prev) => {
      const newAlerts = [...prev, lastDismissed]
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      const dismissedIds = initialAlerts
        .filter((alert) => !newAlerts.find((a) => a.id === alert.id))
        .map((alert) => alert.id);
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(dismissedIds));
      return newAlerts;
    });
    setLastDismissed(null);
  };

  const highPriorityCount = alerts.filter((a) => a.priority === "high").length;

  const getAlertStyles = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-l-destructive bg-destructive/5";
      case "medium":
        return "border-l-4 border-l-amber-400 bg-amber-50/50";
      case "low":
        return "border-l-4 border-l-green-500 bg-green-50/50";
    }
  };

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "info":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "insight":
        return <Lightbulb className="w-5 h-5 text-primary" />;
      case "success":
        return <TrendingUp className="w-5 h-5 text-green-600" />;
    }
  };

  const getPriorityBadge = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="bg-destructive text-white border-0 text-xs">
            Haute
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">
            Moyenne
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-100 text-green-700 border-0 text-xs">
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
        <div className="flex items-center gap-2">
          {lastDismissed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={undoLastDismiss}
              className="text-muted-foreground hover:text-primary gap-1.5"
            >
              <Undo2 className="w-4 h-4" />
              Annuler
            </Button>
          )}
          {highPriorityCount > 0 && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="font-semibold text-sm">
                {highPriorityCount} alerte{highPriorityCount > 1 ? "s" : ""} haute priorité
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert) => (
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
              className={`rounded-lg p-5 ${getAlertStyles(alert.priority)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{getIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-foreground">
                        {alert.title}
                      </h4>
                      {getPriorityBadge(alert.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground/70">Action →</span>
                      <span className="text-foreground">{alert.action}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="text-muted-foreground hover:text-green-600 hover:bg-green-50 gap-1.5 flex-shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Marquer comme lu</span>
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {alerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-muted-foreground bg-muted/30 rounded-xl"
          >
            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="font-medium text-foreground">Toutes les alertes ont été traitées !</p>
            <p className="text-sm mt-1">Revenez plus tard pour de nouvelles recommandations.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
