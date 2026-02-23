import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, TrendingUp, ShoppingCart, Zap, Lightbulb, AlertTriangle, CheckCircle, BarChart3, Package } from "lucide-react";
import { usePersonaStats, PersonaStat, PersonaTopItem } from "@/hooks/usePersonaStats";
import { DateRange } from "react-day-picker";

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

const PERSONA_NAMES: Record<string, string> = {
  P1: "La Novice Imperfections Enfant",
  P2: "La Novice Imperfections Pré-ado",
  P3: "La Novice Atopique",
  P4: "La Novice Sensible",
  P5: "La Multi-enfants Besoins Mixtes",
  P6: "La Novice Découverte",
  P7: "L'Insatisfaite",
  P8: "La Fidèle Imperfections",
  P9: "La Fidèle Exploratrice",
};

/* ── Translation maps ────────────────────────────────── */

const PRIORITY_LABELS: Record<string, string> = {
  efficacite: "Efficacité",
  ludique: "Côté ludique",
  clean: "Naturalité / Clean",
  autonomie: "Autonomie de l'enfant",
  science: "Validation scientifique",
};

const TRUST_LABELS: Record<string, string> = {
  ingredient_transparency: "Transparence des ingrédients",
  proof_results: "Preuves de résultats",
  parent_testimonials: "Témoignages de parents",
  scientific_validation: "Validation scientifique",
};

const FORMAT_LABELS: Record<string, string> = {
  visual: "Contenu visuel",
  short: "Contenu court et direct",
  complete: "Contenu détaillé et complet",
};

const ROUTINE_LABELS: Record<string, string> = {
  minimal: "Minimaliste (1-2 produits)",
  simple: "Simple (2-3 produits)",
  complete: "Complète (3+ produits)",
};

const REACTIVITY_LABELS: Record<string, string> = {
  no: "Aucune réactivité",
  environment: "Réactive à l'environnement",
  products: "Réactive aux produits",
};

function tr(value: string, map: Record<string, string>): string {
  return map[value] || value;
}

function trItem(item: PersonaTopItem, map: Record<string, string>): PersonaTopItem {
  return { ...item, value: tr(item.value, map) };
}

/* ── Psychology text generator ───────────────────────── */

function generatePsychologyText(p: PersonaStat): string {
  const priority = p.psychology?.priorityFirst?.value;
  const trust = p.psychology?.trustFirst?.value;

  const priorityTexts: Record<string, string> = {
    efficacite: "Cherche avant tout des résultats visibles et prouvés.",
    ludique: "Veut que le soin soit un moment agréable et ludique pour son enfant.",
    clean: "Exigeante sur la naturalité et la composition des produits.",
    autonomie: "Souhaite que son enfant devienne autonome dans sa routine de soin.",
    science: "Accorde une grande importance aux validations scientifiques.",
  };

  const trustTexts: Record<string, string> = {
    proof_results: "A besoin d'être convaincue par des preuves concrètes avant d'acheter.",
    ingredient_transparency: "Très attentive à la composition et aux ingrédients.",
    parent_testimonials: "Se fie beaucoup aux témoignages d'autres parents.",
    scientific_validation: "Recherche des garanties dermatologiques et scientifiques.",
  };

  const parts: string[] = [];
  if (priority && priorityTexts[priority]) parts.push(priorityTexts[priority]);
  if (trust && trustTexts[trust]) parts.push(trustTexts[trust]);
  if (parts.length === 0) return "Profil en cours d'analyse — pas encore assez de données pour caractériser la psychologie.";
  return parts.join(" ");
}

/* ── Key issues generator ────────────────────────────── */

function generateKeyIssues(p: PersonaStat): string[] {
  const issues: string[] = [];
  const trust = p.psychology?.trustTop3 || [];
  const reactivity = p.profile?.reactivityTop || [];
  const fragrance = p.profile?.excludeFragrancePct ?? 0;

  for (const t of trust.slice(0, 2)) {
    const map: Record<string, string> = {
      ingredient_transparency: "A besoin de connaître exactement la composition des produits",
      proof_results: "Veut voir des résultats prouvés avant de s'engager",
      parent_testimonials: "Cherche l'avis d'autres parents pour se rassurer",
      scientific_validation: "Sensible aux validations scientifiques et dermatologiques",
    };
    if (map[t.value]) issues.push(map[t.value]);
  }

  const envReact = reactivity.find((r) => r.value === "environment");
  if (envReact && envReact.pct > 50) {
    issues.push("Peau de l'enfant réactive à l'environnement (froid, vent, pollution)");
  }
  const prodReact = reactivity.find((r) => r.value === "products");
  if (prodReact && prodReact.pct > 10) {
    issues.push("A déjà eu des réactions à certains produits cosmétiques");
  }
  if (fragrance > 10) {
    issues.push("Préfère les produits sans parfum par précaution");
  }

  return issues.slice(0, 4);
}

/* ── Essential needs generator ───────────────────────── */

function generateNeeds(p: PersonaStat): string[] {
  const needs: string[] = [];
  const routine = p.psychology?.routineSizeDist || [];
  const priority = p.psychology?.priorityFirst?.value;

  const minimal = routine.find((r) => r.value === "minimal");
  const simple = routine.find((r) => r.value === "simple");
  const complete = routine.find((r) => r.value === "complete");

  if (minimal && minimal.pct > 40) needs.push("Routine minimaliste en 1-2 produits maximum");
  if (simple && simple.pct > 40) needs.push("Routine simple et rapide, facile à intégrer au quotidien");
  if (complete && complete.pct > 25) needs.push("Ouverte à une routine complète si elle comprend l'utilité de chaque produit");

  const priorityNeeds: Record<string, string> = {
    ludique: "Produits ludiques qui donnent envie à l'enfant",
    clean: "Formulations clean et naturelles certifiées",
    efficacite: "Résultats visibles rapidement sur la peau",
    autonomie: "Produits que l'enfant peut utiliser seul",
    science: "Formulations validées scientifiquement",
  };
  if (priority && priorityNeeds[priority]) needs.push(priorityNeeds[priority]);

  return needs.slice(0, 4);
}

/* ── Behavior bullets generator ──────────────────────── */

function generateBehaviors(p: PersonaStat, globalConvRate: number): string[] {
  const bullets: string[] = [];
  const device = p.profile?.deviceTop?.[0];
  if (device) {
    const pct = device.pct;
    if (device.value === "mobile") bullets.push(`Mobile-first (${pct}% sur smartphone)`);
    else if (device.value === "desktop") bullets.push(`Desktop-first (${pct}% sur ordinateur)`);
    else bullets.push(`${device.value} (${pct}%)`);
  }

  const format = p.behavior?.formatTop?.[0];
  if (format) {
    const fmtMap: Record<string, string> = {
      visual: "Réceptive aux contenus visuels (photos avant/après, vidéos)",
      short: "Préfère les messages courts et directs",
      complete: "Apprécie les contenus détaillés et complets",
    };
    bullets.push(fmtMap[format.value] || `Format préféré : ${format.value} (${format.pct}%)`);
  }

  const dur = p.behavior?.durationAvgSeconds;
  if (dur != null) {
    const min = Math.round(dur / 60);
    if (min <= 4) bullets.push(`Décide rapidement (${min} min en moyenne)`);
    else if (min >= 6) bullets.push(`Prend son temps pour comparer (${min} min en moyenne)`);
    else bullets.push(`Durée moyenne de ${min} min`);
  }

  const convRate = p.business ? (p.business.conversions / Math.max(p.count, 1)) * 100 : 0;
  if (globalConvRate > 0 && convRate > globalConvRate * 1.5) {
    bullets.push(`Convertit ${(convRate / globalConvRate).toFixed(1)}× mieux que la moyenne`);
  } else if (globalConvRate > 0 && convRate < globalConvRate * 0.5 && (p.behavior?.engagementAvg ?? 0) > 60) {
    bullets.push("Faible conversion malgré un fort engagement — besoin de réassurance");
  }

  return bullets.slice(0, 4);
}

/* ── Persona Card ────────────────────────────────────── */

function PersonaCard({ persona, globalAvg }: { persona: PersonaStat; globalAvg: { conversionRate: number; aov: number; engagement: number } }) {
  const color = PERSONA_COLORS[persona.code] || "0 0% 50%";
  const p = persona;

  if (!p.profile) {
    return (
      <Card className="p-5 opacity-60">
        <p className="text-sm font-bold" style={{ color: `hsl(${color})` }}>{p.code} — {p.name}</p>
        <p className="text-xs text-muted-foreground mt-1">Aucune donnée sur cette période</p>
      </Card>
    );
  }

  const convRate = p.business ? (p.business.conversions / Math.max(p.count, 1)) * 100 : 0;
  const psychText = generatePsychologyText(p);
  const keyIssues = generateKeyIssues(p);
  const needs = generateNeeds(p);
  const behaviors = generateBehaviors(p, globalAvg.conversionRate);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="p-5 pb-3" style={{ borderBottom: `3px solid hsl(${color})` }}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-bold" style={{ color: `hsl(${color})` }}>{p.code}</p>
            <Badge className="text-[10px] text-white shrink-0" style={{ backgroundColor: `hsl(${color})` }}>
              {p.percentage}% de vos prospects
            </Badge>
          </div>
          <h3 className="text-base font-bold text-foreground leading-tight">{p.name}</h3>
          <p className="text-xs italic text-muted-foreground mt-0.5">{p.subtitle}</p>
          <Progress value={Math.min(p.percentage * 2, 100)} className="h-1.5 mt-3" />

          {/* Mini KPIs */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { icon: Users, label: "Volume", value: String(p.count) },
              { icon: TrendingUp, label: "Conversion", value: `${convRate.toFixed(1)}%` },
              { icon: ShoppingCart, label: "AOV", value: p.business?.aov ? `${p.business.aov.toFixed(0)}€` : "–" },
              { icon: Zap, label: "Engagement", value: p.behavior?.engagementAvg != null ? `${p.behavior.engagementAvg}` : "–" },
            ].map((kpi, i) => (
              <div key={i} className="text-center bg-muted/40 rounded-md p-1.5">
                <kpi.icon className="w-3 h-3 mx-auto mb-0.5" style={{ color: `hsl(${color})` }} />
                <p className="text-xs font-bold text-foreground">{kpi.value}</p>
                <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pt-4 space-y-4 flex-1 text-xs">
          {/* Psychology */}
          <div>
            <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              🧠 Psychologie
            </h4>
            <p className="text-muted-foreground leading-relaxed">{psychText}</p>
          </div>

          {/* Key issues */}
          {keyIssues.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Problématiques clés
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                {keyIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Essential needs */}
          {needs.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Besoins essentiels
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                {needs.map((need, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{need}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Behaviors */}
          {behaviors.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" /> Comportements
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                {behaviors.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top products */}
          {p.topProducts.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" style={{ color: `hsl(${color})` }} /> Top produits recommandés
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {p.topProducts.slice(0, 5).map((prod, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] py-0.5 px-2" style={{ borderColor: `hsl(${color} / 0.3)`, backgroundColor: `hsl(${color} / 0.06)` }}>
                    {prod.name} ({prod.pct}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Insights IA */}
          {p.insights.length > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: `hsl(${color} / 0.05)` }}>
              <h4 className="font-semibold mb-2 flex items-center gap-1.5" style={{ color: `hsl(${color})` }}>
                <Lightbulb className="w-3.5 h-3.5" /> Insights IA
              </h4>
              <ul className="space-y-1.5">
                {p.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-1.5" style={{ color: `hsl(${color})` }}>
                    <span className="mt-0.5">→</span>
                    <span className="text-[11px] leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Business footer */}
        <div className="p-4 pt-0 mt-auto">
          <div className="border-t border-border/50 pt-3">
            {p.business && p.business.conversions > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-foreground">{convRate.toFixed(1)}%</p>
                  <p className="text-[9px] text-muted-foreground">Conversion</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{p.business.aov.toFixed(0)}€</p>
                  <p className="text-[9px] text-muted-foreground">AOV moyen</p>
                  {p.business.aovVsGlobal != null && (
                    <p className={`text-[9px] font-medium ${p.business.aovVsGlobal >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {p.business.aovVsGlobal > 0 ? "+" : ""}{p.business.aovVsGlobal}% vs moy.
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{p.business.revenue.toLocaleString("fr-FR")}€</p>
                  <p className="text-[9px] text-muted-foreground">CA généré</p>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground text-center">0 conversion — segment à activer</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-heading">
          Personas — {totalCompleted} sessions terminées
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          9 profils basés sur l'arbre de décision diagnostic
        </p>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {personas.map((p) => (
          <PersonaCard key={p.code} persona={p} globalAvg={globalAvg} />
        ))}
      </div>
    </div>
  );
}