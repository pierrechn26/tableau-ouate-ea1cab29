import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, FileSpreadsheet, Search, Filter, ChevronDown, Clock, Route, Tag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

// Types
interface DiagnosticResponse {
  session_id: string;
  date: string;
  heure: string;
  statut: "démarré" | "abandonné" | "terminé";
  source: string;
  score_persona: string;
  persona_confiance: number;
  optin_email: boolean;
  offre_recommandee: string;
  conversion: boolean;
  panier_final: number | null;
  // New columns
  chemin_questions: string[];
  abandon_etape: string | null;
  duree_diagnostic: number | null;
  tags_comportementaux: string[];
  score_engagement: number;
  produits_consultes_avant: string[];
  produits_consultes_apres: string[];
  achat_final: boolean;
  produit_achete: string | null;
  // Dynamic questions
  [key: string]: string | number | boolean | null | undefined | string[];
}

// Mock data enrichi
const mockResponses: DiagnosticResponse[] = [
  {
    session_id: "A92JDK2",
    date: "2024-12-10",
    heure: "14:32",
    statut: "terminé",
    source: "ads",
    score_persona: "Emma",
    persona_confiance: 92,
    optin_email: true,
    offre_recommandee: "Pack 1er trimestre",
    conversion: true,
    panier_final: 89,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Budget", "Routine actuelle"],
    abandon_etape: null,
    duree_diagnostic: 187,
    tags_comportementaux: ["besoin d'accompagnement", "sensibilité grossesse"],
    score_engagement: 5,
    produits_consultes_avant: ["Huile vergetures", "Crème hydratante"],
    produits_consultes_apres: ["Pack 1er trimestre", "Sérum visage"],
    achat_final: true,
    produit_achete: "Pack 1er trimestre",
    q_01_type_peau: "Sèche",
    q_02_moment_grossesse: "1er trimestre",
    q_04_objectif: "Réduire vergetures",
  },
  {
    session_id: "B11XZ09",
    date: "2024-12-10",
    heure: "16:15",
    statut: "abandonné",
    source: "direct",
    score_persona: "Léa",
    persona_confiance: 67,
    optin_email: false,
    offre_recommandee: "—",
    conversion: false,
    panier_final: null,
    chemin_questions: ["Type de peau", "Concernes principaux"],
    abandon_etape: "Concernes principaux",
    duree_diagnostic: 45,
    tags_comportementaux: ["indécision", "budget limité"],
    score_engagement: 2,
    produits_consultes_avant: ["Baume corps"],
    produits_consultes_apres: [],
    achat_final: false,
    produit_achete: null,
    q_01_type_peau: "Mixte",
    q_03_concernes_principaux: "Rougeurs",
  },
  {
    session_id: "C77QP10",
    date: "2024-12-09",
    heure: "09:45",
    statut: "terminé",
    source: "email",
    score_persona: "Sophie",
    persona_confiance: 81,
    optin_email: true,
    offre_recommandee: "Pack postpartum",
    conversion: true,
    panier_final: 129,
    chemin_questions: ["Type de peau", "Moment grossesse", "Routine actuelle", "Préoccupations", "Budget"],
    abandon_etape: null,
    duree_diagnostic: 234,
    tags_comportementaux: ["sensibilité post-partum", "besoin d'accompagnement"],
    score_engagement: 4,
    produits_consultes_avant: ["Crème cicatrices", "Huile massage"],
    produits_consultes_apres: ["Pack postpartum", "Gel raffermissant"],
    achat_final: true,
    produit_achete: "Pack postpartum + Gel raffermissant",
    q_01_type_peau: "Normale",
    q_02_moment_grossesse: "Post-partum",
    q_05_routine_actuelle: "Aucune",
  },
  {
    session_id: "D45KL78",
    date: "2024-12-09",
    heure: "11:22",
    statut: "terminé",
    source: "ads",
    score_persona: "Emma",
    persona_confiance: 88,
    optin_email: true,
    offre_recommandee: "Huile anti-vergetures",
    conversion: true,
    panier_final: 45,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Fréquence utilisation"],
    abandon_etape: null,
    duree_diagnostic: 156,
    tags_comportementaux: ["décisive", "sensibilité grossesse"],
    score_engagement: 4,
    produits_consultes_avant: [],
    produits_consultes_apres: ["Huile anti-vergetures"],
    achat_final: true,
    produit_achete: "Huile anti-vergetures",
    q_01_type_peau: "Sensible",
    q_02_moment_grossesse: "2ème trimestre",
    q_04_objectif: "Hydrater la peau",
  },
  {
    session_id: "E92MN33",
    date: "2024-12-08",
    heure: "18:03",
    statut: "démarré",
    source: "social",
    score_persona: "Sophie",
    persona_confiance: 54,
    optin_email: false,
    offre_recommandee: "—",
    conversion: false,
    panier_final: null,
    chemin_questions: ["Type de peau"],
    abandon_etape: "Type de peau",
    duree_diagnostic: 12,
    tags_comportementaux: ["curiosité", "indécision"],
    score_engagement: 1,
    produits_consultes_avant: ["Sérum vitamine C"],
    produits_consultes_apres: [],
    achat_final: false,
    produit_achete: null,
    q_01_type_peau: "Grasse",
  },
  {
    session_id: "F88PQ21",
    date: "2024-12-08",
    heure: "20:41",
    statut: "terminé",
    source: "direct",
    score_persona: "Léa",
    persona_confiance: 79,
    optin_email: true,
    offre_recommandee: "Gamme bio certifiée",
    conversion: false,
    panier_final: null,
    chemin_questions: ["Type de peau", "Moment grossesse", "Concernes principaux", "Routine actuelle", "Préférences ingrédients"],
    abandon_etape: null,
    duree_diagnostic: 298,
    tags_comportementaux: ["exigeante bio", "recherche qualité"],
    score_engagement: 3,
    produits_consultes_avant: ["Gamme bio certifiée", "Huile argan bio"],
    produits_consultes_apres: ["Gamme bio certifiée"],
    achat_final: false,
    produit_achete: null,
    q_01_type_peau: "Mixte",
    q_02_moment_grossesse: "Post-partum",
    q_03_concernes_principaux: "Cicatrices",
    q_05_routine_actuelle: "Basique",
  },
  {
    session_id: "G12RT55",
    date: "2024-12-07",
    heure: "10:18",
    statut: "terminé",
    source: "ads",
    score_persona: "Emma",
    persona_confiance: 95,
    optin_email: true,
    offre_recommandee: "Pack complet grossesse",
    conversion: true,
    panier_final: 189,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Budget", "Allergies", "Routine actuelle"],
    abandon_etape: null,
    duree_diagnostic: 312,
    tags_comportementaux: ["besoin d'accompagnement", "sensibilité grossesse", "prête à investir"],
    score_engagement: 5,
    produits_consultes_avant: ["Huile vergetures", "Crème corps", "Sérum"],
    produits_consultes_apres: ["Pack complet grossesse"],
    achat_final: true,
    produit_achete: "Pack complet grossesse",
    q_01_type_peau: "Sèche",
    q_02_moment_grossesse: "1er trimestre",
    q_04_objectif: "Prévention complète",
  },
  {
    session_id: "H44WX88",
    date: "2024-12-07",
    heure: "14:55",
    statut: "abandonné",
    source: "email",
    score_persona: "Sophie",
    persona_confiance: 61,
    optin_email: false,
    offre_recommandee: "—",
    conversion: false,
    panier_final: null,
    chemin_questions: ["Type de peau", "Moment grossesse", "Concernes principaux"],
    abandon_etape: "Concernes principaux",
    duree_diagnostic: 78,
    tags_comportementaux: ["indécision", "sensibilité post-partum"],
    score_engagement: 2,
    produits_consultes_avant: ["Crème raffermissante"],
    produits_consultes_apres: [],
    achat_final: false,
    produit_achete: null,
    q_01_type_peau: "Normale",
    q_02_moment_grossesse: "Post-partum",
    q_03_concernes_principaux: "Relâchement cutané",
  },
  {
    session_id: "I99ZY12",
    date: "2024-12-06",
    heure: "08:30",
    statut: "terminé",
    source: "social",
    score_persona: "Léa",
    persona_confiance: 86,
    optin_email: true,
    offre_recommandee: "Routine naturelle",
    conversion: true,
    panier_final: 156,
    chemin_questions: ["Type de peau", "Préférences ingrédients", "Concernes principaux", "Budget", "Certification recherchée"],
    abandon_etape: null,
    duree_diagnostic: 267,
    tags_comportementaux: ["exigeante bio", "recherche qualité", "fidélité marque"],
    score_engagement: 5,
    produits_consultes_avant: ["Gamme naturelle", "Sérum bio"],
    produits_consultes_apres: ["Routine naturelle", "Complément alimentaire"],
    achat_final: true,
    produit_achete: "Routine naturelle",
    q_01_type_peau: "Sensible",
    q_03_concernes_principaux: "Ingrédients naturels",
  },
  {
    session_id: "J55AB34",
    date: "2024-12-06",
    heure: "19:22",
    statut: "terminé",
    source: "direct",
    score_persona: "Emma",
    persona_confiance: 73,
    optin_email: true,
    offre_recommandee: "Duo hydratation",
    conversion: false,
    panier_final: null,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Routine actuelle"],
    abandon_etape: null,
    duree_diagnostic: 145,
    tags_comportementaux: ["budget limité", "première grossesse"],
    score_engagement: 3,
    produits_consultes_avant: [],
    produits_consultes_apres: ["Duo hydratation", "Huile corps"],
    achat_final: false,
    produit_achete: null,
    q_01_type_peau: "Mixte",
    q_02_moment_grossesse: "3ème trimestre",
    q_04_objectif: "Hydratation intense",
    q_05_routine_actuelle: "Complète",
  },
];

// Fixed columns - updated with new columns
const fixedColumns = [
  { key: "session_id", label: "Session ID", width: "100px" },
  { key: "date", label: "Date", width: "100px" },
  { key: "heure", label: "Heure", width: "70px" },
  { key: "statut", label: "Statut", width: "100px" },
  { key: "source", label: "Source", width: "80px" },
  { key: "score_persona", label: "Persona", width: "120px" },
  { key: "persona_confiance", label: "Confiance", width: "80px" },
  { key: "optin_email", label: "Opt-in", width: "70px" },
  { key: "offre_recommandee", label: "Offre recommandée", width: "150px" },
  { key: "conversion", label: "Conversion", width: "90px" },
  { key: "panier_final", label: "Panier (€)", width: "90px" },
  { key: "chemin_questions", label: "Chemin questions", width: "200px" },
  { key: "abandon_etape", label: "Abandon à l'étape", width: "140px" },
  { key: "duree_diagnostic", label: "Durée (sec)", width: "100px" },
  { key: "tags_comportementaux", label: "Tags comportementaux", width: "200px" },
  { key: "score_engagement", label: "Engagement", width: "100px" },
  { key: "produits_consultes_avant", label: "Produits consultés avant", width: "180px" },
  { key: "produits_consultes_apres", label: "Produits consultés après", width: "180px" },
  { key: "achat_final", label: "Achat final", width: "90px" },
  { key: "produit_achete", label: "Produit acheté", width: "180px" },
];

// Dynamic question columns (extracted from all responses)
const getDynamicColumns = (responses: DiagnosticResponse[]) => {
  const dynamicKeys = new Set<string>();
  responses.forEach((response) => {
    Object.keys(response).forEach((key) => {
      if (key.startsWith("q_")) {
        dynamicKeys.add(key);
      }
    });
  });
  return Array.from(dynamicKeys).sort().map((key) => ({
    key,
    label: key.replace(/^q_\d+_/, "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  }));
};

export function ResponsesSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [personaFilter, setPersonaFilter] = useState<string>("all");
  const { toast } = useToast();

  const dynamicColumns = getDynamicColumns(mockResponses);

  const filteredResponses = mockResponses.filter((response) => {
    const matchesSearch =
      response.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.score_persona.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || response.statut === statusFilter;
    const matchesPersona = personaFilter === "all" || response.score_persona === personaFilter;
    return matchesSearch && matchesStatus && matchesPersona;
  });

  const exportData = (format: "csv" | "json") => {
    const dataToExport = filteredResponses;

    if (format === "json") {
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagnostic-responses-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const allColumns = [...fixedColumns, ...dynamicColumns];
      const headers = allColumns.map((col) => col.label).join(",");
      const rows = dataToExport.map((row) =>
        allColumns
          .map((col) => {
            const value = row[col.key as keyof DiagnosticResponse];
            if (value === null || value === undefined) return "";
            if (typeof value === "boolean") return value ? "Oui" : "Non";
            if (Array.isArray(value)) return `"${value.join("; ")}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      );
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagnostic-responses-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export réussi",
      description: `Les données ont été exportées en ${format.toUpperCase()}.`,
    });
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "terminé":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Terminé</Badge>;
      case "abandonné":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Abandonné</Badge>;
      case "démarré":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Démarré</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getPersonaBadge = (persona: string, confiance: number) => {
    const colors: Record<string, string> = {
      Emma: "bg-pink-100 text-pink-700 border-pink-200",
      Sophie: "bg-violet-100 text-violet-700 border-violet-200",
      Léa: "bg-teal-100 text-teal-700 border-teal-200",
    };
    return (
      <div className="flex items-center gap-2">
        <Badge className={colors[persona] || "bg-muted text-muted-foreground"}>
          {persona}
        </Badge>
        <span className="text-xs text-muted-foreground">({confiance}%)</span>
      </div>
    );
  };

  const getEngagementStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderCellContent = (response: DiagnosticResponse, colKey: string) => {
    const value = response[colKey as keyof DiagnosticResponse];

    switch (colKey) {
      case "session_id":
        return <span className="font-mono text-sm font-medium">{value as string}</span>;
      case "statut":
        return getStatusBadge(value as string);
      case "source":
        return (
          <Badge variant="outline" className="capitalize">
            {value as string}
          </Badge>
        );
      case "score_persona":
        return getPersonaBadge(response.score_persona, response.persona_confiance);
      case "persona_confiance":
        return <span className="text-sm font-medium">{value}%</span>;
      case "optin_email":
        return value ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Oui</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Non</Badge>
        );
      case "conversion":
        return value ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Oui</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Non</Badge>
        );
      case "panier_final":
        return value !== null ? `${value} €` : "—";
      case "chemin_questions":
        const questions = value as string[];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Route className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs truncate max-w-[150px]">
                    {questions.length} étapes
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] p-3">
                <p className="font-semibold text-sm mb-2">Parcours complet :</p>
                <ol className="text-xs space-y-1">
                  {questions.map((q, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ol>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "abandon_etape":
        return value ? (
          <span className="text-destructive text-sm">{value as string}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      case "duree_diagnostic":
        if (value === null) return <span className="text-muted-foreground/50">—</span>;
        const minutes = Math.floor((value as number) / 60);
        const seconds = (value as number) % 60;
        return (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">
              {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
            </span>
          </div>
        );
      case "tags_comportementaux":
        const tags = value as string[];
        if (!tags || tags.length === 0) return <span className="text-muted-foreground/50">—</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Tag className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-xs">{tags.length} tags</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] p-3">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "score_engagement":
        return getEngagementStars(value as number);
      case "produits_consultes_avant":
      case "produits_consultes_apres":
        const produits = value as string[];
        if (!produits || produits.length === 0) return <span className="text-muted-foreground/50">—</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs cursor-help underline decoration-dotted">
                  {produits.length} produit{produits.length > 1 ? "s" : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] p-3">
                <ul className="text-xs space-y-1">
                  {produits.map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "achat_final":
        return value ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Oui</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Non</Badge>
        );
      case "produit_achete":
        return value ? (
          <span className="text-sm">{value as string}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      default:
        return value !== undefined && value !== null ? (
          <span className="text-sm">{String(value)}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-xl border border-border/50 p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground font-heading">
              Réponses du Diagnostic
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredResponses.length} session{filteredResponses.length > 1 ? "s" : ""} affichée{filteredResponses.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => exportData("csv")} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportData("json")} className="gap-2">
              <FileJson className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par session ID ou persona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="terminé">Terminé</SelectItem>
              <SelectItem value="abandonné">Abandonné</SelectItem>
              <SelectItem value="démarré">Démarré</SelectItem>
            </SelectContent>
          </Select>
          <Select value={personaFilter} onValueChange={setPersonaFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border">
              <SelectItem value="all">Tous les personas</SelectItem>
              <SelectItem value="Emma">Emma</SelectItem>
              <SelectItem value="Sophie">Sophie</SelectItem>
              <SelectItem value="Léa">Léa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-md overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[2800px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {fixedColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="font-semibold text-foreground whitespace-nowrap"
                      style={{ minWidth: col.width }}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  {dynamicColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="font-semibold text-primary whitespace-nowrap"
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response, index) => (
                  <TableRow
                    key={response.session_id}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}
                  >
                    {fixedColumns.map((col) => (
                      <TableCell key={col.key}>
                        {renderCellContent(response, col.key)}
                      </TableCell>
                    ))}
                    {dynamicColumns.map((col) => (
                      <TableCell key={col.key} className="text-sm">
                        {response[col.key] !== undefined ? (
                          <span>{String(response[col.key])}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Legend */}
      <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Légende :</span> Les colonnes en{" "}
          <span className="text-primary font-medium">couleur</span> représentent les questions dynamiques du diagnostic.
          Les cellules vides (—) indiquent que la question n'a pas été posée à ce prospect. 
          Survolez les éléments avec <span className="underline decoration-dotted">soulignement pointillé</span> pour voir plus de détails.
        </p>
      </div>
    </motion.div>
  );
}
