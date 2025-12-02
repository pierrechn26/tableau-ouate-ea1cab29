import { useState } from "react";
import { motion } from "framer-motion";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import {
  BarChart3,
  Users,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Download,
  HelpCircle,
  Activity,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { PersonaCard } from "@/components/dashboard/PersonaCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FunnelVisualization } from "@/components/dashboard/FunnelVisualization";
import { MarketingRecommendations } from "@/components/dashboard/MarketingRecommendations";
import { AlertsSection } from "@/components/dashboard/AlertsSection";
import { DiagnosticsAnalytics } from "@/components/dashboard/DiagnosticsAnalytics";
import { BusinessMetrics } from "@/components/dashboard/BusinessMetrics";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import personaEmma from "@/assets/persona-emma.png";
import personaSophie from "@/assets/persona-sophie.png";
import personaLea from "@/assets/persona-lea.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const personas = [
  {
    name: "Emma",
    tagline: "Anxieuse mais proactive",
    image: personaEmma,
    ageRange: "26-32 ans",
    prospectPercentage: 42,
    psychology: "Cherche réassurance, lit beaucoup, craint le 'mal faire', veut se sentir préparée.",
    problems: [
      "Ne sait pas quels soins sont vraiment 'safe grossesse'",
      "Peur des vergetures → cherche prévention",
      "Sensible aux textures (nausées + odeurs)",
      "Redoute les achats inutiles"
    ],
    keyNeeds: [
      "Guide clair par étape (trimester checklist)",
      "Produits certifiés, explications simples",
      "Recommandations personnalisées selon ses symptômes"
    ],
    behaviors: [
      "Consulte beaucoup la FAQ",
      "Compare plusieurs produits",
      "Fait souvent des abandons de panier"
    ],
    topProducts: [
      "Huile anti-vergetures bio",
      "Crème hydratante sans parfum",
      "Guide 1er trimestre"
    ]
  },
  {
    name: "Sophie",
    tagline: "Efficace et pressée",
    image: personaSophie,
    ageRange: "30-38 ans",
    prospectPercentage: 35,
    psychology: "Fatigue + besoin de retrouver confiance + simplicité. Forte charge mentale.",
    problems: [
      "Pas le temps de lire → veut 'direct au but'",
      "Vergétures / cicatrices / relâchement de peau",
      "Manque d'énergie pour comparer les produits"
    ],
    keyNeeds: [
      "Routine minimaliste en 2–3 produits max",
      "Explications rapides ('voici ce qu'il te faut')",
      "Recommandations selon symptômes (sécheresse, cicatrices, jambes lourdes)"
    ],
    behaviors: [
      "Très mobile-first (87% achètent sur smartphone)",
      "Achète souvent via recommandations personnalisées",
      "Convertit 2,4× mieux avec des packs complets"
    ],
    topProducts: [
      "Pack routine postpartum",
      "Sérum réparateur express",
      "Crème raffermissante"
    ]
  },
  {
    name: "Léa",
    tagline: "Nature et exigeante",
    image: personaLea,
    ageRange: "33-40 ans",
    prospectPercentage: 18,
    psychology: "Consommatrice exigeante, très attachée aux valeurs marque. Veut le meilleur mais déteste le bullshit.",
    problems: [
      "Ne croit plus les promesses marketing trop vagues",
      "Besoin d'information scientifique vulgarisée",
      "Sensible au prix → cherche le rapport qualité/prix"
    ],
    keyNeeds: [
      "Fiches produits ultra-transparentes",
      "Comparaison rapide entre gammes",
      "Argumentaire clair sur les résultats"
    ],
    behaviors: [
      "Lit les avis + composition (liste INCI complète)",
      "Convertit mieux sur les bundles",
      "Clique 3× plus sur les diagnostics courts"
    ],
    topProducts: [
      "Gamme bio certifiée",
      "Huile végétale pure",
      "Pack transparence totale"
    ]
  },
];

export default function Dashboard() {
  const [supportOpen, setSupportOpen] = useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [comparisonPeriod, setComparisonPeriod] = useState("previous");

  const handleExport = () => {
    toast({
      title: "Export en cours",
      description: "Votre rapport PDF sera prêt dans quelques instants...",
    });
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message envoyé",
      description: "Notre équipe vous répondra dans les 24h.",
    });
    setSupportOpen(false);
  };

  const handleApplyDates = () => {
    toast({
      title: "Données actualisées",
      description: "Le dashboard a été mis à jour avec la nouvelle période.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Ask-It Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Marque : TALM — Data Premium
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Support
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Contactez le support Ask-It</DialogTitle>
                    <DialogDescription>
                      Notre équipe vous répondra dans les 24h
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nom</Label>
                      <Input id="name" placeholder="Votre nom" required />
                    </div>
                    <div>
                      <Label htmlFor="company">Entreprise</Label>
                      <Input id="company" placeholder="TALM" required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="vous@talm.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Décrivez votre demande..."
                        rows={4}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Envoyer
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button onClick={handleExport} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
          
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            comparisonPeriod={comparisonPeriod}
            onComparisonPeriodChange={setComparisonPeriod}
            onApply={handleApplyDates}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-12">
        {/* Key Metrics */}
        <section id="overview">
          <h2 className="text-3xl font-bold text-foreground mb-6">Vue d'ensemble</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="CA généré via diagnostic"
              value="127 450 €"
              subtitle="Cette période"
              icon={TrendingUp}
              trend={{ value: 23, isPositive: true }}
              comparison={{ value: "103 720 €", period: "vs période précédente" }}
              index={0}
            />
            <MetricCard
              title="Taux de conversion"
              value="4.0%"
              subtitle="Diagnostic → Achat"
              icon={BarChart3}
              trend={{ value: 12, isPositive: true }}
              comparison={{ value: "3.57%", period: "vs période précédente" }}
              index={1}
            />
            <MetricCard
              title="AOV après diagnostic"
              value="71.20 €"
              subtitle="vs 52.30 € sans"
              icon={TrendingUp}
              trend={{ value: 36, isPositive: true }}
              comparison={{ value: "52.35 €", period: "vs période précédente" }}
              index={2}
            />
            <MetricCard
              title="Diagnostics complétés"
              value="6 234"
              subtitle="Ce mois"
              icon={Users}
              trend={{ value: 8, isPositive: true }}
              comparison={{ value: "5 772", period: "vs période précédente" }}
              index={3}
            />
          </div>
        </section>

        {/* Personas Section */}
        <section id="personas">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Personas Intelligents
            </h2>
            <p className="text-muted-foreground">
              Profils détaillés de vos clientes avec insights comportementaux
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {personas.map((persona, index) => (
              <PersonaCard key={persona.name} {...persona} index={index} />
            ))}
          </div>
        </section>

        {/* Analytics Section */}
        <section id="analytics">
          <DiagnosticsAnalytics />
        </section>

        {/* Business Section */}
        <section id="business">
          <BusinessMetrics />
        </section>

        {/* Funnel Section */}
        <section id="funnel">
          <FunnelVisualization />
        </section>

        {/* Marketing Section */}
        <section id="marketing">
          <MarketingRecommendations />
        </section>

        {/* Alerts Section */}
        <section id="alerts">
          <AlertsSection />
        </section>
      </main>
    </div>
  );
}
