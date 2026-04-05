import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Star,
  Check,
  Copy,
  BookOpen,
  Target,
  Lightbulb,
} from "lucide-react";
import { PersonaBadge } from "./shared/PersonaBadge";
import { FormatBadge } from "./shared/FormatBadge";
import { type Recommendation } from "@/hooks/useMarketingRecommendations";
import { usePersonaProfiles } from "@/hooks/usePersonaProfiles";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────

/** Resolve persona codes (P1,P2) to display names using profiles */
function resolvePersonaCodes(raw: string, getName: (code: string) => string): string {
  if (!raw) return "";
  // If it contains P followed by digit, resolve codes
  const codePattern = /\bP\d+\b/g;
  if (!codePattern.test(raw)) return raw; // Already names
  return raw.replace(/\bP\d+\b/g, (match) => getName(match));
}

function safeStr(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Render basic markdown bold (**text**) to HTML */
function renderMd(text: string): string {
  if (!text) return "";
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/** Component that renders text with markdown bold + preserved newlines */
function MdText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <span
      className={className}
      style={{ whiteSpace: "pre-line" }}
      dangerouslySetInnerHTML={{ __html: renderMd(text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) }}
    />
  );
}

/** Sanitize then render markdown */
function sanitizeAndRenderMd(text: string): string {
  if (!text) return "";
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
    <button onClick={handleCopy} className="shrink-0 p-1 rounded hover:bg-muted/60 transition-colors" title="Copier">
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
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
      <div
        className="bg-muted/40 rounded-lg border border-border/50 px-3 py-2.5 text-xs text-foreground whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: sanitizeAndRenderMd(value) }}
      />
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
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/40">
      <button className="w-full flex items-center gap-2 py-3 px-1 text-sm font-medium text-foreground hover:text-primary transition-colors" onClick={() => setOpen((o) => !o)}>
        <Icon className="w-4 h-4 text-primary/70" />
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
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
  const format = content.format || "";
  const isVideo = format.includes("video") || format.includes("ugc") || format === "story";
  const isCarousel = format === "carousel";

  if (isCarousel && Array.isArray(content.slides)) {
    return (
      <div className="space-y-1">
        {content.slides.map((s: any, i: number) => (
          <div key={i} className="mb-3">
            <CopyBlock label={`Slide ${s.numero || i + 1} — Visuel`} value={safeStr(s.visuel)} />
            <CopyBlock label={`Slide ${s.numero || i + 1} — Texte`} value={safeStr(s.texte_slide)} />
          </div>
        ))}
        <div className="border-t border-border/30 pt-3 mt-3">
          <CopyBlock label="Texte principal" value={safeStr(content.texte_principal)} />
          <CopyBlock label="Titre" value={safeStr(content.titre)} />
          <CopyBlock label="Description" value={safeStr(content.description)} />
        </div>
        {content.cta && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">CTA :</span>
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/40 bg-primary/5">{safeStr(content.cta)}</Badge>
          </div>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="space-y-1">
        <CopyBlock label="Hook" value={safeStr(content.hook || content.hook_text)} />
        <CopyBlock label="Script" value={safeStr(content.script || content.script_ou_descriptif)} />
        {content.note_production && (
          <p className="text-xs text-muted-foreground italic mt-2 px-1">{safeStr(content.note_production)}</p>
        )}
        <div className="border-t border-border/30 pt-3 mt-3">
          <CopyBlock label="Texte principal" value={safeStr(content.texte_principal || content.ad_copy?.primary_text)} />
          <CopyBlock label="Titre" value={safeStr(content.titre || content.ad_copy?.headline)} />
          <CopyBlock label="Description" value={safeStr(content.description || content.ad_copy?.description)} />
        </div>
        {content.cta && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">CTA :</span>
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/40 bg-primary/5">{safeStr(content.cta)}</Badge>
          </div>
        )}
      </div>
    );
  }

  // Image format
  return (
    <div className="space-y-1">
      {content.concept_visuel && <CopyBlock label="Concept visuel" value={safeStr(content.concept_visuel)} />}
      {!content.concept_visuel && content.hook_text && <CopyBlock label="Hook texte" value={safeStr(content.hook_text)} />}
      {!content.concept_visuel && content.script_ou_descriptif && <CopyBlock label="Descriptif visuel" value={safeStr(content.script_ou_descriptif)} />}
      <div className="border-t border-border/30 pt-3 mt-3">
        <CopyBlock label="Texte principal" value={safeStr(content.texte_principal || content.ad_copy?.primary_text)} />
        <CopyBlock label="Titre" value={safeStr(content.titre || content.ad_copy?.headline)} />
        <CopyBlock label="Description" value={safeStr(content.description || content.ad_copy?.description)} />
      </div>
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
      {content.type_offre && <InfoRow label="Type d'offre" value={OFFER_TYPE_LABELS[content.type_offre] || content.type_offre} />}
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

const OFFER_TYPE_LABELS: Record<string, string> = {
  bundle: "Bundle",
  upsell: "Upsell",
  cross_sell: "Cross-sell",
  offre_lancement: "Offre de Lancement",
  programme_fidelite: "Programme Fidélité",
  offre_saisonniere: "Offre Saisonnière",
  cadeau_avec_achat: "Cadeau avec Achat",
  vente_privee: "Vente Privée",
  parrainage: "Parrainage",
};

// ── Targeting renderers ──────────────────────────────────────────────

function AdsTargeting({ targeting }: { targeting: any }) {
  if (!targeting) return null;
  // Build KPI display
  let kpiDisplay = "";
  if (targeting.kpi_attendu) {
    const k = targeting.kpi_attendu;
    const parts = [];
    if (k.metrique && k.valeur_cible) parts.push(`${k.metrique} ${k.valeur_cible}`);
    if (k.metrique_secondaire && k.valeur_secondaire) parts.push(`${k.metrique_secondaire} ${k.valeur_secondaire}`);
    if (k.ctr) parts.push(`CTR ${k.ctr}`);
    if (k.roas) parts.push(`ROAS ${k.roas}`);
    kpiDisplay = parts.join(" · ");
  }

  return (
    <div>
      {targeting.type_audience && <InfoRow label="Type d'audience" value={targeting.type_audience} />}
      {Array.isArray(targeting.suggestions_audiences) && targeting.suggestions_audiences.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Audiences</p>
          <ul className="space-y-1">
            {targeting.suggestions_audiences.map((a: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Legacy audiences field */}
      {!targeting.suggestions_audiences && Array.isArray(targeting.audiences) && targeting.audiences.length > 0 && (
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
      {kpiDisplay && <InfoRow label="KPI attendu" value={kpiDisplay} />}
      {targeting.ab_test && <CopyBlock label="Suggestion A/B test" value={safeStr(targeting.ab_test)} />}
    </div>
  );
}

function EmailsTargeting({ targeting }: { targeting: any }) {
  if (!targeting) return null;
  let kpiDisplay = "";
  if (targeting.kpi_attendu) {
    const parts = [];
    if (targeting.kpi_attendu.taux_ouverture_vise) parts.push(`Ouverture ${targeting.kpi_attendu.taux_ouverture_vise}`);
    if (targeting.kpi_attendu.taux_clic_vise) parts.push(`Clic ${targeting.kpi_attendu.taux_clic_vise}`);
    kpiDisplay = parts.join(" · ");
  }
  return (
    <div>
      <InfoRow label="Segment" value={targeting.segment} />
      <InfoRow label="Timing" value={targeting.timing} />
      {targeting.trigger && <InfoRow label="Trigger" value={targeting.trigger} />}
      {targeting.position_dans_flow && <InfoRow label="Position dans le flow" value={targeting.position_dans_flow} />}
      {kpiDisplay && <InfoRow label="KPI attendu" value={kpiDisplay} />}
    </div>
  );
}

function OffersTargeting({ targeting }: { targeting: any }) {
  if (!targeting) return null;
  let kpiDisplay = "";
  if (targeting.kpi_attendu) {
    const k = targeting.kpi_attendu;
    const parts = [];
    if (k.metrique && k.valeur_cible) parts.push(`${k.metrique} ${k.valeur_cible}`);
    if (k.metrique_secondaire && k.valeur_secondaire) parts.push(`${k.metrique_secondaire} ${k.valeur_secondaire}`);
    kpiDisplay = parts.join(" · ");
  }
  return (
    <div>
      <InfoRow label="Canal" value={targeting.canal} />
      <InfoRow label="Période" value={targeting.periode} />
      <InfoRow label="Durée" value={targeting.duree} />
      {kpiDisplay && <InfoRow label="KPI attendu" value={kpiDisplay} />}
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
  const validSources = (sources || []).filter((s: any) => s && s.source_name && String(s.source_name).trim());
  if (validSources.length === 0) return <p className="text-xs text-muted-foreground italic">Aucune source spécifique</p>;
  return (
    <div className="space-y-2">
      {validSources.map((s: any, i: number) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span>{SOURCE_ICONS[s.type] || "📄"}</span>
          <div>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{safeStr(s.source_name)}</a>
            ) : (
              <span className="font-medium text-foreground">{safeStr(s.source_name)}</span>
            )}
            {s.description && String(s.description).trim() && <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeAndRenderMd(safeStr(s.description)) }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

interface RecommendationCardProps {
  recommendation: Recommendation;
  onStatusChange: (id: string, status: "todo" | "in_progress" | "done") => void;
  category: "ads" | "emails" | "offers";
}

export function RecommendationCard({ recommendation: rec, onStatusChange, category }: RecommendationCardProps) {
  const isDone = rec.action_status === "done";
  const { getName } = usePersonaProfiles();

  // Resolve persona_cible: prefer it if present, resolve codes to names
  const rawPersona = rec.persona_cible || rec.persona_code || "";
  const personaLabel = resolvePersonaCodes(rawPersona, getName);
  const contentFormat = rec.content?.format;

  const priorityLabel = rec.priority === 1 ? "★ Priorité haute" : rec.priority === 2 ? "★★ Moyenne" : "★★★ Basse";
  const priorityColor = rec.priority === 1 ? "text-primary" : rec.priority === 2 ? "text-accent" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "border overflow-hidden transition-all duration-200",
        isDone && "opacity-60",
        !isDone && "border-border/60 shadow-sm hover:shadow-md"
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
                <p className="text-xs text-muted-foreground mt-0.5">Pour {personaLabel}</p>
              )}
            </div>
            {rec.persona_code && (
              <div className="shrink-0 flex flex-wrap gap-1">
                {rec.persona_code.split(",").map((code: string) => (
                  <PersonaBadge key={code.trim()} code={code.trim()} />
                ))}
              </div>
            )}
          </div>

          {/* ── Status selector ── */}
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

          {/* ── Brief ── */}
          {rec.brief && (
            <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-line" dangerouslySetInnerHTML={{ __html: sanitizeAndRenderMd(rec.brief) }} />
          )}

          {/* ── Collapsible sections ── */}
          {rec.content && Object.keys(rec.content).length > 0 && (
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
    </motion.div>
  );
}
