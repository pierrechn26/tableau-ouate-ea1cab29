import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, FileSpreadsheet, Search, Filter, Clock, Route, Tag, Star, User, Mail, Phone, Calendar, CalendarDays } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, isAfter, isBefore, parseISO, isEqual } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

// Types
interface DiagnosticResponse {
  // Identification & tracking
  session_id: string;
  date: string;
  heure: string;
  statut: "démarré" | "abandonné" | "terminé";
  source: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  // Opt-ins computed
  optin_email: boolean;
  optin_sms: boolean;
  // Personas & IA
  persona_detecte: string;
  score_persona: number;
  score_confiance_ia: number;
  // Business & Conversion
  offre_recommandee: string;
  conversion: boolean;
  panier: number | null;
  // Comportement
  chemin_questions: string[];
  abandon_etape: string | null;
  duree: number | null;
  tags_comportementaux: string[];
  engagement: "faible" | "moyen" | "élevé";
  // Questions statiques
  age: number | null;
  statut_maternite: string | null;
  type_peau_declare: string | null;
  budget_skincare: string | null;
  frequence_utilisation: string | null;
  allergies: string | null;
  objectif_principal: string | null;
  // Questions dynamiques
  symptome_dominant: string | null;
  intensite_besoin: number | null;
  declencheur_principal: string | null;
  zone_prioritaire: string | null;
  routine_detaillee: string | null;
  produits_incompatibles: string | null;
  niveau_urgence: string | null;
  messages_cles_ia: string[];
}

// Mock data enrichi
const mockResponses: DiagnosticResponse[] = [
  {
    session_id: "A92JDK2",
    date: "2024-12-10",
    heure: "14:32",
    statut: "terminé",
    source: "ads",
    prenom: "Marie",
    nom: "Dupont",
    email: "marie.dupont@email.com",
    telephone: "06 12 34 56 78",
    optin_email: true,
    optin_sms: true,
    persona_detecte: "Emma",
    score_persona: 92,
    score_confiance_ia: 94,
    offre_recommandee: "Pack 1er trimestre",
    conversion: true,
    panier: 89,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Budget", "Routine actuelle"],
    abandon_etape: null,
    duree: 187,
    tags_comportementaux: ["besoin d'accompagnement", "sensibilité grossesse"],
    engagement: "élevé",
    age: 28,
    statut_maternite: "1er trimestre",
    type_peau_declare: "Sèche",
    budget_skincare: "30–60€",
    frequence_utilisation: "Quotidienne",
    allergies: "Huiles essentielles",
    objectif_principal: "Limiter les vergetures",
    symptome_dominant: "Tiraillements",
    intensite_besoin: 4,
    declencheur_principal: "Croissance rapide du ventre",
    zone_prioritaire: "Ventre",
    routine_detaillee: "Huile végétale 1×/jour",
    produits_incompatibles: "Rétinoïdes",
    niveau_urgence: "Élevé",
    messages_cles_ia: ["besoin d'accompagnement", "inquiétude vergetures"],
  },
  {
    session_id: "B11XZ09",
    date: "2024-12-10",
    heure: "16:15",
    statut: "abandonné",
    source: "direct",
    prenom: "Sophie",
    nom: "Martin",
    email: "sophie.m@gmail.com",
    telephone: "",
    optin_email: true,
    optin_sms: false,
    persona_detecte: "Léa",
    score_persona: 67,
    score_confiance_ia: 58,
    offre_recommandee: "—",
    conversion: false,
    panier: null,
    chemin_questions: ["Type de peau", "Concernes principaux"],
    abandon_etape: "Concernes principaux",
    duree: 45,
    tags_comportementaux: ["indécision", "budget limité"],
    engagement: "faible",
    age: 31,
    statut_maternite: "2ème trimestre",
    type_peau_declare: "Mixte",
    budget_skincare: "<30€",
    frequence_utilisation: "Occasionnelle",
    allergies: null,
    objectif_principal: "Hydrater intensément",
    symptome_dominant: "Rougeurs",
    intensite_besoin: 2,
    declencheur_principal: "Changements hormonaux",
    zone_prioritaire: "Visage",
    routine_detaillee: "Aucun soin",
    produits_incompatibles: null,
    niveau_urgence: "Faible",
    messages_cles_ia: ["indécision", "budget limité"],
  },
  {
    session_id: "C77QP10",
    date: "2024-12-09",
    heure: "09:45",
    statut: "terminé",
    source: "email",
    prenom: "Claire",
    nom: "Bernard",
    email: "claire.bernard@outlook.fr",
    telephone: "07 98 76 54 32",
    optin_email: true,
    optin_sms: true,
    persona_detecte: "Sophie",
    score_persona: 81,
    score_confiance_ia: 85,
    offre_recommandee: "Pack postpartum",
    conversion: true,
    panier: 129,
    chemin_questions: ["Type de peau", "Moment grossesse", "Routine actuelle", "Préoccupations", "Budget"],
    abandon_etape: null,
    duree: 234,
    tags_comportementaux: ["sensibilité post-partum", "besoin d'accompagnement"],
    engagement: "élevé",
    age: 34,
    statut_maternite: "Post-partum",
    type_peau_declare: "Normale",
    budget_skincare: "+60€",
    frequence_utilisation: "Quotidienne",
    allergies: "Parfums synthétiques",
    objectif_principal: "Réparer après-grossesse",
    symptome_dominant: "Cicatrices",
    intensite_besoin: 5,
    declencheur_principal: "Post-accouchement",
    zone_prioritaire: "Ventre, Poitrine",
    routine_detaillee: "Crème non adaptée",
    produits_incompatibles: "Huiles essentielles, Rétinoïdes",
    niveau_urgence: "Élevé",
    messages_cles_ia: ["sensibilité post-partum", "besoin confiance"],
  },
  {
    session_id: "D45KL78",
    date: "2024-12-09",
    heure: "11:22",
    statut: "terminé",
    source: "ads",
    prenom: "Émilie",
    nom: "Petit",
    email: "emilie.petit@yahoo.fr",
    telephone: "06 45 67 89 01",
    optin_email: true,
    optin_sms: true,
    persona_detecte: "Emma",
    score_persona: 88,
    score_confiance_ia: 91,
    offre_recommandee: "Huile anti-vergetures",
    conversion: true,
    panier: 45,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Fréquence utilisation"],
    abandon_etape: null,
    duree: 156,
    tags_comportementaux: ["décisive", "sensibilité grossesse"],
    engagement: "élevé",
    age: 27,
    statut_maternite: "2ème trimestre",
    type_peau_declare: "Sensible",
    budget_skincare: "30–60€",
    frequence_utilisation: "Quotidienne",
    allergies: null,
    objectif_principal: "Hydrater intensément",
    symptome_dominant: "Démangeaisons",
    intensite_besoin: 3,
    declencheur_principal: "Changements hormonaux",
    zone_prioritaire: "Hanches",
    routine_detaillee: "Huile végétale 2×/jour",
    produits_incompatibles: null,
    niveau_urgence: "Moyen",
    messages_cles_ia: ["sensibilité grossesse", "prête à investir"],
  },
  {
    session_id: "E92MN33",
    date: "2024-12-08",
    heure: "18:03",
    statut: "démarré",
    source: "social",
    prenom: "Laura",
    nom: "Moreau",
    email: "",
    telephone: "",
    optin_email: false,
    optin_sms: false,
    persona_detecte: "Sophie",
    score_persona: 54,
    score_confiance_ia: 42,
    offre_recommandee: "—",
    conversion: false,
    panier: null,
    chemin_questions: ["Type de peau"],
    abandon_etape: "Type de peau",
    duree: 12,
    tags_comportementaux: ["curiosité", "indécision"],
    engagement: "faible",
    age: null,
    statut_maternite: null,
    type_peau_declare: "Grasse",
    budget_skincare: null,
    frequence_utilisation: null,
    allergies: null,
    objectif_principal: null,
    symptome_dominant: null,
    intensite_besoin: null,
    declencheur_principal: null,
    zone_prioritaire: null,
    routine_detaillee: null,
    produits_incompatibles: null,
    niveau_urgence: null,
    messages_cles_ia: [],
  },
  {
    session_id: "F88PQ21",
    date: "2024-12-08",
    heure: "20:41",
    statut: "terminé",
    source: "direct",
    prenom: "Julie",
    nom: "Lefebvre",
    email: "julie.lefebvre@email.com",
    telephone: "06 78 90 12 34",
    optin_email: true,
    optin_sms: true,
    persona_detecte: "Léa",
    score_persona: 79,
    score_confiance_ia: 82,
    offre_recommandee: "Gamme bio certifiée",
    conversion: false,
    panier: null,
    chemin_questions: ["Type de peau", "Moment grossesse", "Concernes principaux", "Routine actuelle", "Préférences ingrédients"],
    abandon_etape: null,
    duree: 298,
    tags_comportementaux: ["exigeante bio", "recherche qualité"],
    engagement: "moyen",
    age: 33,
    statut_maternite: "Post-partum",
    type_peau_declare: "Mixte",
    budget_skincare: "+60€",
    frequence_utilisation: "Hebdomadaire",
    allergies: "Huiles essentielles, Parfums",
    objectif_principal: "Réparer après-grossesse",
    symptome_dominant: "Relâchement cutané",
    intensite_besoin: 4,
    declencheur_principal: "Post-accouchement",
    zone_prioritaire: "Ventre, Jambes",
    routine_detaillee: "Huile argan bio 1×/jour",
    produits_incompatibles: "Rétinoïdes, Actifs photosensibilisants",
    niveau_urgence: "Moyen",
    messages_cles_ia: ["exigeante", "recherche qualité bio"],
  },
  {
    session_id: "G12RT55",
    date: "2024-12-07",
    heure: "10:18",
    statut: "terminé",
    source: "ads",
    prenom: "Camille",
    nom: "Roux",
    email: "camille.roux@gmail.com",
    telephone: "07 12 34 56 78",
    optin_email: true,
    optin_sms: true,
    persona_detecte: "Emma",
    score_persona: 95,
    score_confiance_ia: 97,
    offre_recommandee: "Pack complet grossesse",
    conversion: true,
    panier: 189,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Budget", "Allergies", "Routine actuelle"],
    abandon_etape: null,
    duree: 312,
    tags_comportementaux: ["besoin d'accompagnement", "sensibilité grossesse", "prête à investir"],
    engagement: "élevé",
    age: 29,
    statut_maternite: "1er trimestre",
    type_peau_declare: "Sèche",
    budget_skincare: "+60€",
    frequence_utilisation: "Quotidienne",
    allergies: null,
    objectif_principal: "Limiter les vergetures",
    symptome_dominant: "Vergetures naissantes",
    intensite_besoin: 5,
    declencheur_principal: "Croissance rapide du ventre",
    zone_prioritaire: "Ventre, Poitrine, Hanches",
    routine_detaillee: "Crème corps + huile 2×/jour",
    produits_incompatibles: "Rétinoïdes",
    niveau_urgence: "Élevé",
    messages_cles_ia: ["inquiétude vergetures", "prête à investir", "besoin accompagnement"],
  },
  {
    session_id: "H44WX88",
    date: "2024-12-07",
    heure: "14:55",
    statut: "abandonné",
    source: "email",
    prenom: "Isabelle",
    nom: "Garcia",
    email: "isabelle.g@hotmail.com",
    telephone: "",
    optin_email: true,
    optin_sms: false,
    persona_detecte: "Sophie",
    score_persona: 61,
    score_confiance_ia: 55,
    offre_recommandee: "—",
    conversion: false,
    panier: null,
    chemin_questions: ["Type de peau", "Moment grossesse", "Concernes principaux"],
    abandon_etape: "Concernes principaux",
    duree: 78,
    tags_comportementaux: ["indécision", "sensibilité post-partum"],
    engagement: "faible",
    age: 36,
    statut_maternite: "Post-partum",
    type_peau_declare: "Normale",
    budget_skincare: "<30€",
    frequence_utilisation: "Occasionnelle",
    allergies: null,
    objectif_principal: null,
    symptome_dominant: "Relâchement cutané",
    intensite_besoin: 3,
    declencheur_principal: "Post-accouchement",
    zone_prioritaire: "Ventre",
    routine_detaillee: null,
    produits_incompatibles: null,
    niveau_urgence: "Faible",
    messages_cles_ia: ["indécision", "budget limité"],
  },
  {
    session_id: "I99ZY12",
    date: "2024-12-06",
    heure: "08:30",
    statut: "terminé",
    source: "social",
    prenom: "Nathalie",
    nom: "Simon",
    email: "nathalie.simon@email.fr",
    telephone: "06 23 45 67 89",
    optin_email: true,
    optin_sms: true,
    persona_detecte: "Léa",
    score_persona: 86,
    score_confiance_ia: 89,
    offre_recommandee: "Routine naturelle",
    conversion: true,
    panier: 156,
    chemin_questions: ["Type de peau", "Préférences ingrédients", "Concernes principaux", "Budget", "Certification recherchée"],
    abandon_etape: null,
    duree: 267,
    tags_comportementaux: ["exigeante bio", "recherche qualité", "fidélité marque"],
    engagement: "élevé",
    age: 32,
    statut_maternite: "3ème trimestre",
    type_peau_declare: "Sensible",
    budget_skincare: "+60€",
    frequence_utilisation: "Quotidienne",
    allergies: "Huiles essentielles, Parabènes",
    objectif_principal: "Hydrater intensément",
    symptome_dominant: "Démangeaisons",
    intensite_besoin: 4,
    declencheur_principal: "Changements hormonaux",
    zone_prioritaire: "Corps entier",
    routine_detaillee: "Gamme bio complète",
    produits_incompatibles: "Huiles essentielles, Actifs photosensibilisants",
    niveau_urgence: "Moyen",
    messages_cles_ia: ["exigeante bio", "sécurité bébé prioritaire"],
  },
  {
    session_id: "J55AB34",
    date: "2024-12-06",
    heure: "19:22",
    statut: "terminé",
    source: "direct",
    prenom: "Aurélie",
    nom: "Thomas",
    email: "aurelie.t@gmail.com",
    telephone: "",
    optin_email: true,
    optin_sms: false,
    persona_detecte: "Emma",
    score_persona: 73,
    score_confiance_ia: 76,
    offre_recommandee: "Duo hydratation",
    conversion: false,
    panier: null,
    chemin_questions: ["Type de peau", "Moment grossesse", "Objectif", "Routine actuelle"],
    abandon_etape: null,
    duree: 145,
    tags_comportementaux: ["budget limité", "première grossesse"],
    engagement: "moyen",
    age: 26,
    statut_maternite: "3ème trimestre",
    type_peau_declare: "Mixte",
    budget_skincare: "<30€",
    frequence_utilisation: "Hebdomadaire",
    allergies: null,
    objectif_principal: "Hydrater intensément",
    symptome_dominant: "Tiraillements",
    intensite_besoin: 3,
    declencheur_principal: "Croissance rapide du ventre",
    zone_prioritaire: "Ventre",
    routine_detaillee: "Aucun soin",
    produits_incompatibles: null,
    niveau_urgence: "Moyen",
    messages_cles_ia: ["première grossesse", "budget limité", "manque confiance"],
  },
  {
    session_id: "K88CD56",
    date: "2024-12-05",
    heure: "12:10",
    statut: "terminé",
    source: "ads",
    prenom: "Pauline",
    nom: "Leroy",
    email: "pauline.leroy@email.com",
    telephone: "07 65 43 21 09",
    optin_email: true,
    optin_sms: true,
    persona_detecte: "Sophie",
    score_persona: 84,
    score_confiance_ia: 88,
    offre_recommandee: "Pack cicatrices",
    conversion: true,
    panier: 112,
    chemin_questions: ["Type de peau", "Moment grossesse", "Préoccupations", "Objectif", "Budget"],
    abandon_etape: null,
    duree: 203,
    tags_comportementaux: ["sensibilité post-partum", "prête à investir"],
    engagement: "élevé",
    age: 30,
    statut_maternite: "Allaitement",
    type_peau_declare: "Normale",
    budget_skincare: "30–60€",
    frequence_utilisation: "Quotidienne",
    allergies: "Huiles essentielles",
    objectif_principal: "Réparer après-grossesse",
    symptome_dominant: "Cicatrices césarienne",
    intensite_besoin: 5,
    declencheur_principal: "Post-accouchement",
    zone_prioritaire: "Ventre",
    routine_detaillee: "Crème cicatrisante 1×/jour",
    produits_incompatibles: "Huiles essentielles",
    niveau_urgence: "Élevé",
    messages_cles_ia: ["urgence cicatrisation", "sécurité allaitement"],
  },
  {
    session_id: "L22EF78",
    date: "2024-12-04",
    heure: "16:45",
    statut: "abandonné",
    source: "social",
    prenom: "Céline",
    nom: "Mercier",
    email: "",
    telephone: "06 87 65 43 21",
    optin_email: false,
    optin_sms: true,
    persona_detecte: "Emma",
    score_persona: 58,
    score_confiance_ia: 52,
    offre_recommandee: "—",
    conversion: false,
    panier: null,
    chemin_questions: ["Type de peau", "Moment grossesse"],
    abandon_etape: "Moment grossesse",
    duree: 34,
    tags_comportementaux: ["curiosité", "temps limité"],
    engagement: "faible",
    age: 25,
    statut_maternite: "1er trimestre",
    type_peau_declare: "Grasse",
    budget_skincare: null,
    frequence_utilisation: null,
    allergies: null,
    objectif_principal: null,
    symptome_dominant: null,
    intensite_besoin: null,
    declencheur_principal: null,
    zone_prioritaire: null,
    routine_detaillee: null,
    produits_incompatibles: null,
    niveau_urgence: null,
    messages_cles_ia: [],
  },
];

// Column groups definition
const columnGroups = [
  {
    title: "Identification & Tracking",
    color: "text-foreground",
    columns: [
      { key: "session_id", label: "Session ID" },
      { key: "date", label: "Date" },
      { key: "heure", label: "Heure" },
      { key: "statut", label: "Statut" },
      { key: "source", label: "Source" },
      { key: "prenom", label: "Prénom" },
      { key: "nom", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "telephone", label: "Téléphone" },
      { key: "optin_email", label: "Opt-in Email" },
      { key: "optin_sms", label: "Opt-in SMS" },
    ],
  },
  {
    title: "Personas & IA",
    color: "text-violet-600",
    columns: [
      { key: "persona_detecte", label: "Persona détecté" },
      { key: "score_persona", label: "Score persona (%)" },
      { key: "score_confiance_ia", label: "Confiance IA (%)" },
    ],
  },
  {
    title: "Business & Conversion",
    color: "text-emerald-600",
    columns: [
      { key: "offre_recommandee", label: "Offre recommandée" },
      { key: "conversion", label: "Conversion" },
      { key: "panier", label: "Panier (€)" },
    ],
  },
  {
    title: "Comportement",
    color: "text-amber-600",
    columns: [
      { key: "chemin_questions", label: "Chemin questions" },
      { key: "abandon_etape", label: "Abandon à l'étape" },
      { key: "duree", label: "Durée (sec)" },
      { key: "tags_comportementaux", label: "Tags comportementaux" },
      { key: "engagement", label: "Engagement" },
    ],
  },
  {
    title: "Questions statiques",
    color: "text-blue-600",
    columns: [
      { key: "age", label: "Âge" },
      { key: "statut_maternite", label: "Statut maternité" },
      { key: "type_peau_declare", label: "Type de peau déclaré" },
      { key: "budget_skincare", label: "Budget skincare" },
      { key: "frequence_utilisation", label: "Fréquence utilisation" },
      { key: "allergies", label: "Allergies / À éviter" },
      { key: "objectif_principal", label: "Objectif principal" },
    ],
  },
  {
    title: "Questions dynamiques",
    color: "text-primary",
    columns: [
      { key: "symptome_dominant", label: "Symptôme dominant" },
      { key: "intensite_besoin", label: "Intensité besoin (1-5)" },
      { key: "declencheur_principal", label: "Déclencheur principal" },
      { key: "zone_prioritaire", label: "Zone prioritaire" },
      { key: "routine_detaillee", label: "Routine actuelle détaillée" },
      { key: "produits_incompatibles", label: "Produits incompatibles" },
      { key: "niveau_urgence", label: "Niveau urgence" },
      { key: "messages_cles_ia", label: "Messages clés IA" },
    ],
  },
];

// Flatten columns for export
const allColumns = columnGroups.flatMap((group) => group.columns);

type DateFilterType = "today" | "7days" | "30days" | "thisMonth" | "custom";

export function ResponsesSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [personaFilter, setPersonaFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("30days");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const today = new Date();

  const getDateRange = useMemo(() => {
    switch (dateFilter) {
      case "today":
        return { start: today, end: today };
      case "7days":
        return { start: subDays(today, 7), end: today };
      case "30days":
        return { start: subDays(today, 30), end: today };
      case "thisMonth":
        return { start: startOfMonth(today), end: today };
      case "custom":
        return customDateRange?.from && customDateRange?.to
          ? { start: customDateRange.from, end: customDateRange.to }
          : { start: subDays(today, 30), end: today };
      default:
        return { start: subDays(today, 30), end: today };
    }
  }, [dateFilter, customDateRange, today]);

  const filteredResponses = useMemo(() => {
    return mockResponses.filter((response) => {
      const matchesSearch =
        response.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.persona_detecte.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || response.statut === statusFilter;
      const matchesPersona = personaFilter === "all" || response.persona_detecte === personaFilter;
      
      // Date filtering
      const responseDate = parseISO(response.date);
      const matchesDate =
        (isAfter(responseDate, getDateRange.start) || isEqual(responseDate, getDateRange.start)) &&
        (isBefore(responseDate, getDateRange.end) || isEqual(responseDate, getDateRange.end));

      return matchesSearch && matchesStatus && matchesPersona && matchesDate;
    });
  }, [searchTerm, statusFilter, personaFilter, getDateRange]);

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

  const getPersonaBadge = (persona: string) => {
    const colors: Record<string, string> = {
      Emma: "bg-pink-100 text-pink-700 border-pink-200",
      Sophie: "bg-violet-100 text-violet-700 border-violet-200",
      Léa: "bg-teal-100 text-teal-700 border-teal-200",
    };
    return (
      <Badge className={colors[persona] || "bg-muted text-muted-foreground"}>
        {persona}
      </Badge>
    );
  };

  const getEngagementBadge = (engagement: string) => {
    switch (engagement) {
      case "élevé":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Élevé</Badge>;
      case "moyen":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Moyen</Badge>;
      case "faible":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Faible</Badge>;
      default:
        return <Badge variant="outline">{engagement}</Badge>;
    }
  };

  const getUrgencyBadge = (niveau: string | null) => {
    if (!niveau) return <span className="text-muted-foreground/50">—</span>;
    switch (niveau.toLowerCase()) {
      case "élevé":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Élevé</Badge>;
      case "moyen":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Moyen</Badge>;
      case "faible":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Faible</Badge>;
      default:
        return <Badge variant="outline">{niveau}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 font-semibold";
    if (score >= 60) return "text-amber-600 font-medium";
    return "text-red-500";
  };

  const getIntensityDisplay = (value: number | null) => {
    if (value === null) return <span className="text-muted-foreground/50">—</span>;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i <= value ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
          )}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
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
      case "prenom":
      case "nom":
        return <span className="text-sm">{value as string || "—"}</span>;
      case "email":
        return value ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help max-w-[120px]">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate">{value as string}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{value as string}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      case "telephone":
        return value ? (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs">{value as string}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      case "optin_email":
      case "optin_sms":
        return value ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Oui</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Non</Badge>
        );
      case "persona_detecte":
        return getPersonaBadge(value as string);
      case "score_persona":
      case "score_confiance_ia":
        return (
          <span className={getScoreColor(value as number)}>
            {value}%
          </span>
        );
      case "offre_recommandee":
        return value && value !== "—" ? (
          <span className="text-sm">{value as string}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      case "conversion":
        return value ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Oui</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Non</Badge>
        );
      case "panier":
        return value !== null ? (
          <span className="font-medium">{value} €</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      case "chemin_questions":
        const questions = value as string[];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Route className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs">{questions.length} étapes</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] p-3">
                <p className="font-semibold text-sm mb-2">Parcours :</p>
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
      case "duree":
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
      case "engagement":
        return getEngagementBadge(value as string);
      case "age":
        return value !== null ? (
          <span className="text-sm font-medium">{value} ans</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      case "intensite_besoin":
        return getIntensityDisplay(value as number | null);
      case "niveau_urgence":
        return getUrgencyBadge(value as string | null);
      case "messages_cles_ia":
        const messages = value as string[];
        if (!messages || messages.length === 0) return <span className="text-muted-foreground/50">—</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs">{messages.length} messages</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] p-3">
                <div className="flex flex-wrap gap-1.5">
                  {messages.map((msg, i) => (
                    <Badge key={i} className="text-xs bg-primary/10 text-primary border-primary/20">
                      {msg}
                    </Badge>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return value !== undefined && value !== null ? (
          <span className="text-sm">{String(value)}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
    }
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Aujourd'hui";
      case "7days":
        return "7 derniers jours";
      case "30days":
        return "30 derniers jours";
      case "thisMonth":
        return "Ce mois-ci";
      case "custom":
        if (customDateRange?.from && customDateRange?.to) {
          return `${format(customDateRange.from, "dd/MM/yyyy")} - ${format(customDateRange.to, "dd/MM/yyyy")}`;
        }
        return "Période personnalisée";
      default:
        return "Sélectionner";
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
              Réponses / Résultats du Diagnostic
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

        {/* Date Filter */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border/30">
          <Button
            variant={dateFilter === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("today")}
          >
            Aujourd'hui
          </Button>
          <Button
            variant={dateFilter === "7days" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("7days")}
          >
            7 derniers jours
          </Button>
          <Button
            variant={dateFilter === "30days" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("30days")}
          >
            30 jours
          </Button>
          <Button
            variant={dateFilter === "thisMonth" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("thisMonth")}
          >
            Ce mois-ci
          </Button>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === "custom" ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                {dateFilter === "custom" && customDateRange?.from && customDateRange?.to
                  ? `${format(customDateRange.from, "dd/MM")} - ${format(customDateRange.to, "dd/MM")}`
                  : "Période personnalisée"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={customDateRange}
                onSelect={(range) => {
                  setCustomDateRange(range);
                  if (range?.from && range?.to) {
                    setDateFilter("custom");
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(date) => isAfter(date, today)}
                locale={fr}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par session, nom, email ou persona..."
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

      {/* Column Groups Legend */}
      <div className="flex flex-wrap gap-4 px-2">
        {columnGroups.map((group) => (
          <div key={group.title} className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              group.color === "text-foreground" ? "bg-foreground" :
              group.color === "text-violet-600" ? "bg-violet-500" :
              group.color === "text-emerald-600" ? "bg-emerald-500" :
              group.color === "text-amber-600" ? "bg-amber-500" :
              group.color === "text-blue-600" ? "bg-blue-500" :
              "bg-primary"
            )} />
            <span className="text-xs text-muted-foreground">{group.title}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-md overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[4000px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {columnGroups.map((group) =>
                    group.columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`font-semibold whitespace-nowrap ${group.color}`}
                      >
                        {col.label}
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response, index) => (
                  <TableRow
                    key={response.session_id}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}
                  >
                    {columnGroups.map((group) =>
                      group.columns.map((col) => (
                        <TableCell key={col.key}>
                          {renderCellContent(response, col.key)}
                        </TableCell>
                      ))
                    )}
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
          <span className="font-medium text-foreground">Légende :</span> Les colonnes sont organisées par catégorie (voir légende ci-dessus).
          Survolez les éléments avec <span className="underline decoration-dotted">soulignement pointillé</span> pour voir plus de détails.
          Les cellules vides (—) indiquent une donnée non renseignée.
        </p>
      </div>
    </motion.div>
  );
}
