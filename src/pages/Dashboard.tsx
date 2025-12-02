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
    ageRange: "26-32 ans",
    situation: "Enceinte 1er trimestre",
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
    ],
    aiInsights: [
      "78% des Emmas abandonnent si la composition n'est pas expliquée clairement",
      "Les recommandations \"routine 1er trimestre\" convertissent +32% sur ce profil",
      "Ce persona convertit 2,4x mieux lorsque la routine est présentée sous forme de pack complet",
    ]
  },
  {
    name: "Sophie",
    tagline: "Efficace et pressée",
    image: personaSophie,
    ageRange: "30-38 ans",
    situation: "Jeune maman postpartum",
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
    ],
    aiInsights: [
      "Les contenus \"avant/après\" augmentent fortement le taux de conversion sur ce profil",
      "Elle clique 3x plus sur les diagnostics courts que sur les longs",
      "Les offres \"routine post-partum\" génèrent +47% de CA sur ce segment",
    ]
  },
  {
    name: "Léa",
    tagline: "Nature et exigeante",
    image: personaLea,
    ageRange: "33-40 ans",
    situation: "Maman de 2 enfants",
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
    ],
    aiInsights: [
      "Les vidéos explicatives augmentent son intention d'achat de +47%",
      "Elle passe 2,8x plus de temps sur les pages détaillant les certifications",
      "Comparaison rapide entre gammes = facteur déclencheur d'achat principal",
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
      {/* Header with stronger visual emphasis */}
      <header className="border-b border-border/40 bg-gradient-to-r from-primary/20 via-primary/15 to-accent/15 backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Ask-It Dashboard
              </h1>
              <p className="text-sm text-primary/80 font-medium mt-1">
                Marque : TALM — Data Premium
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                comparisonPeriod={comparisonPeriod}
                onComparisonPeriodChange={setComparisonPeriod}
                onApply={handleApplyDates}
              />
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="inline-flex h-auto items-center justify-start gap-2 rounded-lg bg-muted/30 p-1.5">
            <TabsTrigger value="overview">
              <Sparkles className="w-4 h-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="personas">
              <Users className="w-4 h-4" />
              Personas
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4" />
              Diagnostic
            </TabsTrigger>
            <TabsTrigger value="business">
              <DollarSign className="w-4 h-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="funnel">
              <Activity className="w-4 h-4" />
              Funnel
            </TabsTrigger>
            <TabsTrigger value="marketing">
              <TrendingUp className="w-4 h-4" />
              Marketing IA
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertCircle className="w-4 h-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Métriques clés</h3>
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
            </div>

            {/* Personas Preview */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Aperçu des Personas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {personas.map((persona, index) => (
                  <motion.div
                    key={persona.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-card rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={persona.image}
                        alt={persona.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{persona.name}</h4>
                        <p className="text-sm text-muted-foreground">{persona.tagline}</p>
                        <p className="text-xs text-muted-foreground mt-1">{persona.ageRange}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Part des prospects</span>
                        <span className="text-lg font-bold text-primary">{persona.prospectPercentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                          style={{ width: `${persona.prospectPercentage}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Diagnostic Performance */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Performance du Diagnostic</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card rounded-xl p-6 border border-border/50 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      +8%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Taux de complétion</p>
                  <p className="text-2xl font-bold text-foreground">78.5%</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="bg-card rounded-xl p-6 border border-border/50 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      +5%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Taux opt-in email</p>
                  <p className="text-2xl font-bold text-foreground">64.2%</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="bg-card rounded-xl p-6 border border-border/50 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      ~
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Durée moyenne</p>
                  <p className="text-2xl font-bold text-foreground">3:42</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="bg-card rounded-xl p-6 border border-border/50 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      +12%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Taux de démarrage</p>
                  <p className="text-2xl font-bold text-foreground">89.3%</p>
                </motion.div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="personas" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Personas Intelligents
              </h2>
              <p className="text-muted-foreground">
                Profils détaillés de vos clientes avec insights comportementaux
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <PersonaCard {...personas[0]} index={0} colorTheme="emma" />
              <PersonaCard {...personas[1]} index={1} colorTheme="sophie" />
              <PersonaCard {...personas[2]} index={2} colorTheme="lea" />
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
