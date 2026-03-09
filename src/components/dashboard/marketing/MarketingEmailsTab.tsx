import { Mail } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import { LegacyEmail, safeString } from "./legacy/LegacyRecommendations";

interface Props {
  emailsData: any;
  isV2: boolean;
}

export function MarketingEmailsTab({ emailsData, isV2 }: Props) {
  const isV2Mode = isV2 && emailsData._v2 && Array.isArray(emailsData.items) && emailsData.items.length > 0;
  const items: any[] = isV2Mode ? emailsData.items : [];

  if (isV2Mode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-secondary" />
          <h3 className="text-xl font-bold text-foreground font-heading">
            Recommandations Emailing
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
              summaryField="messaging_principal"
              renderDetail={(email) => (
                <div className="space-y-4 text-xs">
                  {/* Subject lines */}
                  <section>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Lignes d'objet</p>
                    <div className="space-y-1.5 bg-muted/40 rounded-lg p-3 border border-border/50">
                      {email.objet && <p className="font-medium">🅰 {safeString(email.objet)}</p>}
                      {email.objet_variante && <p className="text-muted-foreground">🅱 {safeString(email.objet_variante)}</p>}
                      {email.preview_text && <p className="text-muted-foreground italic">Preview : {safeString(email.preview_text)}</p>}
                    </div>
                  </section>
                  {/* Structure */}
                  {Array.isArray(email.structure_sections) && email.structure_sections.length > 0 && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Structure des sections</p>
                      <ul className="space-y-2">
                        {email.structure_sections.map((s: any, i: number) => (
                          <li key={i} className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                            <p className="font-semibold text-primary text-[11px] uppercase">{safeString(s.section)}</p>
                            <p>{safeString(s.contenu)}</p>
                            {s.conseil_design && <p className="text-muted-foreground italic mt-0.5">Design : {safeString(s.conseil_design)}</p>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {/* CTA */}
                  {email.cta_principal && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">CTA principal</p>
                      <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
                        <p><span className="font-semibold text-muted-foreground">Texte :</span> <strong>{safeString(email.cta_principal.texte)}</strong></p>
                        {email.cta_principal.url_destination && <p><span className="font-semibold text-muted-foreground">Destination :</span> {safeString(email.cta_principal.url_destination)}</p>}
                      </div>
                    </section>
                  )}
                  {/* Segment & timing */}
                  <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                    {email.segment_klaviyo && <p><span className="font-semibold text-muted-foreground">Segment Klaviyo :</span> {safeString(email.segment_klaviyo)}</p>}
                    {email.trigger && <p><span className="font-semibold text-muted-foreground">Trigger :</span> {safeString(email.trigger)}</p>}
                    {email.timing && <p><span className="font-semibold text-muted-foreground">Timing :</span> {safeString(email.timing)}</p>}
                    {email.tone_of_voice && <p><span className="font-semibold text-muted-foreground">Ton :</span> {safeString(email.tone_of_voice)}</p>}
                  </div>
                  {/* Flow position */}
                  {email.position_dans_flow?.flow_name && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Position dans le flow</p>
                      <div className="space-y-1 bg-muted/40 rounded-lg p-3 border border-border/50">
                        <p><span className="font-semibold text-muted-foreground">Flow :</span> {safeString(email.position_dans_flow.flow_name)}</p>
                        {email.position_dans_flow.position && <p><span className="font-semibold text-muted-foreground">Position :</span> {safeString(email.position_dans_flow.position)}</p>}
                        {email.position_dans_flow.logique_branchement && <p><span className="font-semibold text-muted-foreground">Condition :</span> {safeString(email.position_dans_flow.logique_branchement)}</p>}
                      </div>
                    </section>
                  )}
                  {/* Metrics */}
                  {email.metriques_cibles && (
                    <section>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">Métriques cibles</p>
                      <div className="flex flex-wrap gap-4 bg-muted/40 rounded-lg p-3 border border-border/50">
                        {email.metriques_cibles.taux_ouverture_vise && <p><span className="font-semibold text-muted-foreground">Ouverture :</span> {safeString(email.metriques_cibles.taux_ouverture_vise)}</p>}
                        {email.metriques_cibles.taux_clic_vise && <p><span className="font-semibold text-muted-foreground">Clic :</span> {safeString(email.metriques_cibles.taux_clic_vise)}</p>}
                        {email.metriques_cibles.benchmark_industrie && <p className="text-muted-foreground">{safeString(email.metriques_cibles.benchmark_industrie)}</p>}
                      </div>
                    </section>
                  )}
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
        <Mail className="w-5 h-5 text-secondary" />
        <h3 className="text-xl font-bold text-foreground font-heading">Email Marketing</h3>
      </div>
      <LegacyEmail email={emailsData} />
    </div>
  );
}
