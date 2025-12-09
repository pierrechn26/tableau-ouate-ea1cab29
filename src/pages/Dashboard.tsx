import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { BarChart3, Users, TrendingUp, Sparkles, AlertCircle, Download, HelpCircle, Activity, DollarSign, CheckCircle, Lock, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
const personas = [{
  name: "Emma",
  tagline: "Anxieuse mais proactive",
  image: personaEmma,
  ageRange: "26-32 ans",
  situation: "Enceinte 1er trimestre",
  prospectPercentage: 25,
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
  prospectPercentage: 22,
  psychology: "Fatigue + besoin de retrouver confiance + simplicité. Forte charge mentale.",
  problems: ["Pas le temps de lire → veut des informations directes et claires", "Vergétures / cicatrices / relâchement de peau", "Manque d'énergie pour comparer les produits"],
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSections, setExportSections] = useState({
    all: true,
    overview: true,
    personas: true,
    diagnostics: true,
    business: true,
    funnel: true,
    marketing: true,
    insights: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Refs for each section
  const overviewRef = useRef<HTMLDivElement>(null);
  const personasRef = useRef<HTMLDivElement>(null);
  const diagnosticsRef = useRef<HTMLDivElement>(null);
  const businessRef = useRef<HTMLDivElement>(null);
  const funnelRef = useRef<HTMLDivElement>(null);
  const marketingRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date()
  });
  const [customComparisonRange, setCustomComparisonRange] = useState<DateRange | undefined>();
  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    overview: overviewRef,
    personas: personasRef,
    diagnostics: diagnosticsRef,
    business: businessRef,
    funnel: funnelRef,
    marketing: marketingRef,
    insights: insightsRef
  };
  const sectionNames: Record<string, string> = {
    overview: "Vue d'ensemble",
    personas: "Personas",
    diagnostics: "Diagnostics",
    business: "Business",
    funnel: "Funnel",
    marketing: "Marketing IA",
    insights: "Insights"
  };
  const handleExport = async () => {
    const selectedSections = Object.entries(exportSections).filter(([key, value]) => value && key !== 'all').map(([key]) => key);
    if (selectedSections.length === 0) {
      toast({
        title: "Aucune section sélectionnée",
        description: "Veuillez sélectionner au moins une section à exporter.",
        variant: "destructive"
      });
      return;
    }
    setIsExporting(true);
    setExportOpen(false);
    toast({
      title: "Export en cours",
      description: "Génération du PDF en cours, veuillez patienter..."
    });
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let isFirstPage = true;

      // Store original tab to restore later
      const originalTab = activeTab;
      for (const section of selectedSections) {
        // Switch to the section's tab to make it visible
        setActiveTab(section === 'diagnostics' ? 'analytics' : section === 'insights' ? 'alerts' : section);

        // Wait for tab content to render
        await new Promise(resolve => setTimeout(resolve, 500));
        const ref = sectionRefs[section];
        if (ref?.current) {
          const canvas = await html2canvas(ref.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false
          });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - margin * 2;
          const imgHeight = canvas.height * imgWidth / canvas.width;
          if (!isFirstPage) {
            pdf.addPage();
          }

          // Add section title
          pdf.setFontSize(16);
          pdf.setTextColor(0, 0, 0);
          pdf.text(sectionNames[section], margin, margin + 5);

          // Add date range info
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          const dateText = dateRange?.from && dateRange?.to ? `Période: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}` : 'Période: Non définie';
          pdf.text(dateText, margin, margin + 12);

          // Calculate how many pages we need for this section
          let yPosition = margin + 18;
          let remainingHeight = imgHeight;
          let sourceY = 0;
          while (remainingHeight > 0) {
            const availableHeight = pageHeight - yPosition - margin;
            const sliceHeight = Math.min(availableHeight, remainingHeight);
            const sliceRatio = sliceHeight / imgHeight;

            // Create a temporary canvas for the slice
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = canvas.height * sliceRatio;
            const sliceCtx = sliceCanvas.getContext('2d');
            if (sliceCtx) {
              sliceCtx.drawImage(canvas, 0, sourceY * (canvas.height / imgHeight), canvas.width, sliceCanvas.height, 0, 0, sliceCanvas.width, sliceCanvas.height);
              const sliceData = sliceCanvas.toDataURL('image/png');
              pdf.addImage(sliceData, 'PNG', margin, yPosition, imgWidth, sliceHeight);
            }
            remainingHeight -= sliceHeight;
            sourceY += sliceHeight;
            if (remainingHeight > 0) {
              pdf.addPage();
              yPosition = margin;
            }
          }
          isFirstPage = false;
        }
      }

      // Restore original tab
      setActiveTab(originalTab);

      // Generate filename with date
      const fileName = `rapport-talm-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      toast({
        title: "Export réussi",
        description: `Le rapport "${fileName}" a été téléchargé.`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la génération du PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  const handleToggleAll = (checked: boolean) => {
    setExportSections({
      all: checked,
      overview: checked,
      personas: checked,
      diagnostics: checked,
      business: checked,
      funnel: checked,
      marketing: checked,
      insights: checked
    });
  };
  const handleToggleSection = (section: keyof typeof exportSections, checked: boolean) => {
    const newSections = {
      ...exportSections,
      [section]: checked
    };
    const allOthersChecked = Object.entries(newSections).filter(([key]) => key !== 'all').every(([, value]) => value);
    newSections.all = allOthersChecked;
    setExportSections(newSections);
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
                  Dashboard TALM — Plan Premium   
                </p>
                
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} customComparisonRange={customComparisonRange} onCustomComparisonRangeChange={setCustomComparisonRange} onApply={handleApplyDates} />
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
              <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Exporter le rapport PDF
                    </DialogTitle>
                    <DialogDescription>
                      Sélectionnez les sections à inclure dans votre rapport
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Checkbox id="export-all" checked={exportSections.all} onCheckedChange={checked => handleToggleAll(checked as boolean)} />
                      <Label htmlFor="export-all" className="font-semibold cursor-pointer">
                        Exporter l'ensemble des éléments
                      </Label>
                    </div>
                    
                    <div className="space-y-3 pl-2">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="export-overview" checked={exportSections.overview} onCheckedChange={checked => handleToggleSection('overview', checked as boolean)} />
                        <Label htmlFor="export-overview" className="flex items-center gap-2 cursor-pointer">
                          <Sparkles className="w-4 h-4 text-muted-foreground" />
                          Vue d'ensemble
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox id="export-personas" checked={exportSections.personas} onCheckedChange={checked => handleToggleSection('personas', checked as boolean)} />
                        <Label htmlFor="export-personas" className="flex items-center gap-2 cursor-pointer">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          Personas
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox id="export-diagnostics" checked={exportSections.diagnostics} onCheckedChange={checked => handleToggleSection('diagnostics', checked as boolean)} />
                        <Label htmlFor="export-diagnostics" className="flex items-center gap-2 cursor-pointer">
                          <BarChart3 className="w-4 h-4 text-muted-foreground" />
                          Diagnostics
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox id="export-business" checked={exportSections.business} onCheckedChange={checked => handleToggleSection('business', checked as boolean)} />
                        <Label htmlFor="export-business" className="flex items-center gap-2 cursor-pointer">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          Business
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox id="export-funnel" checked={exportSections.funnel} onCheckedChange={checked => handleToggleSection('funnel', checked as boolean)} />
                        <Label htmlFor="export-funnel" className="flex items-center gap-2 cursor-pointer">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          Funnel
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox id="export-marketing" checked={exportSections.marketing} onCheckedChange={checked => handleToggleSection('marketing', checked as boolean)} />
                        <Label htmlFor="export-marketing" className="flex items-center gap-2 cursor-pointer">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          Marketing IA
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox id="export-insights" checked={exportSections.insights} onCheckedChange={checked => handleToggleSection('insights', checked as boolean)} />
                        <Label htmlFor="export-insights" className="flex items-center gap-2 cursor-pointer">
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          Insights
                        </Label>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleExport} className="w-full" disabled={isExporting}>
                    {isExporting ? <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Export en cours...
                      </> : <>
                        <Download className="w-4 h-4 mr-2" />
                        Exporter le rapport
                      </>}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <div ref={overviewRef} className="space-y-8">
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
                        <p className="text-xs text-primary/80 font-medium mt-0.5">
                          {persona.name === "Emma" ? "Enceinte" : persona.name === "Sophie" ? "Post-partum" : "Maman"}
                        </p>
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
                  <p className="text-xs text-muted-foreground mt-2">vs période précédente</p>
                  <p className="text-sm font-semibold text-foreground">72.7%</p>
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
                  <p className="text-xs text-muted-foreground mt-2">vs période précédente</p>
                  <p className="text-sm font-semibold text-foreground">61.1%</p>
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
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      +10%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Durée moyenne</p>
                  <p className="text-2xl font-bold text-foreground">3:42</p>
                  <p className="text-xs text-muted-foreground mt-2">vs période précédente</p>
                  <p className="text-sm font-semibold text-foreground">3:23</p>
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
                  <p className="text-xs text-muted-foreground mt-2">vs période précédente</p>
                  <p className="text-sm font-semibold text-foreground">79.7%</p>
                </motion.div>
              </div>
            </div>

            {/* Diagnostic Preview */}
            <DiagnosticPreview />
            </div>
          </TabsContent>

          <TabsContent value="personas" className="space-y-6">
            <div ref={personasRef} className="space-y-6">
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
            <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.4,
              duration: 0.5
            }} className="relative overflow-hidden rounded-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
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
                    <span className="font-semibold text-primary">35% de vos prospects</span>
                  </div>
                  <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{
                      width: '35%'
                    }} />
                  </div>
                </div>
                
                <Button className="shadow-lg hover:shadow-xl transition-shadow" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Découvrir le plan Max
                </Button>
              </div>
            </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <div ref={diagnosticsRef}>
              <DiagnosticsAnalytics dateRange={dateRange} />
            </div>
          </TabsContent>

          <TabsContent value="business" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <div ref={businessRef}>
              <BusinessMetrics />
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <div ref={funnelRef}>
              <FunnelVisualization />
            </div>
          </TabsContent>

          <TabsContent value="marketing" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <div ref={marketingRef}>
              <MarketingRecommendations />
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="bg-card rounded-lg border border-border p-6 shadow-md">
            <div ref={insightsRef}>
              <AlertsSection />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>;
}