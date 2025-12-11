import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, FileSpreadsheet, Search, Filter, ChevronDown } from "lucide-react";
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
  // Dynamic questions
  [key: string]: string | number | boolean | null | undefined;
}

// Mock data
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
    q_01_type_peau: "Mixte",
    q_02_moment_grossesse: "Post-partum",
    q_03_concernes_principaux: "Cicatrices",
    q_05_routine_actuelle: "Basique",
  },
];

// Fixed columns
const fixedColumns = [
  { key: "session_id", label: "Session ID" },
  { key: "date", label: "Date" },
  { key: "heure", label: "Heure" },
  { key: "statut", label: "Statut" },
  { key: "source", label: "Source" },
  { key: "score_persona", label: "Persona" },
  { key: "persona_confiance", label: "Confiance" },
  { key: "optin_email", label: "Opt-in" },
  { key: "offre_recommandee", label: "Offre recommandée" },
  { key: "conversion", label: "Conversion" },
  { key: "panier_final", label: "Panier (€)" },
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download className="w-4 h-4" />
                Exporter données
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem onClick={() => exportData("csv")} className="cursor-pointer gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("json")} className="cursor-pointer gap-2">
                <FileJson className="w-4 h-4" />
                Exporter en JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="min-w-[1400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {fixedColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="font-semibold text-foreground whitespace-nowrap"
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
                    <TableCell className="font-mono text-sm font-medium">
                      {response.session_id}
                    </TableCell>
                    <TableCell>{response.date}</TableCell>
                    <TableCell>{response.heure}</TableCell>
                    <TableCell>{getStatusBadge(response.statut)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {response.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getPersonaBadge(response.score_persona, response.persona_confiance)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{response.persona_confiance}%</span>
                    </TableCell>
                    <TableCell>
                      {response.optin_email ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Oui</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Non</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {response.offre_recommandee}
                    </TableCell>
                    <TableCell>
                      {response.conversion ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Oui</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Non</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {response.panier_final !== null ? `${response.panier_final} €` : "—"}
                    </TableCell>
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
        </p>
      </div>
    </motion.div>
  );
}
