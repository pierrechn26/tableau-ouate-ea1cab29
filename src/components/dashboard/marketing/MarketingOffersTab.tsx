import { Gift } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import { LegacyOffers, safeString } from "./legacy/LegacyRecommendations";

interface Props {
  offersData: any;
  isV2: boolean;
}

export function MarketingOffersTab({ offersData, isV2 }: Props) {
  const isV2Mode = isV2 && offersData._v2 && Array.isArray(offersData.items) && offersData.items.length > 0;
  const items: any[] = isV2Mode ? offersData.items : [];

  if (isV2Mode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-foreground" />
          <h3 className="text-xl font-bold text-foreground font-heading">
            Recommandations Offres & Bundles
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
              renderDetail={(offer) => (
                <div className="space-y-4 text-xs">
                  {/* Concept */}
                  {offer.concept && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">Concept</p>
                      <p className="bg-muted/40 rounded-lg p-3 border border-border/50">{safeString(offer.concept)}</p>
                    </section>
                  )}
                  {/* Composition */}
                  {Array.isArray(offer.composition) && offer.composition.length > 0 && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Composition</p>
                      <ul className="space-y-1.5">
                        {offer.composition.map((c: any, i: number) => (
                          <li key={i} className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                            <span className="font-semibold">{safeString(c.produit)}</span>
                            {c.role_dans_bundle && <span className="text-muted-foreground"> — {safeString(c.role_dans_bundle)}</span>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {/* Pricing */}
                  {offer.pricing_strategy && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Stratégie tarifaire</p>
                      <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                        {offer.pricing_strategy.prix_unitaire_total && <p><span className="font-semibold text-muted-foreground">Prix séparé :</span> {safeString(offer.pricing_strategy.prix_unitaire_total)}</p>}
                        {offer.pricing_strategy.prix_bundle && <p><span className="font-semibold text-muted-foreground">Prix bundle :</span> <strong className="text-primary">{safeString(offer.pricing_strategy.prix_bundle)}</strong></p>}
                        {offer.pricing_strategy.economie_affichee && <p><span className="font-semibold text-muted-foreground">Économie :</span> {safeString(offer.pricing_strategy.economie_affichee)}</p>}
                        {offer.pricing_strategy.ancrage_prix && <p><span className="font-semibold text-muted-foreground">Ancrage :</span> {safeString(offer.pricing_strategy.ancrage_prix)}</p>}
                      </div>
                    </section>
                  )}
                  {/* Launch plan */}
                  {offer.plan_de_lancement && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Plan de lancement</p>
                      {["phase_teasing", "phase_lancement", "phase_relance"].map((phase) => {
                        const p = offer.plan_de_lancement[phase];
                        if (!p) return null;
                        const label = phase === "phase_teasing" ? "Teasing" : phase === "phase_lancement" ? "Lancement" : "Relance";
                        return (
                          <div key={phase} className="mb-2">
                            <p className="font-semibold text-muted-foreground text-[11px] mb-1">{label} ({safeString(p.duree)})</p>
                            <ul className="space-y-1 pl-2">
                              {(p.actions || []).map((a: string, i: number) => (
                                <li key={i} className="bg-muted/40 rounded p-2 border border-border/50">{safeString(a)}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </section>
                  )}
                  {/* Messaging */}
                  {offer.messaging_par_canal && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Messaging par canal</p>
                      <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                        {offer.messaging_par_canal.ads && <p><span className="font-semibold text-muted-foreground">Ads :</span> {safeString(offer.messaging_par_canal.ads)}</p>}
                        {offer.messaging_par_canal.email && <p><span className="font-semibold text-muted-foreground">Email :</span> {safeString(offer.messaging_par_canal.email)}</p>}
                        {offer.messaging_par_canal.site && <p><span className="font-semibold text-muted-foreground">Site :</span> {safeString(offer.messaging_par_canal.site)}</p>}
                      </div>
                    </section>
                  )}
                  {/* KPIs */}
                  {offer.metriques_succes && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Métriques de succès</p>
                      <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                        {Array.isArray(offer.metriques_succes.kpis_a_surveiller) && (
                          <p><span className="font-semibold text-muted-foreground">KPIs :</span> {offer.metriques_succes.kpis_a_surveiller.join(" · ")}</p>
                        )}
                        {offer.metriques_succes.seuil_succes && <p><span className="font-semibold text-muted-foreground">Seuil :</span> {safeString(offer.metriques_succes.seuil_succes)}</p>}
                        {offer.metriques_succes.action_si_echec && <p><span className="font-semibold text-muted-foreground">Si échec :</span> {safeString(offer.metriques_succes.action_si_echec)}</p>}
                      </div>
                    </section>
                  )}
                  {/* Misc */}
                  <div className="flex flex-wrap gap-4">
                    {offer.periode_recommandee && <p><span className="font-semibold text-muted-foreground">Période :</span> {safeString(offer.periode_recommandee)}</p>}
                    {offer.urgency_trigger && <p><span className="font-semibold text-muted-foreground">Urgence :</span> {safeString(offer.urgency_trigger)}</p>}
                    {offer.canal_distribution && <p><span className="font-semibold text-muted-foreground">Canal :</span> {safeString(offer.canal_distribution)}</p>}
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
        <Gift className="w-5 h-5 text-foreground" />
        <h3 className="text-xl font-bold text-foreground font-heading">Offres & Bundles</h3>
      </div>
      <LegacyOffers offers={offersData} />
    </div>
  );
}
