import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Star,
  Loader2,
  AlertCircle,
  RotateCcw,
  Check,
  Copy,
  BookOpen,
  Target,
  Lightbulb,
} from "lucide-react";
import { PersonaBadge } from "./shared/PersonaBadge";
import { FormatBadge } from "./shared/FormatBadge";
import { type Recommendation } from "@/hooks/useMarketingRecommendations";
import { getPersonaLabel } from "@/constants/personas";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────

function safeStr(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const CATEGORY_LABELS: Record<string, string> = {
  ads: "Ads",
  emails: "Emailing",
  offers: "Offres",
};

const CATEGORY_COLORS: Record<string, string> = {
  ads: "bg-primary/15 text-primary border-primary/30",
  emails: "bg-secondary/15 text-secondary border-secondary/30",
  offers: "bg-accent/15 text-accent-foreground border-accent/30",
};

const STATUS_OPTIONS = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminée" },
] as const;

// ── Copy Button (icon only) ────────────────────────────────────────

function CopyIcon({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1 rounded hover:bg-muted/60 transition-colors"
      title="Copier"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <CopyIcon text={value} />
      </div>
      <div className="bg-muted/40 rounded-lg border border-border/50 px-3 py-2.5 text-xs text-foreground">
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between py-1.5 text-xs border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right max-w-[60%]">{safeStr(value)}</span>
    </div>
  );
}

// ── Collapsible Section ────────────────────────────────────────────

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/40">
      <button
        className="w-full flex items-center gap-2 py-3 px-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon className="w-4 h-4 text-primary/70" />
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-1 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Content renderers per category ──────────────────────────────────

function AdsContent({ content }: { content: any }) {
  if (!content) return null;
  return (
    <div className="space-y-1">
      <CopyBlock label="Hook texte" value={safeStr(content.hook_text)} />
      {content.hook_audio && <CopyBlock label="Hook audio" value={safeStr(content.hook_audio)} />}
      <CopyBlock label="Script / Descriptif" value={safeStr(content.script_ou_descriptif)} />
      {content.ad_copy && (
        <div className="border-t border-border/30 pt-3 mt-3">
          <CopyBlock label="Primary Text" value={safeStr(content.ad_copy?.primary_text)} />
          <CopyBlock label="Headline" value={safeStr(content.ad_copy?.headline)} />
          <CopyBlock label="Description" value={safeStr(content.ad_copy?.description)} />
        </div>
      )}
      {content.cta && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">CTA :</span>
          <Badge variant="outline" className="text-xs font-bold text-primary border-primary/40 bg-primary/5">{safeStr(content.cta)}</Badge>
        </div>
      )}
    </div>
  );
}

function EmailsContent({ content }: { content: any }) {
  if (!content) return null;
  return (
    <div className="space-y-1">
      <CopyBlock label="Objet" value={safeStr(content.objet)} />
      {content.objet_variante && <CopyBlock label="Objet variante A/B" value={safeStr(content.objet_variante)} />}
      {Array.isArray(content.contenu_sections) && content.contenu_sections.map((s: any, i: number) => (
        <CopyBlock key={i} label={safeStr(s.section)} value={safeStr(s.contenu)} />
      ))}
      {content.cta && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">CTA :</span>
          <Badge variant="outline" className="text-xs font-bold text-primary border-primary/40 bg-primary/5">{safeStr(content.cta?.texte || content.cta)}</Badge>
        </div>
      )}
    </div>
  );
}

function OffersContent({ content }: { content: any }) {
  if (!content) return null;
  return (
    <div className="space-y-3">
      {content.concept && <CopyBlock label="Concept" value={safeStr(content.concept)} />}
      {content.type_offre && <InfoRow label="Type d'offre" value={content.type_offre} />}
      {Array.isArray(content.composition) && content.composition.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Composition</p>
          <div className="space-y-1">
            {content.composition.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2.5 py-1.5 border border-border/40">
                <span className="font-medium text-foreground">{safeStr(p.produit)}</span>
                <span className="text-muted-foreground">{safeStr(p.role)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {content.pricing && (
        <div className="bg-primary/5 rounded-lg border border-primary/15 px-3 py-2.5 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground line-through">{safeStr(content.pricing.prix_normal)}</span>
            <span className="text-primary font-bold text-sm">{safeStr(content.pricing.prix_offre)}</span>
            {content.pricing.economie && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">{safeStr(content.pricing.economie)}</Badge>}
          </div>
        </div>
      )}
      {content.messaging && (
        <div className="space-y-1">
          <CopyBlock label="Message Ads" value={safeStr(content.messaging.ads)} />
          <CopyBlock label="Message Email" value={safeStr(content.messaging.email)} />
          <CopyBlock label="Message Site" value={safeStr(content.messaging.site)} />
        </div>
      )}
      {content.plan_lancement_resume && <CopyBlock label="Plan de lancement" value={safeStr(content.plan_lancement_resume)} />}
    </div>
  );
}

function AdsTargeting({ targeting }: { targeting: any }) {
  if (!targeting) return null;
  return (
    <div>
      {Array.isArray(targeting.audiences) && targeting.audiences.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Audiences</p>
          <ul className="space-y-1">
            {targeting.audiences.map((a: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      <InfoRow label="Budget suggéré" value={targeting.budget_suggere} />
      <InfoRow label="Plateforme" value={targeting.plateforme} />
      {targeting.kpi_attendu && <InfoRow label="KPI attendu" value={`${safeStr(targeting.kpi_attendu.metrique)} : ${safeStr(targeting.kpi_attendu.valeur_cible)}`} />}
      {targeting.ab_test && <CopyBlock label="Suggestion A/B test" value={safeStr(targeting.ab_test)} />}
    </div>
  );
}

function EmailsTargeting({ targeting }: { targeting: any }) {
  if (!targeting) return null;
  return (
    <div>
      <InfoRow label="Segment Klaviyo" value={targeting.segment} />
      <InfoRow label="Timing" value={targeting.timing} />
      {targeting.position_dans_flow && <InfoRow label="Position dans le flow" value={targeting.position_dans_flow} />}
      {targeting.kpi_attendu && (
        <>
          <InfoRow label="Taux d'ouverture visé" value={targeting.kpi_attendu.taux_ouverture_vise} />
          <InfoRow label="Taux de clic visé" value={targeting.kpi_attendu.taux_clic_vise} />
        </>
      )}
    </div>
  );
}

function OffersTargeting({ targeting }: { targeting: any }) {
  if (!targeting) return null;
  return (
    <div>
      <InfoRow label="Canal" value={targeting.canal} />
      <InfoRow label="Période" value={targeting.periode} />
      <InfoRow label="Durée" value={targeting.duree} />
      {targeting.kpi_attendu && <InfoRow label="KPI attendu" value={`${safeStr(targeting.kpi_attendu.metrique)} : ${safeStr(targeting.kpi_attendu.valeur_cible)}`} />}
    </div>
  );
}

const SOURCE_ICONS: Record<string, string> = {
  source_marketing: "📊",
  inspiration_marque: "💡",
  ad_concurrent: "📱",
  email_concurrent: "📧",
  offre_concurrent: "🏷️",
};

function SourcesList({ sources }: { sources: any[] }) {
  if (!sources || sources.length === 0) return <p className="text-xs text-muted-foreground">Aucune source disponible.</p>;
  return (
    <div className="space-y-2">
      {sources.map((s: any, i: number) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span>{SOURCE_ICONS[s.type] || "📄"}</span>
          <div>
            <span className="font-medium text-foreground">{safeStr(s.source_name)}</span>
            {s.description && <p className="text-muted-foreground">{safeStr(s.description)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

interface RecommendationCardProps {
  recommendation: Recommendation;
  onGenerateContent: (id: string) => void;
  onStatusChange: (id: string, status: "todo" | "in_progress" | "done") => void;
  category: "ads" | "emails" | "offers";
}

export function RecommendationCard({ recommendation: rec, onGenerateContent, onStatusChange, category }: RecommendationCardProps) {
  const status = rec.generation_status;
  const isComplete = status === "complete";
  const isPending = status === "pending";
  const isGenerating = status === "generating";
  const isError = status === "error";
  const isDone = rec.action_status === "done";

  const personaLabel = rec.persona_code ? getPersonaLabel(rec.persona_code) : rec.persona_cible;
  const formatSuggere = rec.pre_calculated_context?.generation_instructions ? undefined : undefined;
  const contentFormat = rec.content?.format || rec.pre_calculated_context?.format_suggere;

  // Priority indicator
  const priorityLabel = rec.priority === 1 ? "★ Priorité haute" : rec.priority === 2 ? "★★ Moyenne" : "★★★ Basse";
  const priorityColor = rec.priority === 1 ? "text-primary" : rec.priority === 2 ? "text-accent" : "text-muted-foreground";

  return (
    <Card className={cn(
      "border overflow-hidden transition-all duration-200",
      isPending && "border-dashed border-border/80 bg-muted/10",
      isGenerating && "border-primary/30 bg-primary/5",
      isError && "border-destructive/30",
      isDone && "opacity-60",
      isComplete && !isDone && "border-border/60 shadow-sm hover:shadow-md"
    )}>
      <div className="p-4 space-y-3">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
              <span className={cn("text-[10px] font-bold", priorityColor)}>{priorityLabel}</span>
              {contentFormat && <FormatBadge value={contentFormat} />}
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold", CATEGORY_COLORS[category])}>
                {CATEGORY_LABELS[category]}
              </Badge>
            </div>
            <h4 className="text-sm font-bold text-foreground leading-snug">{safeStr(rec.title) || "Recommandation"}</h4>
            {personaLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Pour {personaLabel}
              </p>
            )}
          </div>
          {rec.persona_code && (
            <div className="shrink-0">
              <PersonaBadge code={rec.persona_code} />
            </div>
          )}
        </div>

        {/* ── Status selector (complete only) ── */}
        {isComplete && (
          <div className="flex items-center gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onStatusChange(rec.id, opt.value)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium",
                  rec.action_status === opt.value
                    ? opt.value === "done"
                      ? "bg-primary text-primary-foreground border-primary"
                      : opt.value === "in_progress"
                      ? "bg-accent/20 text-accent-foreground border-accent/40"
                      : "bg-muted text-foreground border-border"
                    : "bg-transparent text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                )}
              >
                {opt.value === "done" && rec.action_status === "done" && <Check className="w-3 h-3 inline mr-0.5" />}
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Brief (always visible) ── */}
        {rec.brief && (
          <p className="text-[13px] text-foreground/80 leading-relaxed">{rec.brief}</p>
        )}

        {/* ── Pending: CTA button ── */}
        {isPending && (
          <Button
            onClick={() => onGenerateContent(rec.id)}
            className="w-full mt-2"
            size="sm"
          >
            Voir la recommandation complète →
          </Button>
        )}

        {/* ── Generating: loader ── */}
        {isGenerating && (
          <div className="flex flex-col items-center gap-2 py-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Génération en cours... ~30 secondes</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary/60 rounded-full"
                initial={{ width: "5%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 30, ease: "linear" }}
              />
            </div>
          </div>
        )}

        {/* ── Error: retry ── */}
        {isError && (
          <div className="flex items-center gap-2 mt-1">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive">La génération a échoué.</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => onGenerateContent(rec.id)}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Réessayer
            </Button>
          </div>
        )}

        {/* ── Complete: collapsible sections ── */}
        {isComplete && rec.content && Object.keys(rec.content).length > 0 && (
          <div className="mt-1">
            <CollapsibleSection title="Contenu créatif" icon={BookOpen}>
              {category === "ads" && <AdsContent content={rec.content} />}
              {category === "emails" && <EmailsContent content={rec.content} />}
              {category === "offers" && <OffersContent content={rec.content} />}
            </CollapsibleSection>

            <CollapsibleSection title="Ciblage & mise en œuvre" icon={Target}>
              {category === "ads" && <AdsTargeting targeting={rec.targeting} />}
              {category === "emails" && <EmailsTargeting targeting={rec.targeting} />}
              {category === "offers" && <OffersTargeting targeting={rec.targeting} />}
            </CollapsibleSection>

            <CollapsibleSection title="Sources & inspirations" icon={Lightbulb}>
              <SourcesList sources={Array.isArray(rec.sources_inspirations) ? rec.sources_inspirations : []} />
            </CollapsibleSection>
          </div>
        )}
      </div>
    </Card>
  );
}
