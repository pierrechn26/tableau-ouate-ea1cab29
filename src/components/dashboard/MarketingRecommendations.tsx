import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Mail,
  Gift,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  Video,
  Zap,
  Users,
  TrendingUp,
  Tag,
  ShoppingCart,
  RefreshCw,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMarketingRecommendations } from "@/hooks/useMarketingRecommendations";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, nextMonday, isMonday, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { getPersonaBadgeLabel } from "@/constants/personas";

// Hook for animated counter
function useAnimatedCounter(value: number, duration: number = 400) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      setDisplayValue(Math.round(currentValue));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    previousValue.current = value;
  }, [value, duration]);

  return displayValue;
}

function PersonaBadges({ personas }: { personas?: string[] }) {
  if (!personas || personas.length === 0) return null;
  const colors: Record<string, string> = {
    P1: "bg-primary/20 text-primary border-primary/30",
    P2: "bg-secondary/20 text-secondary border-secondary/30",
    P3: "bg-accent/20 text-foreground border-accent/30",
    P4: "bg-primary/20 text-primary border-primary/30",
    P5: "bg-secondary/20 text-secondary border-secondary/30",
    P6: "bg-accent/20 text-foreground border-accent/30",
    P7: "bg-primary/20 text-primary border-primary/30",
    P8: "bg-secondary/20 text-secondary border-secondary/30",
    P9: "bg-accent/20 text-foreground border-accent/30",
  };
  return (
    <span className="inline-flex gap-1 ml-2 flex-wrap">
      {personas.map((p) => (
        <Badge
          key={p}
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-5 font-bold ${colors[p] || "bg-muted text-muted-foreground"}`}
        >
          {getPersonaBadgeLabel(p)}
        </Badge>
      ))}
    </span>
  );
}

function formatWeekStart(dateStr: string) {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

function formatGeneratedAt(dateStr: string | null) {
  if (!dateStr) return "";
  try {
    const utcDate = parseISO(dateStr);
    // Convert to Europe/Paris timezone
    const parisStr = utcDate.toLocaleString("sv-SE", { timeZone: "Europe/Paris" });
    const parisDate = new Date(parisStr.replace(" ", "T"));
    return format(parisDate, "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return dateStr;
  }
}

export function MarketingRecommendations() {
  const {
    data,
    isLoading,
    isGenerating,
    isOutdated,
    generateRecommendations,
    updateChecklistItem,
  } = useMarketingRecommendations();

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [initialExpanded, setInitialExpanded] = useState(false);

  // Auto-generate: on first load if no data, OR if current week_start is outdated (Monday passed)
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);
  const [weeklyUpdateDone, setWeeklyUpdateDone] = useState(false);

  // Compute next Monday for display
  const nextMondayDate = useMemo(() => {
    const now = new Date();
    if (isMonday(now)) {
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      return startOfDay(next);
    }
    return startOfDay(nextMonday(now));
  }, []);

  useEffect(() => {
    if (isLoading || isGenerating || autoGenerateTriggered) return;

    // Case 1: No data at all → auto-generate
    if (!data) {
      setAutoGenerateTriggered(true);
      generateRecommendations();
      return;
    }

    // Case 2: Data exists but from previous week → auto-generate
    const weekStart = new Date(data.week_start);
    const now = new Date();
    const diffDays = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= 7) {
      setAutoGenerateTriggered(true);
      generateRecommendations();
    }
  }, [isLoading, data, isGenerating, autoGenerateTriggered, generateRecommendations]);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const checklist = (data?.checklist || []) as any[];
  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;
  const animatedProgress = useAnimatedCounter(Math.round(progress), 500);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Chargement des recommandations...</span>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">Génération en cours... (~2 min)</p>
        <p className="text-sm text-muted-foreground">
          L'IA analyse vos données personas et génère des recommandations personnalisées
        </p>
      </div>
    );
  }

  // No data and not auto-generating
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Sparkles className="w-12 h-12 text-primary/40" />
        <p className="text-lg font-medium text-foreground">Aucune recommandation générée</p>
        <Button onClick={generateRecommendations} disabled={isGenerating}>
          <Sparkles className="w-4 h-4 mr-2" />
          Générer les premières recommandations
        </Button>
      </div>
    );
  }

  const ads = data.ads_recommendations || {};
  const email = data.email_recommendations || {};
  const offers = data.offers_recommendations || {};

  const getSectionIcon = (title: string) => {
    if (title.includes("Hook") || title.includes("hook")) return Lightbulb;
    if (title.includes("Concept") || title.includes("vidéo")) return Video;
    if (title.includes("Angle")) return Target;
    if (title.includes("Flow") || title.includes("flow")) return TrendingUp;
    if (title.includes("Ligne") || title.includes("objet")) return Mail;
    if (title.includes("Segment")) return Users;
    if (title.includes("Bundle") || title.includes("bundle")) return Gift;
    if (title.includes("Prix") || title.includes("prix")) return Tag;
    if (title.includes("Upsell") || title.includes("upsell")) return ShoppingCart;
    return Zap;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading">
            Marketing IA Hub
          </h2>
          <p className="text-muted-foreground">
            Recommandations de la semaine du {formatWeekStart(data.week_start)}
            {data.generated_at && (
              <span className="text-xs ml-2">
                — Générées le {formatGeneratedAt(data.generated_at)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Outdated banner — one-time weekly update */}
      {isOutdated && !weeklyUpdateDone && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm"
        >
          <span className="text-foreground">
            📅 Recommandations de la semaine du {formatWeekStart(data.week_start)} — Nouvelles recommandations disponibles
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setWeeklyUpdateDone(true);
              generateRecommendations();
            }}
            disabled={isGenerating}
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isGenerating ? "animate-spin" : ""}`} />
            Mettre à jour
          </Button>
        </motion.div>
      )}

      {/* After weekly update done */}
      {isOutdated && weeklyUpdateDone && !isGenerating && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
          <span>
            Prochaine mise à jour : lundi {format(nextMondayDate, "d MMMM yyyy", { locale: fr })} à 08h00
          </span>
        </div>
      )}

      {/* Section 1: Checklist hebdomadaire */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-card to-accent/5 border-2 border-primary/20 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground font-heading">
                Checklist hebdomadaire
              </h3>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{checklist.length} actions complétées
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-primary">{animatedProgress}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
            />
          </div>
          {progress === 100 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-primary mt-3 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Bravo ! Vous avez complété toutes les recommandations marketing de la semaine 🎉
            </motion.p>
          )}
        </div>

        <div className="space-y-3">
          {checklist.map((action: any) => (
            <Collapsible
              key={action.id}
              open={expandedItems.includes(action.id)}
              onOpenChange={() => toggleExpanded(action.id)}
            >
              <div
                className={`rounded-xl border-2 transition-all duration-200 ${
                  action.completed
                    ? "bg-primary/10 border-primary/40"
                    : "bg-background border-border hover:border-primary/40 hover:shadow-md"
                }`}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-4 cursor-pointer">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={action.completed}
                        onCheckedChange={() =>
                          updateChecklistItem(action.id, !action.completed)
                        }
                        className="h-5 w-5"
                      />
                    </div>
                    <span
                      className={`flex-1 text-sm font-medium ${
                        action.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {safeString(action.title)}
                      {action.reconduite && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] px-1.5 py-0 h-5 font-bold bg-orange-500/15 text-orange-600 border-orange-500/30"
                        >
                          <RotateCcw className="w-3 h-3 mr-0.5" />
                          Reconduite
                        </Badge>
                      )}
                      <PersonaBadges personas={action.personas} />
                    </span>
                    <div className="flex items-center gap-2 text-primary">
                      <span className="text-xs font-medium">Voir le détail</span>
                      {expandedItems.includes(action.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 pt-0"
                    >
                      <div className="pl-8 space-y-4 border-t border-border/50 pt-4 mt-1">
                        {renderChecklistDetail(action.detail, action.category)}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </Card>

      {/* Section 2: Recommandations complètes */}
      <div>
        <h3 className="text-xl font-bold text-foreground font-heading mb-4">
          Recommandations complètes
        </h3>
        <div className="space-y-3">
          {/* Ads */}
          <RecoCollapsible
            icon={Megaphone}
            title="Ads (Meta / TikTok)"
            colorClass="text-primary"
            iconBg="bg-primary/10"
          >
            <div className="space-y-4">
              <RecoSection title="Hooks créatifs" icon={Lightbulb} color="bg-primary/10 border-primary/30"
                items={(ads.hooks_creatifs || []).map((h: any) => ({ text: `"${h.text}"`, personas: h.personas, sub: h.rationale }))} />
              <RecoSection title="Concepts vidéo" icon={Video} color="bg-accent/10 border-accent/30"
                items={(ads.concepts_video || []).map((c: any) => ({ text: c.title, personas: c.personas, sub: c.description }))} />
              <RecoSection title="Angles psychologiques" icon={Target} color="bg-secondary/10 border-secondary/30"
                items={(ads.angles_psychologiques || []).map((a: any) => ({ text: a.angle, personas: a.personas, sub: a.source }))} />
              <RecoSection title="Ciblage" icon={Users} color="bg-primary/10 border-primary/30"
                items={(ads.ciblage || []).map((c: any) => ({ text: c.audience, personas: c.personas }))} />
            </div>
          </RecoCollapsible>

          {/* Email */}
          <RecoCollapsible
            icon={Mail}
            title="Email Marketing"
            colorClass="text-secondary"
            iconBg="bg-secondary/10"
          >
            <div className="space-y-4">
              <RecoSection title="Flows automatisés" icon={TrendingUp} color="bg-secondary/10 border-secondary/30"
                items={(email.flows_automatises || []).map((f: any) => ({ text: f.title, personas: f.personas, sub: f.sequence }))} />
              <RecoSection title="Lignes d'objet" icon={Mail} color="bg-primary/10 border-primary/30"
                items={(email.lignes_objet || []).map((l: any) => ({ text: `"${l.text}"`, personas: l.personas, sub: l.context }))} />
              <RecoSection title="Segmentation optimisée" icon={Users} color="bg-accent/10 border-accent/30"
                items={(email.segmentation || []).map((s: any) => ({ text: s.segment, personas: s.personas, sub: s.action }))} />
            </div>
          </RecoCollapsible>

          {/* Offres & Bundles */}
          <RecoCollapsible
            icon={Gift}
            title="Offres & Bundles"
            colorClass="text-foreground"
            iconBg="bg-accent/10"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <RecoSection title="Bundles personnalisés" icon={Gift} color="bg-accent/10 border-accent/30"
                items={(offers.bundles || []).map((b: any) => ({ text: b.name, personas: b.personas, sub: `${b.produits} — ${b.prix}` }))} />
              <RecoSection title="Prix psychologiques" icon={Tag} color="bg-secondary/10 border-secondary/30"
                items={(offers.prix_psychologiques || []).map((p: any) => ({ text: p.strategie, sub: p.rationale }))} />
              <RecoSection title="Upsells intelligents" icon={ShoppingCart} color="bg-primary/10 border-primary/30"
                items={(offers.upsells || []).map((u: any) => ({ text: u.trigger, sub: u.action }))} />
            </div>
          </RecoCollapsible>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function RecoCollapsible({
  icon: Icon,
  title,
  colorClass,
  iconBg,
  children,
}: {
  icon: any;
  title: string;
  colorClass: string;
  iconBg: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-2 border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className={`p-2.5 rounded-xl ${iconBg} shadow-sm`}>
              <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
            <h3 className={`text-lg font-bold ${colorClass} flex-1`}>{title}</h3>
            {open ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pb-5 pt-0"
          >
            {children}
          </motion.div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface RecoItem {
  text: string;
  personas?: string[];
  sub?: string;
}

function RecoSection({
  title,
  icon: Icon,
  color,
  items,
}: {
  title: string;
  icon: any;
  color: string;
  items: RecoItem[];
}) {
  if (!items.length) return null;
  return (
    <div className={`p-4 rounded-xl border-2 ${color} transition-all duration-200 hover:shadow-md`}>
      <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h4>
      <ul className="space-y-2.5">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="text-xs text-foreground bg-background/80 rounded-lg p-3 border border-border/50 leading-relaxed shadow-sm"
          >
            <div className="flex items-start gap-1">
              <span className="flex-1">{safeString(item.text)}</span>
              <PersonaBadges personas={item.personas} />
            </div>
            {item.sub && (
              <p className="text-[11px] text-muted-foreground mt-1.5 italic">{safeString(item.sub)}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Strip persona codes like (P1), (P8), P1, P7 etc. from any displayed text */
function stripPersonaCodes(text: string): string {
  return text
    .replace(/\s*\(P\d+\)/gi, "")   // " (P8)"
    .replace(/\s*\[P\d+\]/gi, "")   // " [P8]"
    .replace(/\bP\d+\s*[-–—:]\s*/gi, "") // "P8 — " or "P8: "
    .replace(/,?\s*P\d+(?=\s|,|$)/gi, "") // trailing ", P8" or standalone "P8"
    .replace(/\s{2,}/g, " ")
    .trim();
}

function safeString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return stripPersonaCodes(val);
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(safeString).join(", ");
  if (typeof val === "object") {
    return Object.entries(val).map(([k, v]) => `${k}: ${safeString(v)}`).join(" — ");
  }
  return stripPersonaCodes(String(val));
}

function renderChecklistDetail(detail: any, category: string) {
  if (!detail) return null;

  const sections: { label: string; items: string[] }[] = [];

  if (detail.hooks_creatifs?.length) {
    sections.push({ label: "Hooks créatifs", items: detail.hooks_creatifs });
  }
  if (detail.concepts_video?.length) {
    sections.push({ label: "Concepts vidéo", items: detail.concepts_video });
  }
  if (detail.ciblage?.length) {
    sections.push({ label: "Ciblage", items: detail.ciblage });
  }
  if (detail.justification) {
    sections.push({ label: "Justification", items: [detail.justification] });
  }
  if (detail.flow) {
    sections.push({ label: "Flow", items: [detail.flow] });
  }
  if (detail.sequence) {
    sections.push({ label: "Séquence", items: [detail.sequence] });
  }
  if (detail.segments) {
    sections.push({ label: "Segments", items: [detail.segments] });
  }
  if (detail.lignes_objet?.length) {
    sections.push({ label: "Lignes d'objet", items: detail.lignes_objet });
  }
  if (detail.bundle) {
    sections.push({ label: "Bundle", items: [detail.bundle] });
  }
  if (detail.produits) {
    sections.push({ label: "Produits", items: [detail.produits] });
  }
  if (detail.prix) {
    sections.push({ label: "Prix", items: [detail.prix] });
  }
  if (detail.action) {
    sections.push({ label: "Action", items: [detail.action] });
  }
  if (detail.segment) {
    sections.push({ label: "Segment", items: [detail.segment] });
  }
  if (detail.expected_impact) {
    sections.push({ label: "Impact attendu", items: [detail.expected_impact] });
  }

  if (sections.length === 0) {
    // Fallback: render all string values
    const fallback = Object.entries(detail)
      .filter(([, v]) => typeof v === "string" || Array.isArray(v))
      .map(([k, v]) => ({
        label: String(k),
        items: Array.isArray(v) ? (v as any[]).map(safeString) : [safeString(v)],
      }));
    sections.push(...fallback);
  }

  return sections.map((section, idx) => (
    <div key={idx} className="space-y-2">
      <h5 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2">
        <Zap className="w-3 h-3" />
        {section.label}
      </h5>
      <ul className="space-y-2">
        {section.items.map((item, itemIdx) => (
          <li
            key={itemIdx}
            className="text-xs text-foreground bg-muted/50 rounded-lg p-2.5 border border-border/50"
          >
            {safeString(item)}
          </li>
        ))}
      </ul>
    </div>
  ));
}
