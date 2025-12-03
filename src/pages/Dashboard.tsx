import { useState } from "react";
import { motion } from "framer-motion";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { BarChart3, Users, TrendingUp, Sparkles, AlertCircle, Download, HelpCircle, Activity, DollarSign, CheckCircle, Lock } from "lucide-react";
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
import { DiagnosticPreview } from "@/components/dashboard/DiagnosticPreview";
import personaEmma from "@/assets/persona-emma.png";
import personaSophie from "@/assets/persona-sophie.png";
import personaLea from "@/assets/persona-lea.png";
import askItLogo from "@/assets/ask-it-logo.png";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
const personas = [{
  name: "Emma",
  tagline: "Anxieuse mais proactive",
  image: personaEmma,
  ageRange: "26-32 ans",
  situation: "Enceinte 1er trimestre",
  prospectPercentage: 42,
  psychology: "Cherche réassurance, lit beaucoup, craint le 'mal faire', veut se sentir préparée.",
  problems: ["Ne sait pas quels soins sont vraiment 'safe grossesse'", "Peur des vergetures → cherche prévention", "Sensible aux textures (nausées + odeurs)", "Redoute les achats inutiles"],
  keyNeeds: ["Guide clair par étape (trimester checklist)", "Produits certifiés, explications simples", "Recommandations personnalisées selon ses symptômes"],
  behaviors: ["Consulte beaucoup la FAQ", "Compare plusieurs produits", "Fait souvent des abandons de panier"],
  topProducts: ["Huile anti-vergetures bio", "Crème hydratante sans parfum", "Guide 1er trimestre"],
  aiInsights: ["78% des Emmas abandonnent si la composition n'est pas expliquée clairement", "Les recommandations \"routine 1er trimestre\" convertissent +32% sur ce profil", "Ce persona convertit 2,4x mieux lorsque la routine est présentée sous forme de pack complet"]
}, {
  name: "Sophie",
  tagline: "Efficace et pressée",
  image: personaSophie,
  ageRange: "30-38 ans",
  situation: "Jeune maman postpartum",
  prospectPercentage: 35,
  psychology: "Fatigue + besoin de retrouver confiance + simplicité. Forte charge mentale.",
  problems: ["Pas le temps de lire → veut 'direct au but'", "Vergétures / cicatrices / relâchement de peau", "Manque d'énergie pour comparer les produits"],
  keyNeeds: ["Routine minimaliste en 2–3 produits max", "Explications rapides ('voici ce qu'il te faut')", "Recommandations selon symptômes (sécheresse, cicatrices, jambes lourdes)"],
  behaviors: ["Très mobile-first (87% achètent sur smartphone)", "Achète souvent via recommandations personnalisées", "Convertit 2,4× mieux avec des packs complets"],
  topProducts: ["Pack routine postpartum", "Sérum réparateur express", "Crème raffermissante"],
  aiInsights: ["Les contenus \"avant/après\" augmentent fortement le taux de conversion sur ce profil", "Elle clique 3x plus sur les diagnostics courts que sur les longs", "Les offres \"routine post-partum\" génèrent +47% de CA sur ce segment"]
}, {
  name: "Léa",
  tagline: "Nature et exigeante",
  image: personaLea,
  ageRange: "33-40 ans",
  situation: "Maman de 2 enfants",
  prospectPercentage: 18,
  psychology: "Consommatrice exigeante, très attachée aux valeurs marque. Veut le meilleur mais déteste le bullshit.",
  problems: ["Ne croit plus les promesses marketing trop vagues", "Besoin d'information scientifique vulgarisée", "Sensible au prix → cherche le rapport qualité/prix"],
  keyNeeds: ["Fiches produits ultra-transparentes", "Comparaison rapide entre gammes", "Argumentaire clair sur les résultats"],
  behaviors: ["Lit les avis + composition (liste INCI complète)", "Convertit mieux sur les bundles", "Clique 3× plus sur les diagnostics courts"],
  topProducts: ["Gamme bio certifiée", "Huile végétale pure", "Pack transparence totale"],
  aiInsights: ["Les vidéos explicatives augmentent son intention d'achat de +47%", "Elle passe 2,8x plus de temps sur les pages détaillant les certifications", "Comparaison rapide entre gammes = facteur déclencheur d'achat principal"]
}];
export default function Dashboard() {
  const [supportOpen, setSupportOpen] = useState(false);
  const {
    toast
  } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date()
  });
  const [comparisonPeriod, setComparisonPeriod] = useState("previous");
  const handleExport = () => {
    toast({
      title: "Export en cours",
      description: "Votre rapport PDF sera prêt dans quelques instants..."
    });
  };
  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message envoyé",
      description: "Notre équipe vous répondra dans les 24h."
    });
    setSupportOpen(false);
  };
  const handleApplyDates = () => {
    toast({
      title: "Données actualisées",
      description: "Le dashboard a été mis à jour avec la nouvelle période."
    });
  };
  return <div className="min-h-screen bg-background">
      {/* Header with stronger visual emphasis */}
      <header className="border-b border-border bg-gradient-to-r from-primary via-secondary to-accent backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-col flex items-start justify-start">
              <img alt="Ask-It Logo" className="h-[61px] w-auto object-contain" src="/lovable-uploads/30b93e71-30dd-4fdd-aae7-9d008af6fa5c.png" />
              <div className="flex items-center gap-2 mt-1">
                <p className="text-base text-white font-medium">
                  Dashboard TALM — Premium Data
                </p>
                
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} comparisonPeriod={comparisonPeriod} onComparisonPeriodChange={setComparisonPeriod} onApply={handleApplyDates} />
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
                      <Input id="email" type="email" placeholder="vous@talm.com" required />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" placeholder="Décrivez votre demande..." rows={4} required />
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
            <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl border border-border/50 p-6 shadow-md">
              <h3 className="text-xl font-bold text-foreground mb-6 font-heading">Métriques clés</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="CA généré via diagnostic" value="127 450 €" subtitle="Cette période" icon={TrendingUp} trend={{
                value: 23,
                isPositive: true
              }} comparison={{
                value: "103 720 €",
                period: "vs période précédente"
              }} index={0} />
                <MetricCard title="Taux de conversion" value="4.0%" subtitle="Diagnostic → Achat" icon={BarChart3} trend={{
                value: 12,
                isPositive: true
              }} comparison={{
                value: "3.57%",
                period: "vs période précédente"
              }} index={1} />
                <MetricCard title="AOV après diagnostic" value="71.20 €" subtitle="vs 52.30 € sans" icon={TrendingUp} trend={{
                value: 36,
                isPositive: true
              }} comparison={{
                value: "52.35 €",
                period: "vs période précédente"
              }} index={2} />
                <MetricCard title="Diagnostics complétés" value="6 234" subtitle="Ce mois" icon={Users} trend={{
                value: 8,
                isPositive: true
              }} comparison={{
                value: "5 772",
                period: "vs période précédente"
              }} index={3} />
              </div>
            </div>

            {/* Personas Preview */}
            <div className="bg-gradient-to-br from-card via-card to-secondary/10 rounded-xl border border-border/50 p-6 shadow-md">
              <h3 className="text-xl font-bold text-foreground mb-6 font-heading">Aperçu des Personas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {personas.map((persona, index) => <motion.div key={persona.name} initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.5,
                delay: index * 0.1
              }} className="bg-gradient-to-br from-card via-card to-secondary/5 rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-start gap-4 mb-4">
                      <img src={persona.image} alt={persona.name} className="w-16 h-16 rounded-full object-cover" />
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
                        <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{
                      width: `${persona.prospectPercentage}%`
                    }} />
                      </div>
                    </div>
                  </motion.div>)}
              </div>
            </div>

            {/* Diagnostic Performance */}
            <div className="bg-gradient-to-br from-card via-card to-accent/10 rounded-xl border border-border/50 p-6 shadow-md">
              <h3 className="text-xl font-bold text-foreground mb-6 font-heading">Performance du Diagnostic</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} transition={{
                duration: 0.3
              }} className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-6 border border-border/50 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      +8%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Taux de complétion</p>
                  <p className="text-2xl font-bold text-foreground">78.5%</p>
                </motion.div>

                <motion.div initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} transition={{
                duration: 0.3,
                delay: 0.1
              }} className="bg-gradient-to-br from-card via-card to-accent/5 rounded-xl p-6 border border-border/50 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      +5%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Taux opt-in email</p>
                  <p className="text-2xl font-bold text-foreground">64.2%</p>
                </motion.div>

                <motion.div initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} transition={{
                duration: 0.3,
                delay: 0.2
              }} className="bg-gradient-to-br from-card via-card to-secondary/5 rounded-xl p-6 border border-border/50 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      ~
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Durée moyenne</p>
                  <p className="text-2xl font-bold text-foreground">3:42</p>
                </motion.div>

                <motion.div initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} transition={{
                duration: 0.3,
                delay: 0.3
              }} className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-6 border border-border/50 shadow-sm">
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

            {/* Diagnostic Preview */}
            <DiagnosticPreview />
          </TabsContent>

          <TabsContent value="personas" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2 font-heading">
                Personas Intelligents
              </h2>
              <p className="text-muted-foreground">
                Profils détaillés de vos clientes avec insights comportementaux
              </p>
            </div>
            
            {/* Separate persona cards with shadow depth */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="h-full bg-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] transition-shadow duration-300">
                <PersonaCard {...personas[0]} index={0} colorTheme="emma" />
              </div>
              <div className="h-full bg-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] transition-shadow duration-300">
                <PersonaCard {...personas[1]} index={1} colorTheme="sophie" />
              </div>
              <div className="h-full bg-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] transition-shadow duration-300">
                <PersonaCard {...personas[2]} index={2} colorTheme="lea" />
              </div>
            </div>

            {/* Locked Premium Personas Teaser */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative overflow-hidden rounded-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            >
              {/* Colorful blurred background simulating hidden data */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="grid grid-cols-3 gap-4 p-6 blur-md">
                  {/* Simulated colorful persona cards */}
                  <div className="bg-gradient-to-br from-persona-emma to-persona-emma/60 rounded-xl h-64 p-4">
                    <div className="w-16 h-16 bg-white/30 rounded-full mb-4" />
                    <div className="h-4 bg-white/40 rounded w-2/3 mb-3" />
                    <div className="h-3 bg-white/30 rounded w-1/2 mb-6" />
                    <div className="h-2 bg-white/20 rounded w-full mb-2" />
                    <div className="h-2 bg-white/20 rounded w-4/5 mb-2" />
                    <div className="h-2 bg-white/20 rounded w-3/4" />
                  </div>
                  <div className="bg-gradient-to-br from-persona-sophie to-persona-sophie/60 rounded-xl h-64 p-4">
                    <div className="w-16 h-16 bg-white/30 rounded-full mb-4" />
                    <div className="h-4 bg-white/40 rounded w-2/3 mb-3" />
                    <div className="h-3 bg-white/30 rounded w-1/2 mb-6" />
                    <div className="h-2 bg-white/20 rounded w-full mb-2" />
                    <div className="h-2 bg-white/20 rounded w-4/5 mb-2" />
                    <div className="h-2 bg-white/20 rounded w-3/4" />
                  </div>
                  <div className="bg-gradient-to-br from-persona-lea to-persona-lea/60 rounded-xl h-64 p-4">
                    <div className="w-16 h-16 bg-white/30 rounded-full mb-4" />
                    <div className="h-4 bg-white/40 rounded w-2/3 mb-3" />
                    <div className="h-3 bg-white/30 rounded w-1/2 mb-6" />
                    <div className="h-2 bg-white/20 rounded w-full mb-2" />
                    <div className="h-2 bg-white/20 rounded w-4/5 mb-2" />
                    <div className="h-2 bg-white/20 rounded w-3/4" />
                  </div>
                </div>
              </div>

              {/* Overlay content with proper spacing */}
              <div className="relative z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center py-16 pb-24 px-8">
                <div className="bg-primary/15 p-5 rounded-full mb-6 shadow-lg">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 text-center">
                  Passer au niveau supérieur pour découvrir vos autres personas intelligents
                </h3>
                <p className="text-muted-foreground text-center max-w-lg mb-6">
                  Débloquez une vue complète de tous vos profils clients pour une analyse encore plus profonde et précise
                </p>
                
                {/* Progress bar showing remaining percentage */}
                <div className="w-full max-w-sm space-y-2 mb-8">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Personas supplémentaires</span>
                    <span className="font-semibold text-primary">5% de vos prospects</span>
                  </div>
                  <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" 
                      style={{ width: '5%' }}
                    />
                  </div>
                </div>
                
                <Button className="shadow-lg hover:shadow-xl transition-shadow" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Découvrir l'offre Premium
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <DiagnosticsAnalytics />
          </TabsContent>

          <TabsContent value="business" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <BusinessMetrics />
          </TabsContent>

          <TabsContent value="funnel" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <FunnelVisualization />
          </TabsContent>

          <TabsContent value="marketing" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <MarketingRecommendations />
          </TabsContent>

          <TabsContent value="alerts" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <AlertsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>;
}