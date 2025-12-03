import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DiagnosticOption {
  id: string;
  label: string;
  description?: string;
}

const diagnosticQuestion = {
  title: "Où en êtes-vous dans votre maternité ?",
  subtitle: "Cette question nous permet de personnaliser votre routine de soins",
  options: [
    {
      id: "pregnant-1",
      label: "Je suis enceinte (1er trimestre)",
      description: "0-12 semaines"
    },
    {
      id: "pregnant-2",
      label: "Je suis enceinte (2ème trimestre)",
      description: "13-26 semaines"
    },
    {
      id: "pregnant-3",
      label: "Je suis enceinte (3ème trimestre)",
      description: "27-40 semaines"
    },
    {
      id: "postpartum",
      label: "Je suis jeune maman",
      description: "Post-accouchement"
    },
    {
      id: "trying",
      label: "J'essaie de concevoir",
      description: "Projet bébé"
    }
  ] as DiagnosticOption[]
};

export function DiagnosticPreview() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleContinue = () => {
    if (selectedOption) {
      setShowResult(true);
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setShowResult(false);
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
        {showResult && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            Recommencer
          </Button>
        )}
      </div>

      {/* Diagnostic Interface Preview */}
      <Card className="bg-white border-2 border-foreground/10 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-foreground px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold text-lg tracking-wide">
              TALM
            </span>
            <span className="text-white/70 text-sm">
              Diagnostic personnalisé
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Question 1 sur 8</span>
            <span>12%</span>
          </div>
          <Progress value={12} className="h-1 bg-muted" />
        </div>

        {/* Question Content */}
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h4 className="text-2xl md:text-3xl font-bold text-foreground mb-3 font-heading">
                      {diagnosticQuestion.title}
                    </h4>
                    <p className="text-muted-foreground text-sm md:text-base">
                      {diagnosticQuestion.subtitle}
                    </p>
                  </motion.div>
                </div>

                {/* Options */}
                <div className="space-y-3 max-w-lg mx-auto">
                  {diagnosticQuestion.options.map((option, index) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                      onClick={() => handleSelect(option.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedOption === option.id
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {option.label}
                          </p>
                          {option.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {option.description}
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedOption === option.id
                              ? "border-foreground bg-foreground"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selectedOption === option.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-white"
                            />
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Continue Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 flex justify-center"
                >
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedOption}
                    className="bg-foreground text-white hover:bg-foreground/90 px-8 py-6 text-base font-medium rounded-xl"
                  >
                    Continuer
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-6"
                >
                  <Sparkles className="w-8 h-8 text-foreground" />
                </motion.div>
                <h4 className="text-2xl font-bold text-foreground mb-3 font-heading">
                  Aperçu terminé
                </h4>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Voici comment vos clients expérimentent votre diagnostic. 
                  Les 7 questions suivantes sont adaptées en temps réel selon leurs réponses.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-foreground/20"
                  >
                    Recommencer l'aperçu
                  </Button>
                  <Button className="bg-foreground text-white hover:bg-foreground/90">
                    Voir toutes les questions
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Propulsé par Ask-It</span>
            <span>Mode prévisualisation</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
