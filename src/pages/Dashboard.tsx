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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    age: 29,
    traits: [
      { label: "Besoin de sécurité", value: 90, color: "primary" },
      { label: "Besoin d'éducation", value: 80, color: "accent" },
      { label: "Sensibilité prix", value: 50, color: "muted" },
    ],
    icpScore: 88,
    insights: [
      "78% des Emma abandonnent si la composition n'est pas expliquée clairement.",
      "Les recommandations 'routine 1er trimestre' convertissent +32% sur ce profil.",
      "Préfère les formats éducatifs longs (guides, FAQ détaillées).",
    ],
  },
  {
    name: "Sophie",
    tagline: "Efficace et pressée",
    image: personaSophie,
    age: 33,
    traits: [
      { label: "Besoin de simplicité", value: 95, color: "primary" },
      { label: "Confiance en soi", value: 45, color: "accent" },
      { label: "Sensibilité temps", value: 90, color: "destructive" },
    ],
    icpScore: 92,
    insights: [
      "Ce persona convertit 2,4× mieux avec des packs complets pré-assemblés.",
      "Les contenus 'avant/après' augmentent fortement le taux de conversion.",
      "Mobile-first : 87% des Sophie achètent sur smartphone.",
    ],
  },
  {
    name: "Léa",
    tagline: "Nature et exigeante",
    image: personaLea,
    age: 36,
    traits: [
      { label: "Conscience écologique", value: 95, color: "primary" },
      { label: "Scepticisme marketing", value: 85, color: "accent" },
      { label: "Recherche de preuves", value: 88, color: "muted" },
    ],
    icpScore: 85,
    insights: [
      "Les vidéos explicatives augmentent son intention d'achat de +47%.",
      "Elle clique 3× plus sur les diagnostics courts que sur les longs.",
      "Valorise fortement la transparence : liste INCI complète obligatoire.",
    ],
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
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full max-w-3xl grid-cols-7 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="personas">
              <Users className="w-4 h-4 mr-2" />
              Personas
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <Activity className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="business">
              <DollarSign className="w-4 h-4 mr-2" />
              Business
            </TabsTrigger>
            <TabsTrigger value="funnel">
              <TrendingUp className="w-4 h-4 mr-2" />
              Funnel
            </TabsTrigger>
            <TabsTrigger value="marketing">
              <Sparkles className="w-4 h-4 mr-2" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertCircle className="w-4 h-4 mr-2" />
              Alertes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="CA généré via diagnostic"
                value="127 450 €"
                subtitle="Cette période"
                icon={TrendingUp}
                trend={{ value: 23, isPositive: true }}
                comparison={{ value: "103 720 €", period: "Période précédente" }}
                index={0}
              />
              <MetricCard
                title="Taux de conversion"
                value="4.0%"
                subtitle="Diagnostic → Achat"
                icon={BarChart3}
                trend={{ value: 12, isPositive: true }}
                comparison={{ value: "3.57%", period: "Période précédente" }}
                index={1}
              />
              <MetricCard
                title="AOV après diagnostic"
                value="71.20 €"
                subtitle="vs 52.30 € sans"
                icon={TrendingUp}
                trend={{ value: 36, isPositive: true }}
                comparison={{ value: "52.35 €", period: "Période précédente" }}
                index={2}
              />
              <MetricCard
                title="Diagnostics complétés"
                value="6 234"
                subtitle="Ce mois"
                icon={Users}
                trend={{ value: 8, isPositive: true }}
                comparison={{ value: "5 772", period: "Période précédente" }}
                index={3}
              />
            </div>

            {/* Quick Personas Preview */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Aperçu Personas
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {personas.map((persona, index) => (
                  <PersonaCard key={persona.name} {...persona} index={index} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="personas" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Personas Intelligents
              </h2>
              <p className="text-muted-foreground mb-6">
                Profils détaillés de vos clientes avec insights comportementaux
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {personas.map((persona, index) => (
                  <PersonaCard key={persona.name} {...persona} index={index} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <DiagnosticsAnalytics />
          </TabsContent>

          <TabsContent value="business">
            <BusinessMetrics />
          </TabsContent>

          <TabsContent value="funnel">
            <FunnelVisualization />
          </TabsContent>

          <TabsContent value="marketing">
            <MarketingRecommendations />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
