/**
 * MarketingOverviewTab — Placeholder for step 3 refonte.
 * Currently shows basic stats from V3 recommendations.
 */
import { Card } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

interface Props {
  [key: string]: any;
}

export function MarketingOverviewTab(_props: Props) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <LayoutGrid className="w-8 h-8 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Vue d'ensemble — Refonte en cours (étape 3)</p>
    </div>
  );
}
