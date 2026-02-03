import { motion } from "framer-motion";
import { Eye, ExternalLink, Play, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DIAGNOSTIC_URL = "https://www.ouate-paris.com/pages/diagnostic-de-peau";

export function DiagnosticPreview() {
  const handleOpenDiagnostic = () => {
    window.open(DIAGNOSTIC_URL, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-card via-card to-muted/30 rounded-xl border border-border/50 p-6 shadow-md"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-foreground/5">
            <Eye className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground font-heading">
              Votre diagnostic
            </h3>
            <p className="text-sm text-muted-foreground">
              Prévisualisez l'expérience client en temps réel
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-2 border-dashed border-border/50 overflow-hidden">
        <div className="p-8 md:p-12 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6"
          >
            <Play className="w-10 h-10 text-primary" />
          </motion.div>

          {/* Title */}
          <motion.h4
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-heading"
          >
            Diagnostic de peau OUATE
          </motion.h4>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mb-8 max-w-lg mx-auto"
          >
            Testez l'expérience de vos clients en lançant le diagnostic personnalisé. 
            Chaque complétion sera automatiquement synchronisée sur ce dashboard.
          </motion.p>

          {/* Device preview icons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-center gap-6 mb-8"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <Monitor className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Desktop</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <Smartphone className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Mobile</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleOpenDiagnostic}
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 px-8 py-6 text-base font-medium rounded-xl"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Lancer le diagnostic
            </Button>
          </motion.div>

          {/* URL display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <code className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              {DIAGNOSTIC_URL}
            </code>
          </motion.div>
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Propulsé par Ask-It × OUATE</span>
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Webhook connecté
        </span>
      </div>
    </motion.div>
  );
}
