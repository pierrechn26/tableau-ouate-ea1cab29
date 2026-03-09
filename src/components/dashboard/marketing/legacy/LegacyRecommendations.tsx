/**
 * LegacyRecommendations — renders V1 data exactly as it appeared before the refactor.
 * Used as fallback in Ads / Email / Offers tabs when recommendation_version < 2.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Video,
  Target,
  Users,
  TrendingUp,
  Mail,
  Tag,
  Gift,
  ShoppingCart,
  Zap,
  Newspaper,
  BookOpen,
  Palette,
  MessageSquareHeart,
  Calendar,
  Heart,
} from "lucide-react";
import { PersonaBadges } from "../shared/PersonaBadge";

// ── helpers ──────────────────────────────────────────────────────────

function stripPersonaCodes(text: string): string {
  return text
    .replace(/\s*\(P\d+\)/gi, "")
    .replace(/\s*\[P\d+\]/gi, "")
    .replace(/\bP\d+\s*[-–—:]\s*/gi, "")
    .replace(/,?\s*P\d+(?=\s|,|$)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function safeString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return stripPersonaCodes(val);
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(safeString).join(", ");
  if (typeof val === "object") {
    return Object.entries(val).map(([k, v]) => `${k}: ${safeString(v)}`).join(" — ");
  }
  return stripPersonaCodes(String(val));
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

const NEWSLETTER_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  educatif: { label: "Éducatif", color: "bg-blue-500/15 text-blue-700 border-blue-500/30", icon: BookOpen },
  storytelling: { label: "Storytelling", color: "bg-violet-500/15 text-violet-700 border-violet-500/30", icon: Palette },
  communautaire: { label: "Communautaire", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: MessageSquareHeart },
  promotionnel: { label: "Promotionnel", color: "bg-orange-500/15 text-orange-700 border-orange-500/30", icon: Tag },
  saisonnier: { label: "Saisonnier", color: "bg-pink-500/15 text-pink-700 border-pink-500/30", icon: Calendar },
  curation: { label: "Curation", color: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30", icon: Heart },
};

function NewsletterSection({ newsletters }: { newsletters: any[] }) {
  if (!newsletters || newsletters.length === 0) return null;
  return (
    <div className="p-4 rounded-xl border-2 bg-secondary/10 border-secondary/30 transition-all duration-200 hover:shadow-md">
      <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-secondary" />
        Newsletters recommandées
      </h4>
      <ul className="space-y-3">
        {newsletters.map((nl: any, idx: number) => {
          const typeConfig = NEWSLETTER_TYPE_CONFIG[nl.type] || NEWSLETTER_TYPE_CONFIG.educatif;
          const TypeIcon = typeConfig.icon;
          return (
            <li
              key={idx}
              className="text-xs text-foreground bg-background/80 rounded-lg p-4 border border-border/50 leading-relaxed shadow-sm space-y-2"
            >
              <div className="flex items-start gap-2">
                <span className="flex-1 font-semibold text-sm">{safeString(nl.title)}</span>
                <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-bold ${typeConfig.color} flex items-center gap-1`}>
                  <TypeIcon className="w-3 h-3" />
                  {typeConfig.label}
                </Badge>
                <PersonaBadges personas={nl.personas} />
              </div>
              {nl.sujet && (
                <p className="text-xs text-primary font-medium italic">« {safeString(nl.sujet)} »</p>
              )}
              {nl.contenu_cle && (
                <p className="text-[11px] text-muted-foreground">{safeString(nl.contenu_cle)}</p>
              )}
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {nl.cta && <span>🎯 CTA : <strong className="text-foreground">{safeString(nl.cta)}</strong></span>}
                {nl.frequence && <span>📅 {safeString(nl.frequence)}</span>}
                {nl.segment && <span>👥 {safeString(nl.segment)}</span>}
              </div>
              {nl.justification && (
                <p className="text-[11px] text-muted-foreground mt-1 italic border-t border-border/30 pt-2">{safeString(nl.justification)}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Legacy Ads ───────────────────────────────────────────────────────

export function LegacyAds({ ads }: { ads: any }) {
  const data = ads || {};
  return (
    <div className="space-y-4">
      <RecoSection
        title="Hooks créatifs" icon={Lightbulb} color="bg-primary/10 border-primary/30"
        items={(data.hooks_creatifs || []).map((h: any) => ({ text: `"${h.text}"`, personas: h.personas, sub: h.rationale }))}
      />
      <RecoSection
        title="Concepts vidéo" icon={Video} color="bg-accent/10 border-accent/30"
        items={(data.concepts_video || []).map((c: any) => ({ text: c.title, personas: c.personas, sub: c.description }))}
      />
      <RecoSection
        title="Angles psychologiques" icon={Target} color="bg-secondary/10 border-secondary/30"
        items={(data.angles_psychologiques || []).map((a: any) => ({ text: a.angle, personas: a.personas, sub: a.source }))}
      />
      <RecoSection
        title="Ciblage" icon={Users} color="bg-primary/10 border-primary/30"
        items={(data.ciblage || []).map((c: any) => ({ text: c.audience, personas: c.personas }))}
      />
    </div>
  );
}

// ── Legacy Email ─────────────────────────────────────────────────────

export function LegacyEmail({ email }: { email: any }) {
  const data = email || {};
  return (
    <div className="space-y-4">
      {(data.newsletters || []).length > 0 && (
        <NewsletterSection newsletters={data.newsletters} />
      )}
      <RecoSection
        title="Flows automatisés" icon={TrendingUp} color="bg-secondary/10 border-secondary/30"
        items={(data.flows_automatises || []).map((f: any) => ({ text: f.title, personas: f.personas, sub: f.trigger ? `Trigger : ${f.trigger} — ${f.sequence}` : f.sequence }))}
      />
      <RecoSection
        title="Lignes d'objet" icon={Mail} color="bg-primary/10 border-primary/30"
        items={(data.lignes_objet || []).map((l: any) => ({ text: `"${l.text}"`, personas: l.personas, sub: l.context }))}
      />
      <RecoSection
        title="Segmentation optimisée" icon={Users} color="bg-accent/10 border-accent/30"
        items={(data.segmentation || []).map((s: any) => ({ text: s.segment, personas: s.personas, sub: s.action }))}
      />
    </div>
  );
}

// ── Legacy Offers ────────────────────────────────────────────────────

export function LegacyOffers({ offers }: { offers: any }) {
  const data = offers || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <RecoSection
        title="Bundles personnalisés" icon={Gift} color="bg-accent/10 border-accent/30"
        items={(data.bundles || []).map((b: any) => ({ text: b.name, personas: b.personas, sub: `${b.produits} — ${b.prix}` }))}
      />
      <RecoSection
        title="Prix psychologiques" icon={Tag} color="bg-secondary/10 border-secondary/30"
        items={(data.prix_psychologiques || []).map((p: any) => ({ text: p.strategie, sub: p.rationale }))}
      />
      <RecoSection
        title="Upsells intelligents" icon={ShoppingCart} color="bg-primary/10 border-primary/30"
        items={(data.upsells || []).map((u: any) => ({ text: u.trigger, sub: u.action }))}
      />
    </div>
  );
}

// ── Checklist detail renderer (shared) ──────────────────────────────

export function renderChecklistDetail(detail: any, _category: string) {
  if (!detail) return null;

  const sections: { label: string; items: string[] }[] = [];

  if (detail.hooks_creatifs?.length) sections.push({ label: "Hooks créatifs", items: detail.hooks_creatifs });
  if (detail.concepts_video?.length) sections.push({ label: "Concepts vidéo", items: detail.concepts_video });
  if (detail.ciblage?.length) sections.push({ label: "Ciblage", items: detail.ciblage });
  if (detail.justification) sections.push({ label: "Justification", items: [detail.justification] });
  if (detail.flow) sections.push({ label: "Flow", items: [detail.flow] });
  if (detail.sequence) sections.push({ label: "Séquence", items: [detail.sequence] });
  if (detail.segments) sections.push({ label: "Segments", items: [detail.segments] });
  if (detail.lignes_objet?.length) sections.push({ label: "Lignes d'objet", items: detail.lignes_objet });
  if (detail.bundle) sections.push({ label: "Bundle", items: [detail.bundle] });
  if (detail.produits) sections.push({ label: "Produits", items: [detail.produits] });
  if (detail.prix) sections.push({ label: "Prix", items: [detail.prix] });
  if (detail.action) sections.push({ label: "Action", items: [detail.action] });
  if (detail.segment) sections.push({ label: "Segment", items: [detail.segment] });
  if (detail.expected_impact) sections.push({ label: "Impact attendu", items: [detail.expected_impact] });

  if (sections.length === 0) {
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
