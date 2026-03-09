import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Mail,
  LayoutGrid,
  Target,
  Users,
  GitBranch,
  Sparkles,
  BarChart2,
  Link2,
  BookOpen,
} from "lucide-react";
import { PersonaBadge } from "./shared/PersonaBadge";
import { FormatBadge } from "./shared/FormatBadge";
import { PriorityIndicator } from "./shared/PriorityIndicator";
import { CopyButton } from "./shared/CopyButton";
import { safeString } from "./legacy/LegacyRecommendations";

// ── helpers ───────────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  hero: "bg-primary/15 text-primary border-primary/30",
  social_proof: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  produit: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  cta: "bg-secondary/15 text-secondary border-secondary/30",
  footer: "bg-muted text-muted-foreground border-border",
  temoignages: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  benefices: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  offre: "bg-red-500/15 text-red-700 border-red-500/30",
};

function getSectionColor(section: string): string {
  const key = section.toLowerCase().replace(/\s+/g, "_");
  for (const [k, v] of Object.entries(SECTION_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-accent/20 text-foreground border-accent/30";
}

// ── sub-components ───────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </span>
      <p className="text-[11px] font-bold text-primary uppercase tracking-wider">{label}</p>
    </div>
  );
}

function CopyBlock({
  label,
  value,
  large = false,
  italic = false,
}: {
  label: string;
  value: string;
  large?: boolean;
  italic?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <CopyButton text={value} />
      </div>
      <div
        className={`bg-muted/40 rounded-lg border border-border/50 px-3 py-2.5 text-xs ${
          large ? "min-h-[56px]" : ""
        } ${italic ? "italic text-muted-foreground" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────

interface Props {
  email: any;
  campaignsData?: any[];
}

export function EmailsRecommendationCard({ email, campaignsData = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const personas: string[] = email.persona_cible
    ? Array.isArray(email.persona_cible)
      ? email.persona_cible
      : [email.persona_cible]
    : [];

  const linkedCampaign = email.campaign_id
    ? campaignsData.find((c) => c.id === email.campaign_id)
    : null;

  const hasFlowPosition = !!email.position_dans_flow?.flow_name;
  const hasDynamicContent =
    Array.isArray(email.dynamic_content_rules) && email.dynamic_content_rules.length > 0;
  const hasSources =
    Array.isArray(email.sources_utilisees) && email.sources_utilisees.length > 0;

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* ── Closed header ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <PriorityIndicator priority={email.priorite} />

        <h4 className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 truncate">
          {safeString(email.title)}
        </h4>

        <div className="flex items-center flex-wrap gap-1.5 shrink-0">
          {personas.map((p) => (
            <PersonaBadge key={p} code={p} />
          ))}
          {email.type_email && <FormatBadge value={email.type_email} />}
          {email.timing && (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0 h-5 font-medium bg-muted/40 text-muted-foreground border-border"
            >
              {safeString(email.timing)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-2">
          <span className="text-xs hidden sm:inline">Voir le détail</span>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* ── Expanded content ───────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-5 py-5 space-y-6">

              {/* ── Section 1 : Objet & Preview ── */}
              <section>
                <SectionHeader icon={Mail} label="Objet & Preview" />
                <div className="space-y-3">

                  {/* Version A */}
                  {email.objet && (
                    <div className="bg-muted/30 border border-border/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">
                        ✉ Version A — objet principal
                      </p>
                      <div className="text-[10px] text-muted-foreground/70 mb-1">De : Ouate</div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {safeString(email.objet)}
                        </p>
                        <CopyButton text={safeString(email.objet)} />
                      </div>
                      {email.preview_text && (
                        <div className="flex items-start justify-between gap-2 mt-1.5">
                          <p className="text-xs text-muted-foreground italic leading-snug">
                            {safeString(email.preview_text)}
                          </p>
                          <CopyButton text={safeString(email.preview_text)} label="Copier preview" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Version B */}
                  {email.objet_variante && (
                    <div className="bg-secondary/5 border border-secondary/20 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold text-secondary mb-1">
                        ✉ Version B — variante A/B
                      </p>
                      <div className="text-[10px] text-muted-foreground/70 mb-1">De : Ouate</div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {safeString(email.objet_variante)}
                        </p>
                        <CopyButton text={safeString(email.objet_variante)} />
                      </div>
                      {email.preview_text && (
                        <p className="text-xs text-muted-foreground italic mt-1.5">
                          {safeString(email.preview_text)}
                        </p>
                      )}
                    </div>
                  )}

                  {email.objet && email.objet_variante && (
                    <p className="text-[10px] text-muted-foreground italic px-1">
                      💡 Tester les 2 objets sur 20% de la liste, envoyer le gagnant au reste
                    </p>
                  )}
                </div>
              </section>

              {/* ── Section 2 : Structure de l'email ── */}
              {Array.isArray(email.structure_sections) && email.structure_sections.length > 0 && (
                <section>
                  <SectionHeader icon={LayoutGrid} label="Structure de l'email" />
                  <div className="space-y-2">
                    {email.structure_sections.map((s: any, i: number) => (
                      <div
                        key={i}
                        className="border border-border/50 rounded-xl overflow-hidden"
                      >
                        {/* Section label bar */}
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 h-5 font-bold uppercase ${getSectionColor(s.section ?? "")}`}
                          >
                            {safeString(s.section)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Section {i + 1}</span>
                        </div>
                        {/* Content */}
                        <div className="px-3 py-2.5 space-y-1.5">
                          {s.contenu && (
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-foreground leading-relaxed flex-1">
                                {safeString(s.contenu)}
                              </p>
                              <CopyButton text={safeString(s.contenu)} />
                            </div>
                          )}
                          {s.conseil_design && (
                            <div className="bg-primary/5 border border-primary/15 rounded-lg px-2.5 py-1.5">
                              <p className="text-[10px] text-muted-foreground italic">
                                🎨 Design : {safeString(s.conseil_design)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Section 3 : Message clé & CTA ── */}
              <section>
                <SectionHeader icon={Target} label="Message clé & CTA" />

                {email.messaging_principal && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Message principal
                      </span>
                      <CopyButton text={safeString(email.messaging_principal)} />
                    </div>
                    <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 text-sm font-medium text-foreground leading-relaxed">
                      {safeString(email.messaging_principal)}
                    </div>
                  </div>
                )}

                {email.cta_principal && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        CTA principal
                      </span>
                      <CopyButton text={safeString(email.cta_principal.texte)} label="Copier texte CTA" />
                    </div>
                    {/* Fake button preview */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-bold text-primary-foreground select-none"
                        style={{
                          backgroundColor: email.cta_principal.couleur_suggeree || "hsl(var(--primary))",
                        }}
                      >
                        {safeString(email.cta_principal.texte)}
                      </div>
                      <span className="text-[10px] text-muted-foreground italic">
                        → {safeString(email.cta_principal.url_destination)}
                      </span>
                    </div>
                  </div>
                )}

                {email.tone_of_voice && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Ton de voix :
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0 h-5 font-medium bg-accent/20 text-foreground border-accent/40"
                    >
                      {safeString(email.tone_of_voice)}
                    </Badge>
                  </div>
                )}
              </section>

              {/* ── Section 4 : Segment & Ciblage Klaviyo ── */}
              <section>
                <SectionHeader icon={Users} label="Segment & Ciblage Klaviyo" />

                {email.segment_klaviyo && (
                  <CopyBlock
                    label="Segment Klaviyo"
                    value={safeString(email.segment_klaviyo)}
                    large
                  />
                )}

                <div className="flex flex-wrap gap-4 mt-1">
                  {email.trigger && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Trigger :
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0 h-5 font-semibold bg-blue-500/10 text-blue-700 border-blue-500/20"
                      >
                        {safeString(email.trigger)}
                      </Badge>
                    </div>
                  )}
                  {email.timing && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Timing :
                      </span>
                      <span className="text-xs text-foreground">{safeString(email.timing)}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Section 5 : Position dans le flow ── */}
              {hasFlowPosition && (
                <section>
                  <SectionHeader icon={GitBranch} label="Position dans le flow" />

                  <div className="bg-muted/20 border border-border/50 rounded-xl px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-foreground">
                        {safeString(email.position_dans_flow.flow_name)}
                      </p>
                      {email.position_dans_flow.position && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0 h-5 font-bold bg-primary/10 text-primary border-primary/30"
                        >
                          {safeString(email.position_dans_flow.position)}
                        </Badge>
                      )}
                    </div>

                    {/* Mini timeline */}
                    <div className="flex items-center gap-2 text-[11px] overflow-x-auto pb-1">
                      {email.position_dans_flow.email_precedent && (
                        <>
                          <span className="text-muted-foreground shrink-0 max-w-[120px] truncate">
                            {safeString(email.position_dans_flow.email_precedent)}
                          </span>
                          <span className="text-muted-foreground shrink-0">→</span>
                        </>
                      )}
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] shrink-0">
                        CET EMAIL
                      </span>
                      {email.position_dans_flow.email_suivant && (
                        <>
                          <span className="text-muted-foreground shrink-0">→</span>
                          <span className="text-muted-foreground shrink-0 max-w-[120px] truncate">
                            {safeString(email.position_dans_flow.email_suivant)}
                          </span>
                        </>
                      )}
                    </div>

                    {email.position_dans_flow.logique_branchement && (
                      <p className="text-[10px] text-muted-foreground italic mt-2.5 border-t border-border/30 pt-2">
                        Condition : {safeString(email.position_dans_flow.logique_branchement)}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* ── Section 6 : Contenu dynamique ── */}
              {hasDynamicContent && (
                <section>
                  <SectionHeader icon={Sparkles} label="Contenu dynamique" />
                  <div className="space-y-2">
                    {email.dynamic_content_rules.map((rule: any, i: number) => (
                      <div
                        key={i}
                        className="bg-secondary/5 border border-secondary/20 rounded-xl px-3 py-3 space-y-1.5"
                      >
                        {rule.bloc_concerne && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0 h-5 font-bold bg-secondary/15 text-secondary border-secondary/30"
                            >
                              {safeString(rule.bloc_concerne)}
                            </Badge>
                          </div>
                        )}
                        {rule.regle && (
                          <p className="text-xs text-foreground">{safeString(rule.regle)}</p>
                        )}
                        {rule.fallback && (
                          <p className="text-[11px] text-muted-foreground italic">
                            Si non disponible : {safeString(rule.fallback)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Section 7 : Métriques cibles ── */}
              {email.metriques_cibles && (
                <section>
                  <SectionHeader icon={BarChart2} label="Métriques cibles" />
                  <div className="grid grid-cols-3 gap-3">
                    {email.metriques_cibles.taux_ouverture_vise && (
                      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-3 text-center">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Ouverture
                        </p>
                        <p className="text-lg font-bold text-emerald-700">
                          {safeString(email.metriques_cibles.taux_ouverture_vise)}
                        </p>
                      </div>
                    )}
                    {email.metriques_cibles.taux_clic_vise && (
                      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-3 text-center">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Clic
                        </p>
                        <p className="text-lg font-bold text-emerald-700">
                          {safeString(email.metriques_cibles.taux_clic_vise)}
                        </p>
                      </div>
                    )}
                    {email.metriques_cibles.benchmark_industrie && (
                      <div className="bg-muted/30 border border-border/40 rounded-xl px-3 py-3 text-center">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Benchmark
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {safeString(email.metriques_cibles.benchmark_industrie)}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── Section 8 : Campagne liée ── */}
              {linkedCampaign && (
                <section>
                  <SectionHeader icon={Link2} label="Campagne liée" />
                  <div className="flex items-center gap-2 bg-muted/30 border border-border/40 rounded-xl px-4 py-3">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground">
                      Fait partie de la campagne :{" "}
                      <strong>{safeString(linkedCampaign.name ?? linkedCampaign.titre ?? linkedCampaign.id)}</strong>
                    </span>
                  </div>
                </section>
              )}

              {/* ── Section 9 : Sources ── */}
              {hasSources && (
                <section>
                  <button
                    className="flex items-center gap-2 w-full text-left"
                    onClick={() => setSourcesOpen((v) => !v)}
                  >
                    <SectionHeader icon={BookOpen} label="Sources" />
                    <span className="text-[10px] text-muted-foreground ml-auto mr-0 mb-3">
                      {sourcesOpen ? "Masquer" : "Afficher"}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {sourcesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {email.sources_utilisees.map((s: string, i: number) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] px-2 py-0 h-5 text-muted-foreground bg-muted/40 border-border"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
