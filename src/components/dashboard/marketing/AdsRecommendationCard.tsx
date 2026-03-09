import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Palette,
  FileText,
  Target,
  SplitSquareVertical,
  Link2,
  Brain,
  Sparkles,
  Lightbulb,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { PersonaBadge } from "./shared/PersonaBadge";
import { FormatBadge } from "./shared/FormatBadge";
import { PriorityIndicator } from "./shared/PriorityIndicator";
import { CopyButton } from "./shared/CopyButton";
import { safeString } from "./legacy/LegacyRecommendations";

// ── helpers ──────────────────────────────────────────────────────────

const ANGLE_LABELS: Record<string, string> = {
  preuve_sociale: "Preuve sociale",
  urgence: "Urgence",
  educatif: "Éducatif",
  before_after: "Avant / Après",
  temoignage: "Témoignage",
  curiosite: "Curiosité",
  aspirationnel: "Aspirationnel",
  peur_de_manquer: "Peur de manquer",
};

const ANGLE_DESC: Record<string, string> = {
  preuve_sociale: "Rassurer via les avis, notes et témoignages clients.",
  urgence: "Créer un sentiment de rareté ou de délai limité.",
  educatif: "Apporter de la valeur en expliquant un problème ou une solution.",
  before_after: "Montrer la transformation visible avant et après usage.",
  temoignage: "Mettre en avant une expérience authentique d'un client réel.",
  curiosite: "Intriguer et pousser à cliquer pour en savoir plus.",
  aspirationnel: "Projeter le prospect dans une version idéale de lui-même.",
  peur_de_manquer: "Activer la FOMO — ce que l'on risque de rater.",
};

const FUNNEL_DESC: Record<string, string> = {
  tofu_awareness: "TOFU — Faire découvrir la marque à une audience froide.",
  mofu_consideration: "MOFU — Nourrir l'intérêt d'une audience qui vous connaît déjà.",
  bofu_conversion: "BOFU — Convertir une audience chaude en acheteurs.",
  retargeting: "Retargeting — Relancer les visiteurs ou abandons panier.",
};

const IA_TOOL: Record<string, string> = {
  reel: "Higgsfield / Arcads",
  story_video: "Higgsfield / Arcads",
  ugc_video: "Arcads / Creatify",
  static_image: "Midjourney / DALL-E",
  before_after: "Midjourney / DALL-E",
  carousel: "Canva / Figma (instructions slide par slide)",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  google: "Google",
  multi: "Multi-canaux",
};

const PLATFORM_COLORS: Record<string, string> = {
  meta: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  tiktok: "bg-black/10 text-foreground border-border",
  pinterest: "bg-red-500/15 text-red-700 border-red-500/30",
  google: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  multi: "bg-violet-500/15 text-violet-700 border-violet-500/30",
};

// ── sub-components ────────────────────────────────────────────────────

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
  mono = false,
  italic = false,
}: {
  label: string;
  value: string;
  large?: boolean;
  mono?: boolean;
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
          large ? "min-h-[60px]" : ""
        } ${mono ? "font-mono text-[11px]" : ""} ${italic ? "italic text-muted-foreground" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function BulletList({
  label,
  items,
  variant = "default",
}: {
  label: string;
  items: string[];
  variant?: "default" | "exclusion";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 text-xs ${
              variant === "exclusion" ? "text-orange-700" : "text-foreground"
            }`}
          >
            <span
              className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                variant === "exclusion" ? "bg-orange-500" : "bg-primary/60"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────

interface Props {
  ad: any;
  campaignsData?: any[];
}

export function AdsRecommendationCard({ ad, campaignsData = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const format: string = ad.format ?? "";
  const isVideo = ["reel", "story_video", "ugc_video"].includes(format);
  const isStatic = ["static_image", "before_after"].includes(format);
  const isCarousel = format === "carousel";

  const personas: string[] = ad.persona_cible
    ? Array.isArray(ad.persona_cible)
      ? ad.persona_cible
      : [ad.persona_cible]
    : [];

  const linkedCampaign = ad.campaign_id
    ? campaignsData.find((c) => c.id === ad.campaign_id)
    : null;

  const iaTool = IA_TOOL[format] ?? "un outil IA adapté";
  const platformColor = PLATFORM_COLORS[ad.plateforme] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* ── Closed header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Priority dot */}
        <PriorityIndicator priority={ad.priorite} />

        {/* Title */}
        <h4 className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 truncate">
          {safeString(ad.title)}
        </h4>

        {/* Badges */}
        <div className="flex items-center flex-wrap gap-1.5 shrink-0">
          {personas.map((p) => (
            <PersonaBadge key={p} code={p} />
          ))}
          {format && <FormatBadge value={format} />}
          {ad.funnel_stage && <FormatBadge value={ad.funnel_stage} />}
          {ad.plateforme && (
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0 h-5 font-semibold ${platformColor}`}
            >
              {PLATFORM_LABELS[ad.plateforme] ?? ad.plateforme}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-2">
          <span className="text-xs hidden sm:inline">Voir le détail</span>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* ── Expanded content ──────────────────────────────────────── */}
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

              {/* ── Section 1 : Concept créatif ── */}
              {ad.contenu_creatif && (
                <section>
                  <SectionHeader icon={Palette} label="Concept créatif" />

                  {/* VIDEO */}
                  {isVideo && (
                    <>
                      {ad.contenu_creatif.hook_text && (
                        <CopyBlock label="Hook (texte)" value={safeString(ad.contenu_creatif.hook_text)} />
                      )}
                      {ad.contenu_creatif.hook_audio && (
                        <CopyBlock label="Hook (voiceover)" value={safeString(ad.contenu_creatif.hook_audio)} />
                      )}
                      {ad.contenu_creatif.script_complet && (
                        <CopyBlock label="Script complet" value={safeString(ad.contenu_creatif.script_complet)} large />
                      )}
                      {ad.contenu_creatif.descriptif_visuel && (
                        <div className="mb-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Storyboard visuel
                          </p>
                          <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2.5 text-xs text-foreground whitespace-pre-line">
                            {safeString(ad.contenu_creatif.descriptif_visuel)}
                          </div>
                        </div>
                      )}
                      {ad.contenu_creatif.direction_artistique && (
                        <CopyBlock
                          label="Direction artistique"
                          value={safeString(ad.contenu_creatif.direction_artistique)}
                          italic
                        />
                      )}
                    </>
                  )}

                  {/* STATIC */}
                  {isStatic && (
                    <>
                      {ad.contenu_creatif.hook_text && (
                        <CopyBlock label="Hook" value={safeString(ad.contenu_creatif.hook_text)} />
                      )}
                      {ad.contenu_creatif.headline_image && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Headline image
                            </span>
                            <CopyButton text={safeString(ad.contenu_creatif.headline_image)} />
                          </div>
                          <div className="bg-muted/40 rounded-lg border border-border/50 px-3 py-3 text-base font-bold text-foreground">
                            {safeString(ad.contenu_creatif.headline_image)}
                          </div>
                        </div>
                      )}
                      {ad.contenu_creatif.body_copy && (
                        <CopyBlock label="Body copy" value={safeString(ad.contenu_creatif.body_copy)} />
                      )}
                      {ad.contenu_creatif.descriptif_visuel && (
                        <div className="mb-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Description visuelle
                          </p>
                          <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2.5 text-xs text-foreground">
                            {safeString(ad.contenu_creatif.descriptif_visuel)}
                          </div>
                        </div>
                      )}
                      {ad.contenu_creatif.direction_artistique && (
                        <CopyBlock
                          label="Direction artistique"
                          value={safeString(ad.contenu_creatif.direction_artistique)}
                          italic
                        />
                      )}
                    </>
                  )}

                  {/* CAROUSEL */}
                  {isCarousel && (
                    <>
                      {ad.contenu_creatif.hook_text && (
                        <CopyBlock label="Hook" value={safeString(ad.contenu_creatif.hook_text)} />
                      )}
                      {Array.isArray(ad.contenu_creatif.slides) && ad.contenu_creatif.slides.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Slides
                          </p>
                          <div className="space-y-2">
                            {ad.contenu_creatif.slides.map((s: any, i: number) => (
                              <div
                                key={i}
                                className="bg-muted/40 rounded-lg border border-border/50 px-3 py-2.5"
                              >
                                <p className="text-[10px] font-bold text-primary mb-1">
                                  Slide {s.numero ?? i + 1}
                                </p>
                                {s.visuel && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    <span className="font-semibold">Visuel :</span> {s.visuel}
                                  </p>
                                )}
                                {s.texte_slide && (
                                  <p className="text-xs text-foreground font-medium">{s.texte_slide}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ad.contenu_creatif.body_copy && (
                        <CopyBlock label="Body copy" value={safeString(ad.contenu_creatif.body_copy)} />
                      )}
                      {ad.contenu_creatif.direction_artistique && (
                        <CopyBlock
                          label="Direction artistique"
                          value={safeString(ad.contenu_creatif.direction_artistique)}
                          italic
                        />
                      )}
                    </>
                  )}
                </section>
              )}

              {/* ── Section 2 : Ad Copy ── */}
              {ad.ad_copy && (
                <section>
                  <SectionHeader icon={FileText} label="Ad Copy (Meta / TikTok)" />
                  {ad.ad_copy.primary_text && (
                    <CopyBlock label="Texte principal" value={safeString(ad.ad_copy.primary_text)} large />
                  )}
                  {ad.ad_copy.headline && (
                    <CopyBlock label="Titre (headline)" value={safeString(ad.ad_copy.headline)} />
                  )}
                  {ad.ad_copy.description && (
                    <CopyBlock label="Description" value={safeString(ad.ad_copy.description)} />
                  )}
                  {ad.cta && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        CTA bouton :
                      </span>
                      <Badge variant="outline" className="text-xs font-bold text-primary border-primary/40 bg-primary/5">
                        {safeString(ad.cta)}
                      </Badge>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    Prêt à coller dans le gestionnaire de publicités
                  </p>
                </section>
              )}

              {/* ── Section 3 : Ciblage ── */}
              {ad.ciblage_detaille && (
                <section>
                  <SectionHeader icon={Target} label="Ciblage & Audience" />
                  <BulletList
                    label="Audiences suggérées"
                    items={ad.ciblage_detaille.audiences_suggested ?? []}
                  />
                  <BulletList
                    label="Exclusions"
                    items={ad.ciblage_detaille.exclusions ?? []}
                    variant="exclusion"
                  />
                  {ad.ciblage_detaille.custom_audience_source && (
                    <div className="mb-3">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Source audience custom :{" "}
                      </span>
                      <span className="text-xs text-foreground">
                        {safeString(ad.ciblage_detaille.custom_audience_source)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {ad.placement && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground mr-1">Placement :</span>
                        <FormatBadge value={ad.placement} />
                      </div>
                    )}
                    {ad.budget_suggere && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground mr-1">Budget :</span>
                        <span className="text-xs font-medium text-foreground">{safeString(ad.budget_suggere)}</span>
                      </div>
                    )}
                    {ad.kpi_attendu && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground mr-1">KPI :</span>
                        <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 bg-muted border-border">
                          {safeString(ad.kpi_attendu)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── Section 4 : A/B Test ── */}
              {ad.ab_test_suggestion && (
                <section>
                  <SectionHeader icon={SplitSquareVertical} label="A/B Test suggéré" />
                  <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 space-y-2">
                    <p className="text-xs">
                      <span className="font-semibold text-foreground">Élément à tester : </span>
                      <span className="font-bold text-accent">{safeString(ad.ab_test_suggestion.element_a_tester)}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-background rounded border border-border/60 px-2.5 py-2">
                        <p className="text-[10px] font-bold text-muted-foreground mb-1">Variante A</p>
                        <p className="text-xs text-foreground">{safeString(ad.ab_test_suggestion.variante_a)}</p>
                      </div>
                      <div className="bg-background rounded border border-border/60 px-2.5 py-2">
                        <p className="text-[10px] font-bold text-muted-foreground mb-1">Variante B</p>
                        <p className="text-xs text-foreground">{safeString(ad.ab_test_suggestion.variante_b)}</p>
                      </div>
                    </div>
                    {ad.ab_test_suggestion.raison && (
                      <p className="text-xs italic text-muted-foreground">
                        {safeString(ad.ab_test_suggestion.raison)}
                      </p>
                    )}
                    {ad.ab_test_suggestion.duree_test_recommandee && (
                      <p className="text-xs">
                        <span className="font-semibold text-muted-foreground">Durée recommandée : </span>
                        {safeString(ad.ab_test_suggestion.duree_test_recommandee)}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* ── Section 5 : Landing page ── */}
              {ad.landing_page_alignement && (
                <section>
                  <SectionHeader icon={Link2} label="Landing page" />
                  {ad.landing_page_alignement.url_destination && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        URL de destination :
                      </span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded text-primary font-mono">
                        {safeString(ad.landing_page_alignement.url_destination)}
                      </code>
                    </div>
                  )}
                  {ad.landing_page_alignement.elements_coherence && (
                    <div className="bg-muted/40 rounded-lg border border-border/50 px-3 py-2.5 text-xs text-foreground">
                      {safeString(ad.landing_page_alignement.elements_coherence)}
                    </div>
                  )}
                </section>
              )}

              {/* ── Section 6 : Angle & stratégie ── */}
              <section>
                <SectionHeader icon={Brain} label="Angle & stratégie" />
                <div className="space-y-2">
                  {ad.angle_psychologique && (
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 shrink-0 bg-secondary/10 text-secondary border-secondary/30 font-semibold">
                        {ANGLE_LABELS[ad.angle_psychologique] ?? ad.angle_psychologique}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {ANGLE_DESC[ad.angle_psychologique] ?? ""}
                      </p>
                    </div>
                  )}
                  {ad.funnel_stage && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Funnel : </span>
                      {FUNNEL_DESC[ad.funnel_stage] ?? ad.funnel_stage}
                    </p>
                  )}
                  {linkedCampaign && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Campagne liée : </span>
                      {safeString(linkedCampaign.nom)}
                    </p>
                  )}
                </div>
              </section>

              {/* ── Section 7 : Prompt IA ── */}
              {ad.prompt_ia_generation && (
                <section>
                  <SectionHeader icon={Sparkles} label="Prompt IA" />
                  <div className="bg-foreground/95 rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                      <span className="text-[10px] text-white/50 font-mono">prompt</span>
                      <CopyButton
                        text={safeString(ad.prompt_ia_generation)}
                        label="Copier le prompt"
                        className="text-white/70 hover:text-white"
                      />
                    </div>
                    <pre className="px-4 py-3 text-[11px] text-white/90 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {safeString(ad.prompt_ia_generation)}
                    </pre>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                    Prompt prêt à coller dans {iaTool}
                  </p>
                </section>
              )}

              {/* ── Section 8 : Inspirations ── */}
              {Array.isArray(ad.inspirations) && ad.inspirations.length > 0 && (
                <section>
                  <SectionHeader icon={Lightbulb} label="Inspirations" />
                  <div className="space-y-2">
                    {ad.inspirations.map((inspi: any, i: number) => (
                      <div
                        key={i}
                        className="bg-muted/40 rounded-lg border border-border/50 px-3 py-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-foreground">{safeString(inspi.marque)}</p>
                          {inspi.url && (
                            <a
                              href={inspi.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline shrink-0 flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="text-[10px]">Voir</span>
                            </a>
                          )}
                        </div>
                        {inspi.description && (
                          <p className="text-muted-foreground mt-1">{safeString(inspi.description)}</p>
                        )}
                        {inspi.pourquoi && (
                          <p className="italic text-muted-foreground/80 mt-1">
                            {safeString(inspi.pourquoi)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Section 9 : Sources (collapsible) ── */}
              {Array.isArray(ad.sources_utilisees) && ad.sources_utilisees.length > 0 && (
                <section>
                  <button
                    className="flex items-center gap-2 group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesOpen((o) => !o);
                    }}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide group-hover:text-foreground">
                      Sources ({ad.sources_utilisees.length})
                    </span>
                    {sourcesOpen ? (
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                  {sourcesOpen && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ad.sources_utilisees.map((src: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] text-muted-foreground bg-muted border border-border/60 rounded px-2 py-0.5"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
