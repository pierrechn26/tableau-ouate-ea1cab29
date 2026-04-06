import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { FormatBadge } from "./shared/FormatBadge";
import { type Recommendation } from "@/hooks/useMarketingRecommendations";
import { getPersonaDisplayName } from "@/constants/personas";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = { ads: "Ads", emails: "Emailing", offers: "Offres" };
const CATEGORY_COLORS: Record<string, string> = {
  ads: "bg-primary/15 text-primary border-primary/30",
  emails: "bg-secondary/15 text-secondary border-secondary/30",
  offers: "bg-accent/15 text-accent-foreground border-accent/30",
};

const FEEDBACK_LABELS: Record<string, { label: string; color: string }> = {
  good: { label: "🟢 Bon", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  average: { label: "🟡 Moyen", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  poor: { label: "🔴 Mauvais", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

function resolvePersonaCodes(raw: string): string {
  if (!raw) return "";
  return raw.replace(/\bP(\d{1,2})\b/g, (match) => getPersonaDisplayName(match));
}

function sanitizeAndRenderMd(text: string): string {
  if (!text) return "";
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

interface Props {
  recommendation: Recommendation;
  onNavigateToDetail: (rec: Recommendation) => void;
}

export function OverviewHistoryCard({ recommendation: rec, onNavigateToDetail }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const category = rec.category || "ads";
  const personaLabel = resolvePersonaCodes(rec.persona_cible || rec.persona_code || "");
  const contentFormat = rec.content?.format;
  const feedback = rec.feedback_score ? FEEDBACK_LABELS[rec.feedback_score] : null;

  const completedDate = rec.completed_at
    ? new Date(rec.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const kpiAttendus = rec.targeting?.kpi_attendu;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border border-border/40 bg-muted/20 shadow-none hover:shadow-sm transition-shadow overflow-hidden">
        <div className="p-4 space-y-2">
          {/* Row 1 */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-semibold bg-primary/15 text-primary border-primary/30">
                ● Terminée
              </Badge>
              {contentFormat && <FormatBadge value={contentFormat} />}
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold", CATEGORY_COLORS[category])}>
                {CATEGORY_LABELS[category] || category}
              </Badge>
            </div>
            {completedDate && <span className="text-[11px] text-muted-foreground">{completedDate}</span>}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-foreground/80 leading-snug">
            {(rec.title || "Recommandation").replace(/\bP(\d{1,2})\b/g, (m) => getPersonaDisplayName(m))}
          </h4>
          {personaLabel && <p className="text-xs text-muted-foreground">Pour {personaLabel}</p>}

          {/* Feedback row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Résultat :</span>
              {feedback ? (
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 font-semibold", feedback.color)}>
                  {feedback.label}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground/60 italic">Pas encore renseigné</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => toast({ title: "Bientôt disponible", description: "Le formulaire de résultat arrive dans la prochaine mise à jour." })}
            >
              {feedback ? "Modifier résultat" : "Ajouter résultat"}
            </Button>
          </div>

          {/* Footer: detail link + expand */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onNavigateToDetail(rec)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Voir le détail
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                {/* Brief */}
                {rec.brief && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Brief</p>
                    <p
                      className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: sanitizeAndRenderMd(rec.brief.replace(/\bP(\d{1,2})\b/g, (m) => getPersonaDisplayName(m))) }}
                    />
                  </div>
                )}

                {/* KPI attendus */}
                {kpiAttendus && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">KPI attendus</p>
                    <div className="text-xs text-foreground/80 space-y-0.5">
                      {Object.entries(kpiAttendus).map(([k, v]) => (
                        <p key={k}><span className="text-muted-foreground">{k} :</span> {String(v)}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback notes */}
                {rec.feedback_notes && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-xs text-foreground/80">{rec.feedback_notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
