/**
 * Generic V2 recommendation card — used by Ads, Offers, and Emails tabs.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PersonaBadge } from "./shared/PersonaBadge";
import { FormatBadge } from "./shared/FormatBadge";
import { PriorityIndicator } from "./shared/PriorityIndicator";
import { safeString } from "./legacy/LegacyRecommendations";

interface RecommendationCardProps {
  item: any;
  /** Which sub-fields to show as badges next to the title */
  badgeFields?: Array<{ key: string; label?: string }>;
  /** Render the expanded detail content */
  renderDetail?: (item: any) => React.ReactNode;
  /** Fields to show in the collapsed summary */
  summaryField?: string;
}

function DefaultDetail({ item }: { item: any }) {
  const skip = new Set(["id", "title", "persona_cible", "format", "type_email", "type_offre", "funnel_stage", "priorite", "campaign_id", "sources_utilisees"]);
  return (
    <div className="space-y-3 text-xs text-foreground">
      {Object.entries(item)
        .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== "")
        .map(([k, v]) => (
          <div key={k}>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">{k.replace(/_/g, " ")}</p>
            {Array.isArray(v) ? (
              <ul className="space-y-1 pl-2">
                {(v as any[]).map((vi, i) => (
                  <li key={i} className="bg-muted/50 rounded p-2 border border-border/50">
                    {typeof vi === "object" ? safeString(vi) : safeString(vi)}
                  </li>
                ))}
              </ul>
            ) : typeof v === "object" ? (
              <div className="bg-muted/50 rounded p-2 border border-border/50 space-y-1">
                {Object.entries(v as Record<string, any>).map(([sk, sv]) => (
                  <p key={sk}><span className="font-semibold text-muted-foreground">{sk.replace(/_/g, " ")} :</span> {safeString(sv)}</p>
                ))}
              </div>
            ) : (
              <p className="bg-muted/50 rounded p-2 border border-border/50">{safeString(v)}</p>
            )}
          </div>
        ))}
    </div>
  );
}

export function RecommendationCard({ item, renderDetail, summaryField }: RecommendationCardProps) {
  const [open, setOpen] = useState(false);

  // Detect persona — single code or array
  const personaRaw = item.persona_cible;
  const personas: string[] = personaRaw
    ? (Array.isArray(personaRaw) ? personaRaw : [personaRaw])
    : [];

  const format = item.format || item.type_email || item.type_offre;
  const funnelStage = item.funnel_stage;

  const summary = summaryField ? safeString(item[summaryField]) : null;

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <h4 className="text-sm font-semibold text-foreground leading-snug">{safeString(item.title)}</h4>
          </div>
          <div className="flex items-center flex-wrap gap-1.5">
            {personas.map((p) => <PersonaBadge key={p} code={p} />)}
            {format && <FormatBadge value={format} />}
            {funnelStage && <FormatBadge value={funnelStage} />}
            <PriorityIndicator priority={item.priorite} />
          </div>
          {summary && !open && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 pt-0.5">
          <span className="text-xs">Voir le détail</span>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-0 border-t border-border/50">
              <div className="pt-4">
                {renderDetail ? renderDetail(item) : <DefaultDetail item={item} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
