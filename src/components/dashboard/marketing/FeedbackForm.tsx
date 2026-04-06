import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { type Recommendation } from "@/hooks/useMarketingRecommendations";

// ── Score calculation (mirrors backend) ──────────────────────────────

function parseRange(val: string): { low: number; high: number } | null {
  if (!val) return null;
  const cleaned = String(val).replace(/[%x€]/g, "").trim();
  const rangeMatch = cleaned.match(/([\d.,]+)\s*[-–]\s*([\d.,]+)/);
  if (rangeMatch) {
    return { low: parseFloat(rangeMatch[1].replace(",", ".")), high: parseFloat(rangeMatch[2].replace(",", ".")) };
  }
  const single = parseFloat(cleaned.replace(",", "."));
  if (!isNaN(single)) return { low: single * 0.9, high: single };
  return null;
}

interface MetricComparison {
  label: string;
  actual: number;
  range: { low: number; high: number };
  score: "good" | "average" | "poor";
}

function computeComparisons(results: Record<string, any>, kpi: Record<string, any>, category: string): MetricComparison[] {
  const comparisons: MetricComparison[] = [];
  const mappings: Record<string, { kpiKeys: string[]; label: string }[]> = {
    ads: [
      { kpiKeys: ["CTR", "ctr"], label: "CTR" },
      { kpiKeys: ["ROAS", "roas"], label: "ROAS" },
    ],
    emails: [
      { kpiKeys: ["taux_ouverture_vise", "Ouverture", "ouverture"], label: "Taux d'ouverture" },
      { kpiKeys: ["taux_clic_vise", "Clic", "clic"], label: "Taux de clic" },
    ],
    offers: [
      { kpiKeys: ["Taux de conversion", "taux_conversion", "conversion"], label: "Taux de conversion" },
      { kpiKeys: ["AOV impact", "panier_moyen", "aov"], label: "Panier moyen" },
    ],
  };

  const maps = mappings[category] || [];
  for (const m of maps) {
    const actual = parseFloat(String(results[m.label === "CTR" ? "ctr" : m.label === "ROAS" ? "roas" : m.label === "Taux d'ouverture" ? "taux_ouverture" : m.label === "Taux de clic" ? "taux_clic" : m.label === "Taux de conversion" ? "taux_conversion" : "panier_moyen"] || ""));
    if (isNaN(actual)) continue;

    let range: { low: number; high: number } | null = null;
    for (const k of m.kpiKeys) {
      if (kpi[k]) { range = parseRange(kpi[k]); break; }
    }
    if (!range) continue;

    let score: "good" | "average" | "poor";
    if (actual >= range.high) score = "good";
    else if (actual >= range.low * 0.8) score = "average";
    else score = "poor";

    comparisons.push({ label: m.label, actual, range, score });
  }
  return comparisons;
}

function computeOverallScore(comparisons: MetricComparison[]): "good" | "average" | "poor" | null {
  if (comparisons.length === 0) return null;
  if (comparisons.length === 1) return comparisons[0].score;
  const counts = { good: 0, average: 0, poor: 0 };
  comparisons.forEach((c) => counts[c.score]++);
  if (counts.good >= counts.average && counts.good >= counts.poor) return "good";
  if (counts.poor >= counts.good && counts.poor >= counts.average) return "poor";
  return "average";
}

const SCORE_DISPLAY: Record<string, { label: string; color: string }> = {
  good: { label: "🟢 Bon", color: "text-emerald-700" },
  average: { label: "🟡 Moyen", color: "text-amber-700" },
  poor: { label: "🔴 Mauvais", color: "text-destructive" },
};

// ── Field definitions ────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  decimal?: boolean;
}

const ADS_FIELDS: FieldDef[] = [
  { key: "impressions", label: "Impressions", placeholder: "ex: 15000" },
  { key: "clics", label: "Clics", placeholder: "ex: 350" },
  { key: "ctr", label: "CTR (%)", placeholder: "ex: 2.3", decimal: true },
  { key: "cpc", label: "CPC (€)", placeholder: "ex: 0.45", decimal: true },
  { key: "cpa", label: "CPA (€)", placeholder: "ex: 12.50", decimal: true },
  { key: "conversions", label: "Conversions", placeholder: "ex: 12" },
  { key: "roas", label: "ROAS", placeholder: "ex: 3.2", decimal: true },
  { key: "cout_total", label: "Coût total (€)", placeholder: "ex: 157.50", decimal: true },
];

const EMAILS_FIELDS: FieldDef[] = [
  { key: "envoyes", label: "Emails envoyés", placeholder: "ex: 2500" },
  { key: "ouverts", label: "Ouvertures", placeholder: "ex: 1100" },
  { key: "taux_ouverture", label: "Taux d'ouverture (%)", placeholder: "ex: 44", decimal: true },
  { key: "clics", label: "Clics", placeholder: "ex: 175" },
  { key: "taux_clic", label: "Taux de clic (%)", placeholder: "ex: 7", decimal: true },
  { key: "conversions", label: "Conversions", placeholder: "ex: 8" },
  { key: "revenus", label: "CA généré (€)", placeholder: "ex: 320", decimal: true },
];

const OFFERS_FIELDS: FieldDef[] = [
  { key: "ventes", label: "Nombre de ventes", placeholder: "ex: 25" },
  { key: "ca_genere", label: "CA généré (€)", placeholder: "ex: 875", decimal: true },
  { key: "panier_moyen", label: "Panier moyen (€)", placeholder: "ex: 35", decimal: true },
  { key: "taux_conversion", label: "Taux de conversion (%)", placeholder: "ex: 4.2", decimal: true },
];

const CATEGORY_TITLES: Record<string, string> = {
  ads: "Résultats de votre campagne Ads",
  emails: "Résultats de votre email",
  offers: "Résultats de votre offre",
};

// ── Component ────────────────────────────────────────────────────────

interface FeedbackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: Recommendation;
  onSubmit: (recommendationId: string, results: any, notes: string) => Promise<void>;
}

export function FeedbackForm({ open, onOpenChange, recommendation: rec, onSubmit }: FeedbackFormProps) {
  const category = rec.category || "ads";
  const fields = category === "emails" ? EMAILS_FIELDS : category === "offers" ? OFFERS_FIELDS : ADS_FIELDS;
  const kpi = rec.targeting?.kpi_attendu || {};

  // Existing feedback for edit mode
  const existing = rec.feedback_results || {};
  const isEditMode = !!rec.feedback_entered_at;

  // Period state
  const [periodeType, setPeriodeType] = useState<string>(existing?.periode?.duree_jours === 7 ? "7" : existing?.periode?.duree_jours === 14 ? "14" : existing?.periode?.duree_jours === 30 ? "30" : existing?.periode ? "custom" : "14");
  const baseDate = rec.completed_at ? new Date(rec.completed_at) : new Date();
  const [dateDebut, setDateDebut] = useState<Date>(existing?.periode?.debut ? new Date(existing.periode.debut) : baseDate);
  const [dateFin, setDateFin] = useState<Date>(existing?.periode?.fin ? new Date(existing.periode.fin) : addDays(baseDate, 14));

  // Metrics state
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => {
      const v = existing[f.key];
      init[f.key] = v !== undefined && v !== null ? String(v) : "";
    });
    return init;
  });
  const [notes, setNotes] = useState(rec.feedback_notes || "");
  const [submitting, setSubmitting] = useState(false);

  // Auto-update period dates when type changes
  useEffect(() => {
    if (periodeType !== "custom") {
      const days = parseInt(periodeType);
      setDateDebut(baseDate);
      setDateFin(addDays(baseDate, days));
    }
  }, [periodeType]);

  // Auto-calculations
  useEffect(() => {
    const v = { ...values };
    let changed = false;

    if (category === "ads") {
      const impressions = parseFloat(v.impressions);
      const clics = parseFloat(v.clics);
      const coutTotal = parseFloat(v.cout_total);
      const conversions = parseFloat(v.conversions);

      if (!isNaN(impressions) && !isNaN(clics) && impressions > 0 && !v.ctr) {
        v.ctr = ((clics / impressions) * 100).toFixed(2);
        changed = true;
      }
      if (!isNaN(coutTotal) && !isNaN(clics) && clics > 0 && !v.cpc) {
        v.cpc = (coutTotal / clics).toFixed(2);
        changed = true;
      }
      if (!isNaN(coutTotal) && !isNaN(conversions) && conversions > 0 && !v.cpa) {
        v.cpa = (coutTotal / conversions).toFixed(2);
        changed = true;
      }
    }

    if (category === "emails") {
      const envoyes = parseFloat(v.envoyes);
      const ouverts = parseFloat(v.ouverts);
      const clics = parseFloat(v.clics);

      if (!isNaN(envoyes) && !isNaN(ouverts) && envoyes > 0 && !v.taux_ouverture) {
        v.taux_ouverture = ((ouverts / envoyes) * 100).toFixed(1);
        changed = true;
      }
      if (!isNaN(envoyes) && !isNaN(clics) && envoyes > 0 && !v.taux_clic) {
        v.taux_clic = ((clics / envoyes) * 100).toFixed(1);
        changed = true;
      }
    }

    if (changed) setValues(v);
  }, [values.impressions, values.clics, values.cout_total, values.conversions, values.envoyes, values.ouverts]);

  // Check validity
  const hasAtLeastOneMetric = fields.some((f) => values[f.key] && values[f.key].trim() !== "");
  const hasPeriod = periodeType !== "";
  const canSubmit = hasAtLeastOneMetric && hasPeriod && !submitting;

  // Score preview
  const numericValues = useMemo(() => {
    const result: Record<string, number> = {};
    for (const f of fields) {
      const n = parseFloat(values[f.key]);
      if (!isNaN(n)) result[f.key] = n;
    }
    return result;
  }, [values, fields]);

  const comparisons = useMemo(() => computeComparisons(numericValues, kpi, category), [numericValues, kpi, category]);
  const overallScore = useMemo(() => computeOverallScore(comparisons), [comparisons]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const results: Record<string, any> = {
        periode: {
          debut: format(dateDebut, "yyyy-MM-dd"),
          fin: format(dateFin, "yyyy-MM-dd"),
          duree_jours: differenceInDays(dateFin, dateDebut),
        },
      };
      for (const f of fields) {
        const n = parseFloat(values[f.key]);
        if (!isNaN(n)) results[f.key] = n;
      }
      await onSubmit(rec.id, results, notes);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const updateValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{CATEGORY_TITLES[category]}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            {rec.title || "Recommandation"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* ── Période ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Période de test</p>
            <Select value={periodeType} onValueChange={setPeriodeType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Durée du test" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="14">14 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>

            {periodeType === "custom" ? (
              <div className="flex gap-2">
                <DateField label="Début" date={dateDebut} onChange={setDateDebut} />
                <DateField label="Fin" date={dateFin} onChange={setDateFin} />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {format(dateDebut, "d MMM yyyy", { locale: fr })} → {format(dateFin, "d MMM yyyy", { locale: fr })}
              </p>
            )}
          </div>

          {/* ── Metrics ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Métriques</p>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-[11px] text-muted-foreground mb-1 block">{f.label}</label>
                  <input
                    type="number"
                    step={f.decimal ? "0.01" : "1"}
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(e) => updateValue(f.key, e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Score preview ── */}
          {comparisons.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Évaluation prévisionnelle</p>
              {comparisons.map((c) => {
                const d = SCORE_DISPLAY[c.score];
                return (
                  <div key={c.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {c.label} : <span className="text-foreground font-medium">{c.actual}{c.label.includes("ROAS") ? "x" : "%"}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold", d.color)}>{d.label}</Badge>
                      <span className="text-muted-foreground/60 text-[10px]">(obj: {c.range.low}-{c.range.high}{c.label.includes("ROAS") ? "x" : "%"})</span>
                    </span>
                  </div>
                );
              })}
              {overallScore && (
                <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Score global estimé</span>
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 font-bold", SCORE_DISPLAY[overallScore].color)}>
                    {SCORE_DISPLAY[overallScore].label}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Notes libres</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Commentaires, observations, ce qui a bien ou mal fonctionné..."
              className="w-full px-2.5 py-2 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
              {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isEditMode ? "Modifier les résultats" : "Enregistrer les résultats"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Date picker helper ───────────────────────────────────────────────

function DateField({ label, date, onChange }: { label: string; date: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex-1">
      <label className="text-[10px] text-muted-foreground mb-1 block">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 font-normal">
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {format(date, "d MMM yyyy", { locale: fr })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onChange(d)}
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
