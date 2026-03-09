import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Package,
  Tag,
  Calculator,
  Rocket,
  Megaphone,
  Target,
  BarChart2,
  Link,
  BookOpen,
  MonitorSmartphone,
  Mail,
  Globe,
} from "lucide-react";
import { PriorityIndicator } from "./shared/PriorityIndicator";
import { PersonaBadges } from "./shared/PersonaBadge";
import { FormatBadge } from "./shared/FormatBadge";
import { CopyButton } from "./shared/CopyButton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OffersRecommendationCardProps {
  offer: any;
  campaignsData?: any[];
}

const safeString = (v: any): string =>
  typeof v === "string" ? v : v ? String(v) : "";

/* ── Canal Badge ─────────────────────────────────────────── */
const CANAL_COLORS: Record<string, string> = {
  site: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  email: "bg-secondary/10 text-secondary border-secondary/30",
  ads: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  tous: "bg-muted text-muted-foreground border-border",
};
const CANAL_LABELS: Record<string, string> = {
  site: "Site",
  email: "Email",
  ads: "Ads",
  tous: "Tous canaux",
};
function CanalBadge({ value }: { value?: string }) {
  if (!value) return null;
  const key = value.toLowerCase();
  const label = CANAL_LABELS[key] ?? value;
  const color = CANAL_COLORS[key] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-semibold ${color}`}>
      {label}
    </Badge>
  );
}

/* ── Section header ──────────────────────────────────────── */
function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      <p className="text-[10px] font-bold text-primary uppercase tracking-wide">{label}</p>
    </div>
  );
}

/* ── Timeline phase ──────────────────────────────────────── */
function Phase({
  label,
  color,
  duree,
  actions,
  isLast,
}: {
  label: string;
  color: string;
  duree?: string;
  actions?: string[];
  isLast?: boolean;
}) {
  const dot = {
    blue: "bg-blue-500 border-blue-300",
    green: "bg-emerald-500 border-emerald-300",
    orange: "bg-orange-500 border-orange-300",
  }[color] ?? "bg-muted-foreground border-border";

  const line = {
    blue: "bg-blue-200",
    green: "bg-emerald-200",
    orange: "bg-orange-200",
  }[color] ?? "bg-border";

  const badgeColor = {
    blue: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    orange: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  }[color] ?? "bg-muted text-muted-foreground border-border";

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-3 h-3 rounded-full border-2 mt-0.5 ${dot}`} />
        {!isLast && <div className={`w-0.5 flex-1 mt-1 ${line}`} />}
      </div>
      {/* Content */}
      <div className={`pb-4 ${isLast ? "" : ""} w-full`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-foreground">{label}</span>
          {duree && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${badgeColor}`}>
              {duree}
            </Badge>
          )}
        </div>
        {Array.isArray(actions) && actions.length > 0 && (
          <ul className="space-y-1">
            {actions.map((a, i) => (
              <li
                key={i}
                className="text-xs text-foreground/80 bg-muted/40 rounded p-2 border border-border/50 leading-snug"
              >
                {safeString(a)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Margin badge ──────────────────────────────────────────── */
function MarginBadge({ pct }: { pct?: string | number }) {
  if (!pct) return null;
  const num = parseFloat(String(pct));
  const color = num >= 50
    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
    : num >= 30
    ? "bg-orange-500/10 text-orange-700 border-orange-500/20"
    : "bg-red-500/10 text-red-700 border-red-500/20";
  return (
    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 font-bold ${color}`}>
      {safeString(pct)}
    </Badge>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export function OffersRecommendationCard({
  offer,
  campaignsData = [],
}: OffersRecommendationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const personas: string[] = Array.isArray(offer.persona_cible)
    ? offer.persona_cible
    : offer.persona_cible
    ? [offer.persona_cible]
    : [];

  /* Campaign lookup */
  const linkedCampaign = offer.campaign_id
    ? campaignsData.find((c: any) => c.id === offer.campaign_id)
    : null;

  const hasMargin = offer.marge_estimee && typeof offer.marge_estimee === "object";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card transition-shadow duration-200",
        isOpen ? "shadow-md" : "shadow-sm hover:shadow-md"
      )}
    >
      {/* ── CLOSED STATE ──────────────────────────────────── */}
      <button
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
        onClick={() => setIsOpen((v) => !v)}
      >
        <PriorityIndicator priority={offer.priorite} />

        <span className="font-semibold text-sm text-foreground flex-1 min-w-0 truncate">
          {safeString(offer.title || offer.titre)}
        </span>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <PersonaBadges personas={personas} />
          <FormatBadge value={offer.type_offre} />
          <CanalBadge value={offer.canal_distribution} />
        </div>

        <div className="ml-2 text-muted-foreground shrink-0">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* ── OPEN STATE ────────────────────────────────────── */}
      {isOpen && (
        <div className="border-t border-border/40 px-4 pt-4 pb-5 space-y-6 text-xs">

          {/* ── Section 1 : Concept ─────────────────────── */}
          {offer.concept && (
            <section>
              <SectionHeader icon={Lightbulb} label="Concept de l'offre" />
              <p className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-foreground leading-relaxed font-medium">
                {safeString(offer.concept)}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {offer.periode_recommandee && (
                  <Badge variant="outline" className="text-[10px] bg-muted/50 text-foreground border-border">
                    📅 {safeString(offer.periode_recommandee)}
                  </Badge>
                )}
                {offer.urgency_trigger && (
                  <div className="w-full mt-1 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-700 text-[11px]">
                    <span className="font-bold">⚡ Urgence :</span> {safeString(offer.urgency_trigger)}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Section 2 : Composition ─────────────────── */}
          {Array.isArray(offer.composition) && offer.composition.length > 0 && (
            <section>
              <SectionHeader icon={Package} label="Composition du bundle" />
              <ol className="space-y-2">
                {offer.composition.map((item: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {i + 1}
                      </div>
                      {i < offer.composition.length - 1 && (
                        <div className="w-0.5 h-4 bg-border mt-1" />
                      )}
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50 flex-1">
                      <p className="font-semibold text-foreground">{safeString(item.produit)}</p>
                      {item.role_dans_bundle && (
                        <p className="text-muted-foreground mt-0.5 leading-snug">
                          {safeString(item.role_dans_bundle)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* ── Section 3 : Pricing ─────────────────────── */}
          {offer.pricing_strategy && (
            <section>
              <SectionHeader icon={Tag} label="Stratégie de prix" />
              <div className="bg-muted/30 rounded-xl border border-border/50 p-4">
                <div className="flex items-end gap-4 flex-wrap">
                  {offer.pricing_strategy.prix_unitaire_total && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Prix séparés</p>
                      <p className="text-base font-medium line-through text-muted-foreground/70">
                        {safeString(offer.pricing_strategy.prix_unitaire_total)}
                      </p>
                    </div>
                  )}
                  {offer.pricing_strategy.prix_bundle && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Prix bundle</p>
                      <p className="text-2xl font-bold text-primary">
                        {safeString(offer.pricing_strategy.prix_bundle)}
                      </p>
                    </div>
                  )}
                  {offer.pricing_strategy.economie_affichee && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-sm font-bold px-3 py-1 h-auto">
                      {safeString(offer.pricing_strategy.economie_affichee)}
                    </Badge>
                  )}
                </div>
                {offer.pricing_strategy.ancrage_prix && (
                  <p className="mt-3 text-[11px] text-muted-foreground italic border-t border-border/40 pt-2">
                    💡 {safeString(offer.pricing_strategy.ancrage_prix)}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Section 4 : Marge ───────────────────────── */}
          {hasMargin && (
            <section>
              <SectionHeader icon={Calculator} label="Marge estimée" />
              <div className="bg-muted/30 rounded-xl border border-border/50 p-3 space-y-2">
                {offer.marge_estimee.cout_revient_estime && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px]">Coût de revient :</span>
                    <span className="font-semibold">{safeString(offer.marge_estimee.cout_revient_estime)}</span>
                  </div>
                )}
                {offer.marge_estimee.marge_brute_pourcent && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px]">Marge brute :</span>
                    <MarginBadge pct={offer.marge_estimee.marge_brute_pourcent} />
                  </div>
                )}
                {offer.marge_estimee.commentaire && (
                  <p className="text-[11px] italic text-muted-foreground border-t border-border/40 pt-2">
                    {safeString(offer.marge_estimee.commentaire)}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Section 5 : Plan de lancement ───────────── */}
          {offer.plan_de_lancement && (
            <section>
              <SectionHeader icon={Rocket} label="Plan de lancement" />
              <div className="pl-1">
                {offer.plan_de_lancement.phase_teasing && (
                  <Phase
                    label="Teasing"
                    color="blue"
                    duree={offer.plan_de_lancement.phase_teasing.duree}
                    actions={offer.plan_de_lancement.phase_teasing.actions}
                  />
                )}
                {offer.plan_de_lancement.phase_lancement && (
                  <Phase
                    label="Lancement"
                    color="green"
                    duree={offer.plan_de_lancement.phase_lancement.duree}
                    actions={offer.plan_de_lancement.phase_lancement.actions}
                  />
                )}
                {offer.plan_de_lancement.phase_relance && (
                  <Phase
                    label="Relance"
                    color="orange"
                    duree={offer.plan_de_lancement.phase_relance.duree}
                    actions={offer.plan_de_lancement.phase_relance.actions}
                    isLast
                  />
                )}
              </div>
            </section>
          )}

          {/* ── Section 6 : Messaging par canal ─────────── */}
          {offer.messaging_par_canal && (
            <section>
              <SectionHeader icon={Megaphone} label="Messaging par canal" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {offer.messaging_par_canal.ads && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <MonitorSmartphone className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">Ads</span>
                      </div>
                      <CopyButton text={safeString(offer.messaging_par_canal.ads)} size="xs" />
                    </div>
                    <p className="text-foreground/80 leading-snug">{safeString(offer.messaging_par_canal.ads)}</p>
                  </div>
                )}
                {offer.messaging_par_canal.email && (
                  <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-wide">Email</span>
                      </div>
                      <CopyButton text={safeString(offer.messaging_par_canal.email)} size="xs" />
                    </div>
                    <p className="text-foreground/80 leading-snug">{safeString(offer.messaging_par_canal.email)}</p>
                  </div>
                )}
                {offer.messaging_par_canal.site && (
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-600" />
                        <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wide">Site</span>
                      </div>
                      <CopyButton text={safeString(offer.messaging_par_canal.site)} size="xs" />
                    </div>
                    <p className="text-foreground/80 leading-snug">{safeString(offer.messaging_par_canal.site)}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Section 7 : Angle marketing ─────────────── */}
          {offer.angle_marketing && (
            <section>
              <SectionHeader icon={Target} label="Angle marketing" />
              <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-3 border border-border/50">
                <p className="flex-1 text-foreground leading-relaxed">{safeString(offer.angle_marketing)}</p>
                <CopyButton text={safeString(offer.angle_marketing)} />
              </div>
            </section>
          )}

          {/* ── Section 8 : Métriques ───────────────────── */}
          {offer.metriques_succes && (
            <section>
              <SectionHeader icon={BarChart2} label="Métriques de succès" />
              <div className="bg-muted/30 rounded-xl border border-border/50 p-3 space-y-3">
                {Array.isArray(offer.metriques_succes.kpis_a_surveiller) &&
                  offer.metriques_succes.kpis_a_surveiller.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1.5">KPIs</p>
                      <ul className="space-y-1">
                        {offer.metriques_succes.kpis_a_surveiller.map((k: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-foreground/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            {safeString(k)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {offer.metriques_succes.seuil_succes && (
                  <div className="border-t border-border/40 pt-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Seuil de succès</p>
                    <p className="font-bold text-sm text-foreground">{safeString(offer.metriques_succes.seuil_succes)}</p>
                  </div>
                )}
                {offer.metriques_succes.action_si_echec && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5 text-orange-700 text-[11px]">
                    <span className="font-bold">⚠ Plan B : </span>
                    {safeString(offer.metriques_succes.action_si_echec)}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Section 9 : Campagne liée ───────────────── */}
          {linkedCampaign && (
            <section>
              <SectionHeader icon={Link} label="Campagne liée" />
              <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/50">
                <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-foreground/80">
                  Fait partie de la campagne :{" "}
                  <span className="font-semibold text-foreground">
                    {safeString(linkedCampaign.name || linkedCampaign.titre || linkedCampaign.id)}
                  </span>
                </span>
              </div>
            </section>
          )}

          {/* ── Section 10 : Sources ────────────────────── */}
          {Array.isArray(offer.sources_utilisees) && offer.sources_utilisees.length > 0 && (
            <section>
              <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
                    <BookOpen className="w-3.5 h-3.5" />
                    Sources
                    {sourcesOpen ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {offer.sources_utilisees.map((s: any, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] bg-muted/50 text-muted-foreground border-border"
                      >
                        {safeString(typeof s === "string" ? s : s?.label ?? s?.source ?? JSON.stringify(s))}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
