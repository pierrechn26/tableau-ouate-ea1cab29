import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Megaphone, Mail, Gift, Calendar, Target } from "lucide-react";
import { PersonaBadge } from "./shared/PersonaBadge";
import { safeString } from "./legacy/LegacyRecommendations";

export function CampaignCard({ campaign }: { campaign: any }) {
  const [open, setOpen] = useState(false);

  const adsCount = campaign.recos_ads_ids?.length ?? 0;
  const offersCount = campaign.recos_offers_ids?.length ?? 0;
  const emailsCount = campaign.recos_emails_ids?.length ?? 0;

  const personas = campaign.persona_principal
    ? (Array.isArray(campaign.persona_principal) ? campaign.persona_principal : [campaign.persona_principal])
    : [];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div
        className="flex items-start gap-3 p-5 cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <h4 className="text-base font-bold text-foreground">{safeString(campaign.nom)}</h4>
            {personas.map((p: string) => <PersonaBadge key={p} code={p} />)}
          </div>

          {campaign.objectif && (
            <p className="text-sm text-muted-foreground mb-3 flex items-start gap-1.5">
              <Target className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              {safeString(campaign.objectif)}
            </p>
          )}

          <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
            {campaign.duree && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {safeString(campaign.duree)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Megaphone className="w-3 h-3 text-primary" />
              {adsCount} ad{adsCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Gift className="w-3 h-3 text-accent" />
              {offersCount} offre{offersCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-secondary" />
              {emailsCount} email{emailsCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0 pt-0.5">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

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
            <div className="px-5 pb-5 border-t border-primary/15 space-y-4">
              {campaign.strategie_resumee && (
                <div className="pt-4">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1.5">Stratégie</p>
                  <p className="text-sm text-foreground leading-relaxed">{safeString(campaign.strategie_resumee)}</p>
                </div>
              )}

              {Array.isArray(campaign.timeline) && campaign.timeline.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Timeline</p>
                  <div className="space-y-1.5">
                    {campaign.timeline.map((t: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <span className="font-bold text-primary w-8 shrink-0">{t.jour}</span>
                        <span className="text-muted-foreground bg-muted/50 rounded px-2 py-1 border border-border/50 flex-1">
                          <span className="font-medium text-foreground">[{t.canal}]</span> {safeString(t.action)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
