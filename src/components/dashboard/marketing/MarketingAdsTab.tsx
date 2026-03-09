import { Megaphone } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import { LegacyAds, safeString } from "./legacy/LegacyRecommendations";

interface Props {
  adsData: any;
  isV2: boolean;
}

export function MarketingAdsTab({ adsData, isV2 }: Props) {
  const isV2Mode = isV2 && adsData._v2 && Array.isArray(adsData.items) && adsData.items.length > 0;
  const items: any[] = isV2Mode ? adsData.items : [];

  if (isV2Mode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold text-foreground font-heading">
            Recommandations Ads
            <span className="text-sm font-normal text-muted-foreground ml-2">
              · {items.length} recommandation{items.length !== 1 ? "s" : ""}
            </span>
          </h3>
        </div>
        <div className="space-y-3">
          {items.map((item: any, idx: number) => (
            <RecommendationCard
              key={item.id ?? idx}
              item={item}
              summaryField="concept"
              renderDetail={(ad) => (
                <div className="space-y-4 text-xs">
                  {/* Creative content */}
                  {ad.contenu_creatif && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Contenu créatif</p>
                      <div className="space-y-2 bg-muted/40 rounded-lg p-3 border border-border/50">
                        {ad.contenu_creatif.hook_text && (
                          <p><span className="font-semibold text-muted-foreground">Hook :</span> {safeString(ad.contenu_creatif.hook_text)}</p>
                        )}
                        {ad.contenu_creatif.script_complet && (
                          <p><span className="font-semibold text-muted-foreground">Script :</span> {safeString(ad.contenu_creatif.script_complet)}</p>
                        )}
                        {ad.contenu_creatif.descriptif_visuel && (
                          <p><span className="font-semibold text-muted-foreground">Visuel :</span> {safeString(ad.contenu_creatif.descriptif_visuel)}</p>
                        )}
                        {ad.contenu_creatif.direction_artistique && (
                          <p><span className="font-semibold text-muted-foreground">Direction artistique :</span> {safeString(ad.contenu_creatif.direction_artistique)}</p>
                        )}
                        {Array.isArray(ad.contenu_creatif.slides) && ad.contenu_creatif.slides.length > 0 && (
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1">Slides :</p>
                            <ul className="space-y-1 pl-2">
                              {ad.contenu_creatif.slides.map((s: any, i: number) => (
                                <li key={i} className="bg-background/80 rounded p-2 border border-border/50">
                                  <span className="font-bold text-primary">#{s.numero}</span> {safeString(s.texte_slide)} — {safeString(s.visuel)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                  {/* Ad copy */}
                  {ad.ad_copy && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Ad Copy</p>
                      <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                        {ad.ad_copy.primary_text && <p><span className="font-semibold text-muted-foreground">Primary text :</span> {safeString(ad.ad_copy.primary_text)}</p>}
                        {ad.ad_copy.headline && <p><span className="font-semibold text-muted-foreground">Headline :</span> {safeString(ad.ad_copy.headline)}</p>}
                        {ad.ad_copy.description && <p><span className="font-semibold text-muted-foreground">Description :</span> {safeString(ad.ad_copy.description)}</p>}
                        {ad.cta && <p><span className="font-semibold text-muted-foreground">CTA :</span> <strong>{safeString(ad.cta)}</strong></p>}
                      </div>
                    </section>
                  )}
                  {/* Targeting */}
                  {ad.ciblage_detaille && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Ciblage</p>
                      <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                        {Array.isArray(ad.ciblage_detaille.audiences_suggested) && ad.ciblage_detaille.audiences_suggested.length > 0 && (
                          <p><span className="font-semibold text-muted-foreground">Audiences :</span> {ad.ciblage_detaille.audiences_suggested.join(" · ")}</p>
                        )}
                        {Array.isArray(ad.ciblage_detaille.exclusions) && ad.ciblage_detaille.exclusions.length > 0 && (
                          <p><span className="font-semibold text-muted-foreground">Exclusions :</span> {ad.ciblage_detaille.exclusions.join(" · ")}</p>
                        )}
                        {ad.ciblage_detaille.custom_audience_source && (
                          <p><span className="font-semibold text-muted-foreground">Source custom :</span> {safeString(ad.ciblage_detaille.custom_audience_source)}</p>
                        )}
                      </div>
                    </section>
                  )}
                  {/* A/B test */}
                  {ad.ab_test_suggestion && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">A/B Test suggéré</p>
                      <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                        <p><span className="font-semibold text-muted-foreground">Tester :</span> {safeString(ad.ab_test_suggestion.element_a_tester)}</p>
                        <p><span className="font-semibold text-muted-foreground">Variante A :</span> {safeString(ad.ab_test_suggestion.variante_a)}</p>
                        <p><span className="font-semibold text-muted-foreground">Variante B :</span> {safeString(ad.ab_test_suggestion.variante_b)}</p>
                        <p><span className="font-semibold text-muted-foreground">Durée :</span> {safeString(ad.ab_test_suggestion.duree_test_recommandee)}</p>
                      </div>
                    </section>
                  )}
                  {/* IA prompt */}
                  {ad.prompt_ia_generation && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Prompt IA Génération</p>
                      <pre className="bg-muted/40 rounded-lg p-3 border border-border/50 whitespace-pre-wrap text-[11px] text-muted-foreground font-mono">
                        {safeString(ad.prompt_ia_generation)}
                      </pre>
                    </section>
                  )}
                  {/* Budget & KPI */}
                  <div className="flex flex-wrap gap-4">
                    {ad.budget_suggere && <p><span className="font-semibold text-muted-foreground">Budget :</span> {safeString(ad.budget_suggere)}</p>}
                    {ad.placement && <p><span className="font-semibold text-muted-foreground">Placement :</span> {safeString(ad.placement)}</p>}
                    {ad.plateforme && <p><span className="font-semibold text-muted-foreground">Plateforme :</span> {safeString(ad.plateforme)}</p>}
                    {ad.kpi_attendu && <p><span className="font-semibold text-muted-foreground">KPI :</span> {safeString(ad.kpi_attendu)}</p>}
                  </div>
                </div>
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // V1 fallback
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground font-heading">Ads (Meta / TikTok)</h3>
      </div>
      <LegacyAds ads={adsData} />
    </div>
  );
}
