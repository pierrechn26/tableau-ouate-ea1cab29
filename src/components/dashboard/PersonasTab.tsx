import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, TrendingUp, ShoppingCart, Zap, ChevronDown, ChevronUp, BarChart3, Brain, Activity, Package, DollarSign, Lightbulb, Mail, MessageSquare } from "lucide-react";
import { usePersonaStats, PersonaStat } from "@/hooks/usePersonaStats";
import { DateRange } from "react-day-picker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PersonasTabProps {
  dateRange?: DateRange;
}

const PERSONA_COLORS: Record<string, string> = {
  P1: "348 83% 47%",  // primary red
  P2: "330 81% 60%",  // secondary pink
  P3: "15 85% 55%",   // accent orange
  P4: "205 85% 55%",  // blue
  P5: "155 65% 45%",  // green
  P6: "270 60% 55%",  // purple
  P7: "45 90% 50%",   // amber
  P8: "348 70% 35%",  // dark red
  P9: "195 70% 45%",  // teal
};

function PersonaSummaryCard({ persona, isSelected, onClick }: { persona: PersonaStat; isSelected: boolean; onClick: () => void }) {
  const color = PERSONA_COLORS[persona.code] || "0 0% 50%";
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex-shrink-0 w-[140px] rounded-xl p-3 text-left transition-all border-2 ${
        isSelected ? "border-current shadow-lg" : "border-transparent shadow-sm hover:shadow-md"
      }`}
      style={{
        backgroundColor: `hsl(${color} / 0.08)`,
        borderColor: isSelected ? `hsl(${color})` : "transparent",
      }}
    >
      <p className="text-xs font-bold truncate" style={{ color: `hsl(${color})` }}>
        {persona.code}
      </p>
      <p className="text-[10px] text-foreground/80 leading-tight mt-0.5 line-clamp-2 h-[26px]">
        {persona.name}
      </p>
      <p className="text-lg font-bold mt-1" style={{ color: `hsl(${color})` }}>
        {persona.percentage}%
      </p>
      <div className="h-1.5 rounded-full mt-1" style={{ backgroundColor: `hsl(${color} / 0.2)` }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(persona.percentage * 2, 100)}%`, backgroundColor: `hsl(${color})` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{persona.count} sessions</p>
    </motion.button>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TopItemsList({ items, label }: { items: Array<{ value: string; pct: number }>; label?: string }) {
  if (!items || items.length === 0) return <p className="text-xs text-muted-foreground">Aucune donnée</p>;
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-foreground/80">{item.value}</span>
          <Badge variant="secondary" className="text-[10px]">{item.pct}%</Badge>
        </div>
      ))}
    </div>
  );
}

function PersonaDetail({ persona }: { persona: PersonaStat }) {
  const color = PERSONA_COLORS[persona.code] || "0 0% 50%";
  const p = persona;

  if (!p.profile) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée pour ce persona sur cette période.</p>;
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds == null) return "–";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      {/* Header */}
      <div className="rounded-xl p-5" style={{ backgroundColor: `hsl(${color} / 0.06)`, borderLeft: `4px solid hsl(${color})` }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.subtitle}</p>
            <Badge className="mt-2 text-white" style={{ backgroundColor: `hsl(${color})` }}>
              {p.percentage}% de vos prospects
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Volume", value: p.count.toString(), icon: Users },
              { label: "Conversion", value: p.business ? `${(p.business.conversions / Math.max(p.count, 1) * 100).toFixed(1)}%` : "–", icon: TrendingUp },
              { label: "AOV", value: p.business?.aov ? `${p.business.aov.toFixed(0)}€` : "–", icon: ShoppingCart },
              { label: "Engagement", value: p.behavior?.engagementAvg != null ? `${p.behavior.engagementAvg}` : "–", icon: Zap },
            ].map((kpi, i) => (
              <div key={i} className="bg-card rounded-lg p-3 text-center shadow-sm border border-border/50">
                <kpi.icon className="w-4 h-4 mx-auto mb-1" style={{ color: `hsl(${color})` }} />
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-0 divide-y divide-border/50">
        <CollapsibleSection title="Profil Type" icon={BarChart3} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TopItemsList items={p.profile.ageRangeTop} label="Tranche d'âge enfant" />
            <TopItemsList items={p.profile.childCountDist} label="Nombre d'enfants" />
            <TopItemsList items={p.profile.reactivityTop} label="Réactivité peau" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Exclure parfum</span>
              <Badge variant="outline">{p.profile.excludeFragrancePct}%</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Multi-enfants</span>
              <Badge variant="outline">{p.profile.multiChildrenPct}%</Badge>
            </div>
            <TopItemsList items={p.profile.deviceTop} label="Device" />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Psychologie & Motivations" icon={Brain}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priorité #1</p>
              {p.psychology?.priorityFirst ? (
                <Badge style={{ backgroundColor: `hsl(${color} / 0.15)`, color: `hsl(${color})` }}>
                  {p.psychology.priorityFirst.value} ({p.psychology.priorityFirst.pct}%)
                </Badge>
              ) : <span className="text-xs text-muted-foreground">–</span>}
              <div className="mt-2">
                <TopItemsList items={p.psychology?.priorityTop3 || []} label="Top 3 priorités" />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Réassurance #1</p>
              {p.psychology?.trustFirst ? (
                <Badge style={{ backgroundColor: `hsl(${color} / 0.15)`, color: `hsl(${color})` }}>
                  {p.psychology.trustFirst.value} ({p.psychology.trustFirst.pct}%)
                </Badge>
              ) : <span className="text-xs text-muted-foreground">–</span>}
              <div className="mt-2">
                <TopItemsList items={p.psychology?.trustTop3 || []} label="Top 3 réassurances" />
              </div>
            </div>
            <TopItemsList items={p.psychology?.routineSizeDist || []} label="Routine souhaitée" />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Comportement" icon={Activity}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{formatDuration(p.behavior?.durationAvgSeconds ?? null)}</p>
              <p className="text-[10px] text-muted-foreground">Durée moyenne</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{p.behavior?.engagementAvg ?? "–"}</p>
              <p className="text-[10px] text-muted-foreground">Engagement moyen</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{p.behavior?.formatTop[0]?.value || "–"}</p>
              <p className="text-[10px] text-muted-foreground">Format préféré ({p.behavior?.formatTop[0]?.pct || 0}%)</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Mail className="w-3 h-3 text-primary" />
                <p className="text-lg font-bold text-foreground">{p.behavior?.optinEmailPct ?? 0}%</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Opt-in email</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MessageSquare className="w-3 h-3 text-accent" />
                <p className="text-lg font-bold text-foreground">{p.behavior?.optinSmsPct ?? 0}%</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Opt-in SMS</p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Top Produits Recommandés" icon={Package}>
          {p.topProducts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {p.topProducts.map((prod, i) => (
                <Badge key={i} variant="outline" className="text-xs py-1 px-3" style={{ borderColor: `hsl(${color} / 0.3)`, backgroundColor: `hsl(${color} / 0.05)` }}>
                  {prod.name} ({prod.pct}%)
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune donnée</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Performance Business" icon={DollarSign}>
          {p.business ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{p.business.conversions}</p>
                <p className="text-[10px] text-muted-foreground">Conversions</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{p.business.revenue.toLocaleString("fr-FR")}€</p>
                <p className="text-[10px] text-muted-foreground">CA généré</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">{p.business.aov.toFixed(0)}€</p>
                <p className="text-[10px] text-muted-foreground">AOV</p>
                {p.business.aovVsGlobal != null && (
                  <p className={`text-[10px] font-medium ${p.business.aovVsGlobal >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {p.business.aovVsGlobal > 0 ? "+" : ""}{p.business.aovVsGlobal}% vs moyenne
                  </p>
                )}
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {p.business.ecartPanier != null ? `${p.business.ecartPanier > 0 ? "+" : ""}${p.business.ecartPanier.toFixed(0)}€` : "–"}
                </p>
                <p className="text-[10px] text-muted-foreground">Écart panier</p>
                {p.business.ecartPanierPct != null && (
                  <p className={`text-[10px] font-medium ${p.business.ecartPanierPct >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {p.business.ecartPanierPct > 0 ? "+" : ""}{p.business.ecartPanierPct}%
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune donnée</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Insights IA" icon={Lightbulb}>
          {p.insights.length > 0 ? (
            <div className="space-y-2">
              {p.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-xs rounded-lg p-2" style={{ backgroundColor: `hsl(${color} / 0.05)`, borderLeft: `3px solid hsl(${color})` }}>
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: `hsl(${color})` }} />
                  <span className="text-foreground/80">{insight}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Pas assez de données pour générer des insights</p>
          )}
        </CollapsibleSection>
      </div>
    </motion.div>
  );
}

export function PersonasTab({ dateRange }: PersonasTabProps) {
  const { personas, isLoading, error, totalCompleted } = usePersonaStats(dateRange);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const selectedPersona = personas.find((p) => p.code === selectedCode);

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

      {/* Summary bar - horizontally scrollable */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex gap-2 min-w-max">
          {personas.map((p) => (
            <PersonaSummaryCard
              key={p.code}
              persona={p}
              isSelected={selectedCode === p.code}
              onClick={() => setSelectedCode(selectedCode === p.code ? null : p.code)}
            />
          ))}
        </div>
      </div>

      {/* Detail */}
      <AnimatePresence mode="wait">
        {selectedPersona && (
          <motion.div
            key={selectedPersona.code}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 border border-border/50 shadow-md">
              <PersonaDetail persona={selectedPersona} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedCode && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Cliquez sur un persona pour voir ses données détaillées
        </p>
      )}
    </div>
  );
}
