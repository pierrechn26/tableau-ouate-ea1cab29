import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, TrendingUp, ShoppingCart, Zap, Lightbulb, AlertTriangle, CheckCircle, BarChart3, Package, Sparkles, ChevronDown, ChevronUp, Edit2, PowerOff } from "lucide-react";
import { usePersonaStats, PersonaStat } from "@/hooks/usePersonaStats";
import { usePersonaProfiles, PersonaDBProfile } from "@/hooks/usePersonaProfiles";
import { DateRange } from "react-day-picker";
import { TopPersonasPotential } from "@/components/dashboard/TopPersonasPotential";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import personaP1 from "@/assets/persona-p1.png";
import personaP2 from "@/assets/persona-sophie.png";
import personaP3 from "@/assets/persona-p3.png";
import personaP4 from "@/assets/persona-lea.png";
import personaP5 from "@/assets/persona-p5.png";
import personaP6 from "@/assets/persona-p6.png";
import personaP7 from "@/assets/persona-p7.png";
import personaP8 from "@/assets/persona-p8.png";
import personaP9 from "@/assets/persona-p9.png";

interface PersonasTabProps {
  dateRange?: DateRange;
}

const PERSONA_COLORS: Record<string, string> = {
  P1: "348 83% 47%",
  P2: "330 81% 60%",
  P3: "15 85% 55%",
  P4: "205 85% 55%",
  P5: "155 65% 45%",
  P6: "270 60% 55%",
  P7: "45 90% 50%",
  P8: "348 70% 35%",
  P9: "195 70% 45%",
};

function getPersonaColor(code: string): string {
  if (PERSONA_COLORS[code]) return PERSONA_COLORS[code];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = ((hash % 360) + 360) % 360;
  return `${hue} 65% 50%`;
}

/* ── Persona images (static assets, not from DB) ── */

const PERSONA_IMAGES: Record<string, string> = {
  P1: personaP1, P2: personaP2, P3: personaP3, P4: personaP4, P5: personaP5,
  P6: personaP6, P7: personaP7, P8: personaP8, P9: personaP9,
};

/* ── Translation maps ────────────────────────────────── */

const FORMAT_LABELS: Record<string, string> = {
  visual: "Contenu visuel",
  short: "Contenu court et direct",
  complete: "Contenu détaillé et complet",
};

function tr(value: string, map: Record<string, string>): string {
  return map[value] || value;
}

/* ── Bold key phrases in text ────────────────────────── */

function boldKeyPhrases(text: string): string {
  const keywords = [
    "résultats visibles", "résultats rapides", "preuves concrètes", "confiance", "fidèle",
    "transparence totale", "cliniquement testés", "sans parfum", "hypoallergéniques",
    "conversion", "AOV", "panier moyen", "upsell", "opt-in", "nurturing",
    "engagement", "réceptif", "capitaliser", "campagnes ciblées", "freins",
    "imperfections", "peau atopique", "peau sensible", "réactive",
    "multi-enfants", "routine", "premier achat", "sceptique", "ambassadrice",
    "autonomie", "efficacité", "rapport qualité-prix", "polyvalents",
    "avant/après", "études cliniques", "formulations minimalistes",
    "score", "express", "contenu visuel", "contenu court", "contenu détaillé",
  ];
  let result = text;
  for (const kw of keywords) {
    const regex = new RegExp(`(${kw})`, "gi");
    result = result.replace(regex, "<strong>$1</strong>");
  }
  return result;
}

/* ── Psychology text generator (enriched, unique per persona) ── */

function generatePsychologyText(p: PersonaStat): string {
  const priority = p.psychology?.priorityFirst?.value;
  const trust = p.psychology?.trustFirst?.value;
  const code = p.code;

  const codeTexts: Record<string, string> = {
    P1: "Maman attentive qui découvre les imperfections cutanées de son enfant pour la première fois. Elle ressent de la culpabilité et cherche des solutions efficaces immédiatement. Sa priorité est de trouver un produit qui fonctionne vite, avec des résultats visibles pour se rassurer.",
    P2: "Maman d'un pré-adolescent qui voit apparaître les premiers boutons. Elle veut accompagner son enfant dans cette étape délicate sans le braquer. Elle valorise les produits qui respectent l'autonomie de l'enfant tout en étant adaptés à son jeune âge.",
    P3: "Maman très protectrice dont l'enfant a une peau atopique diagnostiquée. Elle est devenue experte en lecture d'étiquettes et redoute les réactions allergiques. Elle ne fait confiance qu'aux produits cliniquement testés et sans parfum.",
    P4: "Maman douce et précautionneuse face à la peau sensible de son enfant. Elle évite tout produit agressif et privilégie les formulations minimalistes. Elle prend son temps pour comparer et se renseigner avant d'acheter.",
    P5: "Maman organisée qui gère les besoins cutanés différents de plusieurs enfants. Elle recherche la praticité avant tout : des routines simples, des produits polyvalents et un bon rapport qualité-prix pour toute la fratrie.",
    P6: "Jeune maman enthousiaste qui découvre l'univers des soins pour enfants. Elle est réceptive aux nouveautés et se laisse guider par les recommandations. Elle apprécie les contenus éducatifs qui l'aident à comprendre les besoins de la peau de son enfant.",
    P7: "Maman exigeante qui a déjà testé plusieurs marques sans trouver satisfaction. Elle est devenue sceptique et a besoin de preuves tangibles avant de faire confiance à un nouveau produit. Le moindre faux pas peut la faire décrocher.",
    P8: "Cliente fidèle de Ouate qui connaît bien la marque et revient régulièrement. Elle fait confiance aux produits qu'elle utilise déjà et est ouverte aux recommandations complémentaires ciblées sur les imperfections de son enfant.",
    P9: "Cliente fidèle et curieuse qui aime explorer de nouveaux produits Ouate. Elle est ambassadrice naturelle de la marque et partage volontiers son expérience. Elle recherche la nouveauté et les éditions limitées.",
  };

  if (codeTexts[code]) return codeTexts[code];

  // Fallback for dynamic personas
  const priorityTexts: Record<string, string> = {
    efficacite: "Cherche avant tout des résultats visibles et prouvés sur la peau de son enfant.",
    ludique: "Veut que le soin soit un moment agréable et ludique qui motive l'enfant.",
    clean: "Exigeante sur la naturalité et la transparence de chaque ingrédient.",
    autonomie: "Souhaite rendre son enfant autonome dans sa routine de soin quotidienne.",
    science: "Accorde une grande importance aux validations scientifiques et dermatologiques.",
  };
  const trustTexts: Record<string, string> = {
    proof_results: "A besoin d'être convaincue par des preuves concrètes et des résultats avant/après.",
    ingredient_transparency: "Très attentive à la composition, lit systématiquement les étiquettes.",
    parent_testimonials: "Se fie aux témoignages d'autres parents pour valider ses choix.",
    scientific_validation: "Recherche des garanties dermatologiques et des études cliniques.",
  };
  const parts: string[] = [];
  if (priority && priorityTexts[priority]) parts.push(priorityTexts[priority]);
  if (trust && trustTexts[trust]) parts.push(trustTexts[trust]);
  return parts.length > 0 ? parts.join(" ") : "Profil en cours d'analyse — données insuffisantes pour le moment.";
}

/* ── Key issues generator (enriched) ─────────────────── */

function generateKeyIssues(p: PersonaStat): string[] {
  const code = p.code;
  const codeIssues: Record<string, string[]> = {
    P1: [
      "Découvre les imperfections cutanées pour la première fois et ne sait pas comment réagir",
      "Craint d'utiliser des produits inadaptés qui pourraient aggraver le problème",
      "A besoin de résultats rapides pour se rassurer sur l'efficacité du traitement",
    ],
    P2: [
      "Le pré-ado refuse parfois d'appliquer les soins, rendant la routine difficile",
      "Hésite entre des produits adolescents classiques et des soins adaptés à son jeune âge",
      "Veut éviter que les premiers boutons ne s'aggravent et n'impactent la confiance de l'enfant",
    ],
    P3: [
      "Peau atopique qui réagit au moindre changement d'environnement ou de produit",
      "A vécu des expériences négatives avec des produits contenant des allergènes",
      "Doit gérer les crises d'eczéma en plus de la routine quotidienne",
    ],
    P4: [
      "Peau qui rougit facilement au contact de produits même doux",
      "Difficulté à trouver des formulations suffisamment douces et sans irritants",
      "S'inquiète des effets à long terme des produits sur une peau fragile",
    ],
    P5: [
      "Doit jongler entre les besoins cutanés très différents de chaque enfant",
      "Le budget soins est multiplié par le nombre d'enfants",
      "Manque de temps pour des routines individualisées à chaque enfant",
    ],
    P6: [
      "Se sent perdue face à la multitude de produits disponibles sur le marché",
      "N'a pas encore les repères pour évaluer la qualité d'un produit enfant",
      "Influencée par les réseaux sociaux, risque de suivre des conseils inadaptés",
    ],
    P7: [
      "Déçue par des promesses non tenues de marques précédentes",
      "Devient très sceptique face aux arguments marketing classiques",
      "Exige une transparence totale sur la composition et l'efficacité avant d'acheter",
    ],
    P8: [
      "Cherche des solutions ciblées pour les imperfections qui évoluent avec l'âge de l'enfant",
      "Souhaite compléter sa routine existante sans tout changer",
      "A besoin de recommandations personnalisées plutôt que génériques",
    ],
    P9: [
      "Veut découvrir les nouveautés avant tout le monde",
      "Risque de lassitude si la marque ne propose pas régulièrement de l'innovation",
      "Cherche une relation privilégiée avec la marque au-delà du simple achat",
    ],
  };

  if (codeIssues[code]) return codeIssues[code];

  // Fallback dynamic
  const issues: string[] = [];
  const trust = p.psychology?.trustTop3 || [];
  for (const t of trust.slice(0, 2)) {
    const map: Record<string, string> = {
      ingredient_transparency: "A besoin de connaître la composition exacte de chaque produit avant d'acheter",
      proof_results: "Veut voir des résultats prouvés et documentés avant de s'engager",
      parent_testimonials: "Cherche activement l'avis d'autres parents pour se rassurer",
      scientific_validation: "Exige des validations scientifiques et dermatologiques complètes",
    };
    if (map[t.value]) issues.push(map[t.value]);
  }
  const fragrance = p.profile?.excludeFragrancePct ?? 0;
  if (fragrance > 10) issues.push("Préfère les produits sans parfum par mesure de précaution");
  return issues.slice(0, 3);
}

/* ── Essential needs generator (enriched) ────────────── */

function generateNeeds(p: PersonaStat): string[] {
  const code = p.code;
  const codeNeeds: Record<string, string[]> = {
    P1: [
      "Un diagnostic précis pour identifier le type d'imperfections de son enfant",
      "Des résultats visibles dès les premières semaines d'utilisation",
      "Un accompagnement pédagogique pour comprendre les causes et les solutions",
    ],
    P2: [
      "Des produits adaptés à la peau jeune, ni trop agressifs ni trop enfantins",
      "Un packaging et une expérience qui donnent envie au pré-ado de s'impliquer",
      "Des conseils pour aborder le sujet des soins avec tact auprès de son enfant",
    ],
    P3: [
      "Des formulations hypoallergéniques testées cliniquement et sans parfum",
      "Une transparence totale sur les ingrédients et leur origine",
      "Des produits qui apaisent sans déclencher de nouvelles réactions",
    ],
    P4: [
      "Des textures ultra-douces et des formulations minimalistes",
      "La garantie que chaque ingrédient est sûr pour les peaux sensibles",
      "Une routine simple en 1-2 étapes pour ne pas surcharger la peau",
    ],
    P5: [
      "Des packs ou routines modulables adaptés à chaque enfant",
      "Un excellent rapport qualité-prix pour gérer le budget multi-enfants",
      "Des produits polyvalents qui simplifient la logistique quotidienne",
    ],
    P6: [
      "Des contenus éducatifs pour apprendre les bases des soins enfants",
      "Un parcours guidé qui simplifie le premier achat",
      "Des recommandations claires et rassurantes adaptées aux débutantes",
    ],
    P7: [
      "Des preuves concrètes d'efficacité : études, avant/après, témoignages vérifiés",
      "Une politique de satisfaction garantie pour lever les freins à l'achat",
      "Une différenciation claire par rapport aux marques qu'elle a déjà testées",
    ],
    P8: [
      "Des recommandations personnalisées qui complètent sa routine actuelle",
      "Un programme de fidélité qui récompense son engagement",
      "Des conseils évolutifs adaptés à l'âge changeant de son enfant",
    ],
    P9: [
      "Un accès anticipé aux nouveautés et éditions limitées",
      "Un programme ambassadeur pour partager son expérience",
      "Des expériences exclusives qui renforcent son attachement à la marque",
    ],
  };

  if (codeNeeds[code]) return codeNeeds[code];

  // Fallback
  const needs: string[] = [];
  const routine = p.psychology?.routineSizeDist || [];
  const minimal = routine.find((r) => r.value === "minimal");
  const complete = routine.find((r) => r.value === "complete");
  if (minimal && minimal.pct > 40) needs.push("Routine minimaliste en 1-2 produits facile à adopter au quotidien");
  if (complete && complete.pct > 25) needs.push("Ouverte à une routine complète si chaque étape est bien expliquée");
  const priority = p.psychology?.priorityFirst?.value;
  const priorityNeeds: Record<string, string> = {
    ludique: "Des produits ludiques qui transforment le soin en moment de plaisir",
    clean: "Des formulations clean et naturelles avec des certifications reconnues",
    efficacite: "Des résultats visibles et mesurables sur la peau dès les premières semaines",
    autonomie: "Des produits conçus pour que l'enfant les utilise seul en toute sécurité",
    science: "Des formulations validées par des études cliniques indépendantes",
  };
  if (priority && priorityNeeds[priority]) needs.push(priorityNeeds[priority]);
  return needs.slice(0, 3);
}

/* ── Behavior bullets generator (no mobile-first, 3 metrics) ── */

function generateBehaviors(p: PersonaStat, globalConvRate: number): string[] {
  const bullets: string[] = [];

  // 1. Content format preference
  const format = p.behavior?.formatTop?.[0];
  if (format) {
    const fmtMap: Record<string, string> = {
      visual: "Réceptive aux contenus visuels (photos avant/après, vidéos tutoriels)",
      short: "Préfère les messages courts, directs et facilement mémorisables",
      complete: "Apprécie les contenus détaillés et documentés pour se forger un avis",
    };
    bullets.push(fmtMap[format.value] || `Format préféré : ${format.value} (${format.pct}%)`);
  }

  // 2. Decision time
  const dur = p.behavior?.durationAvgSeconds;
  if (dur != null) {
    const min = Math.round(dur / 60);
    if (min <= 3) bullets.push(`Décision rapide : complète le diagnostic en ${min} min en moyenne`);
    else if (min >= 6) bullets.push(`Profil réfléchi : prend ${min} min en moyenne pour comparer les options`);
    else bullets.push(`Temps de réflexion modéré : ${min} min en moyenne sur le diagnostic`);
  }

  // 3. Engagement score or opt-in behavior
  const engagement = p.behavior?.engagementAvg;
  if (engagement != null) {
    if (engagement >= 70) bullets.push(`Fort engagement (score ${Math.round(engagement)}/100) — très impliquée dans le parcours`);
    else if (engagement >= 40) bullets.push(`Engagement moyen (score ${Math.round(engagement)}/100) — explore sans approfondir`);
    else bullets.push(`Engagement faible (score ${Math.round(engagement)}/100) — parcours express`);
  }

  return bullets.slice(0, 3);
}

/* ── AI Insights generator (enriched) ───────────────── */

function generateInsightsText(p: PersonaStat, globalAvg: { conversionRate: number; aov: number }): string[] {
  const insights: string[] = [];
  const convRate = p.business ? (p.business.conversions / Math.max(p.count, 1)) * 100 : 0;

  if (convRate > globalAvg.conversionRate * 1.3 && globalAvg.conversionRate > 0) {
    insights.push(`Taux de conversion supérieur de ${Math.round((convRate / globalAvg.conversionRate - 1) * 100)}% à la moyenne globale. Ce segment est particulièrement réceptif au diagnostic — capitaliser dessus avec des campagnes ciblées.`);
  } else if (convRate < globalAvg.conversionRate * 0.7 && globalAvg.conversionRate > 0 && p.count > 5) {
    insights.push(`Conversion en dessous de la moyenne (${convRate.toFixed(1)}% vs ${globalAvg.conversionRate.toFixed(1)}%). Identifier les freins spécifiques : manque de réassurance, prix perçu trop élevé, ou produits mal ciblés.`);
  }

  if (p.business?.aov && globalAvg.aov > 0) {
    const diff = ((p.business.aov / globalAvg.aov) - 1) * 100;
    if (diff > 15) {
      insights.push(`Panier moyen ${Math.round(diff)}% au-dessus de la moyenne. Opportunité d'upsell : proposer des routines complètes ou des coffrets premium à ce segment.`);
    } else if (diff < -15) {
      insights.push(`Panier moyen inférieur de ${Math.abs(Math.round(diff))}% à la moyenne. Tester des bundles attractifs ou des offres de découverte pour augmenter la valeur du panier.`);
    }
  }

  if (p.behavior?.optinEmailPct != null && p.behavior.optinEmailPct > 60) {
    insights.push(`${p.behavior.optinEmailPct}% d'opt-in email — audience très engageable. Mettre en place des séquences de nurturing personnalisées pour ce profil.`);
  }

  if (insights.length === 0) {
    insights.push("Segment à surveiller. Accumuler davantage de données pour dégager des tendances exploitables et affiner la stratégie marketing.");
  }

  return insights;
}

/* ── Extended persona profile from DB ── */
interface ExtendedPersonaProfile extends PersonaDBProfile {
  is_auto_created?: boolean;
  auto_created_at?: string;
  session_count?: number;
  avg_matching_score?: number;
  detection_source?: string;
}

/* ── Persona Card ────────────────────────────────────── */

function PersonaCard({ persona, globalAvg, globalRevenue, dbProfile }: {
  persona: PersonaStat;
  globalAvg: { conversionRate: number; aov: number; engagement: number };
  globalRevenue: number;
  dbProfile?: PersonaDBProfile & { is_auto_created?: boolean; auto_created_at?: string; session_count?: number; avg_matching_score?: number; detection_source?: string };
}) {
  const color = getPersonaColor(persona.code);
  const p = persona;
  const { getLabel } = usePersonaProfiles();
  const fullLabel = getLabel(p.code);
  const labelParts = fullLabel.split(" — ");
  const displayName = labelParts[0] || p.name;
  const title = labelParts.slice(1).join(" — ") || p.subtitle;
  const description = dbProfile?.description || p.subtitle;
  const image = PERSONA_IMAGES[p.code];
  const isAuto = dbProfile?.is_auto_created === true;

  if (!p.profile) {
    return (
      <Card className="p-5 opacity-60">
        <p className="text-sm font-bold" style={{ color: `hsl(${color})` }}>{displayName} ({p.code})</p>
        <p className="text-xs text-muted-foreground mt-1">Aucune donnée sur cette période</p>
      </Card>
    );
  }

  const convRate = p.business ? (p.business.conversions / Math.max(p.count, 1)) * 100 : 0;
  const psychText = generatePsychologyText(p);
  const keyIssues = generateKeyIssues(p);
  const needs = generateNeeds(p);
  const behaviors = generateBehaviors(p, globalAvg.conversionRate);
  const aiInsights = generateInsightsText(p, globalAvg);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden h-full flex flex-col">
        {/* Header with avatar */}
        <div className="p-5 pb-4 bg-card">
          <div className="flex items-center gap-4 mb-4">
            {image && (
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-offset-2" style={{ borderColor: `hsl(${color})` }}>
                <img src={image} alt={displayName} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground leading-tight">{displayName} <span className="font-medium text-muted-foreground">— {title}</span></h3>
                {isAuto && (
                  <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-xs gap-1 shrink-0">
                    <Sparkles className="w-3 h-3" /> Auto-détecté
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
              {isAuto && dbProfile?.auto_created_at && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Créé le {new Date(dbProfile.auto_created_at).toLocaleDateString("fr-FR")} · {dbProfile.session_count ?? 0} sessions · score moy. {Number(dbProfile.avg_matching_score ?? 0).toFixed(0)}%
                </p>
              )}
            </div>
          </div>
          {/* Manual disable button for auto-created personas */}
          {isAuto && (
            <div className="flex gap-2 mt-3 mb-1">
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1 rounded-md border border-border hover:border-destructive/50"
                title="Désactiver ce persona auto-détecté"
                onClick={async () => {
                  if (!confirm(`Désactiver le persona ${displayName} ?`)) return;
                  await supabase.from("personas").update({ is_active: false }).eq("code", p.code);
                  window.location.reload();
                }}
              >
                <PowerOff className="w-3 h-3" /> Désactiver
              </button>
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 rounded-md border border-border hover:border-primary/50"
                title="Modifier ce persona"
                onClick={() => alert(`Pour modifier ${displayName}, éditez directement la table personas dans le backend (code: ${p.code}).`)}
              >
                <Edit2 className="w-3 h-3" /> Modifier
              </button>
            </div>
          )}

          {/* Progress bar — prospect percentage */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Représente {p.percentage}% de vos prospects</p>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "hsl(348 83% 47%)" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(p.percentage * 2, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* KPIs — 2 per row */}
          {(() => {
            const convVsGlobal = globalAvg.conversionRate > 0 ? Math.round(((convRate / globalAvg.conversionRate) - 1) * 1000) / 10 : null;
            const kpis = [
              { icon: Users, label: "Volume", value: String(p.count) },
              { icon: TrendingUp, label: "Taux de conversion", value: `${convRate.toFixed(1)}%`, sub: convVsGlobal != null ? `${convVsGlobal > 0 ? "+" : ""}${convVsGlobal}% vs moy.` : undefined, subColor: convVsGlobal != null ? (convVsGlobal >= 0 ? "text-green-600" : "text-red-500") : "" },
              { icon: ShoppingCart, label: "AOV", value: p.business?.aov ? `${p.business.aov.toFixed(0)}€` : "–", sub: p.business?.aovVsGlobal != null ? `${p.business.aovVsGlobal > 0 ? "+" : ""}${p.business.aovVsGlobal}% vs moy.` : undefined, subColor: p.business?.aovVsGlobal != null ? (p.business.aovVsGlobal >= 0 ? "text-green-600" : "text-red-500") : "" },
              { icon: Zap, label: "Engagement", value: p.behavior?.engagementAvg != null ? `${Math.round(p.behavior.engagementAvg)}/100` : "–" },
            ];
            return (
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                {kpis.map((kpi, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
                    <kpi.icon className="w-5 h-5 shrink-0" style={{ color: `hsl(${color})` }} />
                    <div>
                      <p className="text-base font-bold text-foreground">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      {kpi.sub && (
                        <p className={`text-xs font-medium ${kpi.subColor}`}>{kpi.sub}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Body */}
        <div className="p-5 pt-4 space-y-5 flex-1 text-sm">
          {/* Psychology */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-sm">
              🧠 Psychologie
            </h4>
            <p className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: boldKeyPhrases(psychText) }} />
          </div>

          {/* Key issues */}
          {keyIssues.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Problématiques clés
              </h4>
              <ul className="space-y-1.5 text-muted-foreground">
                {keyIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{ __html: boldKeyPhrases(issue) }} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Essential needs */}
          {needs.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" /> Besoins essentiels
              </h4>
              <ul className="space-y-1.5 text-muted-foreground">
                {needs.map((need, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{ __html: boldKeyPhrases(need) }} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Behaviors */}
          {behaviors.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-sm">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Comportements
              </h4>
              <ul className="space-y-1.5 text-muted-foreground">
                {behaviors.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{ __html: boldKeyPhrases(b) }} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top products — max 3 */}
          {p.topProducts.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-sm">
                <Package className="w-4 h-4" style={{ color: `hsl(${color})` }} /> Top produits recommandés
              </h4>
              <div className="flex flex-col gap-2">
                {p.topProducts.slice(0, 3).map((prod, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium w-fit" style={{ backgroundColor: `hsl(${color} / 0.12)`, color: `hsl(${color})` }}>
                    {prod.name} ({prod.pct}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="p-5 pt-0 mt-auto">
          <div className="rounded-lg p-4" style={{ backgroundColor: `hsl(${color} / 0.06)`, borderLeft: `3px solid hsl(${color})` }}>
            <h4 className="font-semibold mb-2.5 flex items-center gap-1.5 text-sm" style={{ color: `hsl(${color})` }}>
              <Lightbulb className="w-4 h-4" /> Insights IA
            </h4>
            <ul className="space-y-2">
              {aiInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: `hsl(${color} / 0.85)` }}>
                  <span className="mt-0.5">→</span>
                  <span dangerouslySetInnerHTML={{ __html: boldKeyPhrases(insight) }} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Business footer — CA + % circle */}
        <div className="p-5 pt-0">
          <div className="border-t border-border/50 pt-4">
            {p.business && p.business.conversions > 0 ? (
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{p.business.revenue.toLocaleString("fr-FR")}€</p>
                  <p className="text-sm text-muted-foreground">CA généré</p>
                </div>
                {globalRevenue > 0 && (() => {
                  const pct = Math.round((p.business.revenue / globalRevenue) * 1000) / 10;
                  const r = 24;
                  const circ = 2 * Math.PI * r;
                  const offset = circ - (circ * Math.min(pct, 100)) / 100;
                  return (
                    <div className="flex flex-col items-center">
                      <svg width="62" height="62" viewBox="0 0 62 62" className="-rotate-90">
                        <circle cx="31" cy="31" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                        <circle cx="31" cy="31" r={r} fill="none" stroke={`hsl(${color})`} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
                      </svg>
                      <p className="text-sm font-bold text-foreground -mt-[41px]">{pct}%</p>
                      <p className="text-xs text-muted-foreground mt-5">du CA global</p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">0 conversion — segment à activer</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ── Main Tab ────────────────────────────────────────── */

export function PersonasTab({ dateRange }: PersonasTabProps) {
  const { personas, isLoading, error, totalCompleted, globalAvg } = usePersonaStats(dateRange);
  // deno-lint-ignore no-explicit-any
  const [dbProfiles, setDbProfiles] = useState<ExtendedPersonaProfile[]>([]);

  useEffect(() => {
    supabase
      .from("personas")
      .select("code, name, full_label, description, is_pool, is_active, is_auto_created, auto_created_at, session_count, avg_matching_score, detection_source")
      .eq("is_active", true)
      .then(({ data }) => { if (data) setDbProfiles(data); });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des personas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <p>Erreur lors du chargement</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const totalSessionsForThreshold = personas.reduce((sum, p) => sum + (p.code !== "P0" ? p.count : 0), 0);
  const MIN_VOLUME = Math.max(3, Math.round(totalSessionsForThreshold * 0.05));
  const p0Stat = personas.find(p => p.code === "P0");
  const visiblePersonas = [...personas].filter(p => p.code !== "P0" && p.count >= MIN_VOLUME).sort((a, b) => b.count - a.count);
  const hiddenCount = personas.filter(p => p.code !== "P0" && p.count > 0 && p.count < MIN_VOLUME).length;
  const p0Count = p0Stat?.count ?? 0;
  const globalRevenue = personas.reduce((sum, p) => sum + (p.business?.revenue || 0), 0);

  const autoCount = dbProfiles.filter((p) => p.is_auto_created).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading">
          Personas — {totalCompleted} sessions terminées
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {visiblePersonas.length} profils affichés (seuil minimum : {MIN_VOLUME} sessions)
          {hiddenCount > 0 && ` · ${hiddenCount} profil${hiddenCount > 1 ? "s" : ""} masqué${hiddenCount > 1 ? "s" : ""} (volume insuffisant)`}
          {autoCount > 0 && ` · ${autoCount} auto-détecté${autoCount > 1 ? "s" : ""}`}
          {p0Count > 0 && (
            <span className="ml-2 text-muted-foreground/70 italic">
              · {p0Count} session{p0Count > 1 ? "s" : ""} non attribuée{p0Count > 1 ? "s" : ""} (P0)
            </span>
          )}
        </p>
      </div>

      {/* Top 3 Personas — Potentiel de la semaine */}
      <TopPersonasPotential />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visiblePersonas.map((p) => (
          <PersonaCard
            key={p.code}
            persona={p}
            globalAvg={globalAvg}
            globalRevenue={globalRevenue}
            dbProfile={dbProfiles.find((dp) => dp.code === p.code)}
          />
        ))}
      </div>

    </div>
  );
}
