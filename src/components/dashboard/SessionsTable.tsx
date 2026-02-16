import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiagnosticSession, DiagnosticChild, CategoryKey } from "@/types/diagnostic";
import {
  CATEGORIES,
  STATUS_LABELS,
  RELATIONSHIP_LABELS,
  getSortedChildren,
  getExtraChildrenSummary,
  getExtraChildrenDynamic,
} from "@/types/diagnostic";

/* ── Display status helper ──────────────────────────────── */

export function getDisplayStatus(s: DiagnosticSession): string {
  if (s.status === "en_cours" && s.created_at) {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    return new Date(s.created_at).getTime() < twoHoursAgo ? "Abandonné" : "En cours";
  }
  return STATUS_LABELS[s.status] ?? s.status ?? "—";
}

/* ── Column definition ─────────────────────────────────── */

export interface ColumnDef {
  key: string;
  label: string;
  category: CategoryKey;
  getValue: (s: DiagnosticSession) => string;
}

const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓" : "—";
  return String(v);
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
};

const fmtEuro = (v: number | null) => {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)} €`;
};

/* ── Base columns ──────────────────────────────────────── */

const IDENTIFICATION_COLS: ColumnDef[] = [
  { key: "session_code", label: "Session ID", category: "identification", getValue: (s) => s.session_code },
  { key: "date", label: "Date", category: "identification", getValue: (s) => fmtDate(s.created_at) },
  { key: "heure", label: "Heure", category: "identification", getValue: (s) => fmtTime(s.created_at) },
  { key: "status", label: "Statut", category: "identification", getValue: (s) => getDisplayStatus(s) },
  { key: "source", label: "Source", category: "identification", getValue: (s) => fmt(s.source) },
  { key: "utm_campaign", label: "UTM Campaign", category: "identification", getValue: (s) => fmt(s.utm_campaign) },
  { key: "device", label: "Device", category: "identification", getValue: (s) => fmt(s.device) },
  { key: "user_name", label: "Prénom parent", category: "identification", getValue: (s) => fmt(s.user_name) },
  { key: "relationship", label: "Lien avec l'enfant", category: "identification", getValue: (s) => RELATIONSHIP_LABELS[s.relationship ?? ""] ?? fmt(s.relationship) },
  { key: "email", label: "Email", category: "identification", getValue: (s) => fmt(s.email) },
  { key: "phone", label: "Téléphone", category: "identification", getValue: (s) => fmt(s.phone) },
  { key: "optin_email", label: "Opt-in Email", category: "identification", getValue: (s) => fmt(s.optin_email) },
  { key: "optin_sms", label: "Opt-in SMS", category: "identification", getValue: (s) => fmt(s.optin_sms) },
  { key: "nb_children", label: "Nombre d'enfants", category: "identification", getValue: (s) => fmt(s.number_of_children) },
  { key: "locale", label: "Langue/Pays", category: "identification", getValue: (s) => fmt(s.locale) },
  { key: "result_url", label: "Result URL", category: "identification", getValue: (s) => fmt(s.result_url) },
];

const PERSONA_COLS: ColumnDef[] = [
  { key: "persona_detected", label: "Persona détecté", category: "persona", getValue: (s) => fmt(s.persona_detected) },
  { key: "persona_score", label: "Matching score (%)", category: "persona", getValue: (s) => s.persona_matching_score != null ? `${s.persona_matching_score}%` : "—" },
  { key: "adapted_tone", label: "Tone adapté", category: "persona", getValue: (s) => fmt(s.adapted_tone) },
  { key: "ai_key_messages", label: "Messages clés IA", category: "persona", getValue: (s) => fmt(s.ai_key_messages) },
  { key: "ai_segment", label: "Suggestion IA — Segment", category: "persona", getValue: (s) => fmt(s.ai_suggested_segment) },
];

const BUSINESS_COLS: ColumnDef[] = [
  { key: "conversion", label: "Conversion", category: "business", getValue: (s) => s.conversion ? "Oui" : "Non" },
  { key: "exit_type", label: "Type de sortie", category: "business", getValue: (s) => fmt(s.exit_type) },
  { key: "existing_products", label: "Produits Ouate utilisés", category: "business", getValue: (s) => fmt(s.existing_ouate_products) },
  { key: "is_existing_client", label: "Client existant", category: "business", getValue: (s) => s.is_existing_client ? "Oui" : "Non" },
  { key: "recommended_products", label: "Routine recommandée", category: "business", getValue: (s) => fmt(s.recommended_products) },
  { key: "recommended_cart", label: "Panier recommandé (€)", category: "business", getValue: (s) => fmtEuro(s.recommended_cart_amount) },
  { key: "validated_products", label: "Produits achetés", category: "business", getValue: (s) => fmt(s.validated_products) },
  { key: "validated_cart", label: "Panier validé (€)", category: "business", getValue: (s) => fmtEuro(s.validated_cart_amount) },
  { key: "upsell_potential", label: "Potentiel upsell", category: "business", getValue: (s) => fmt(s.upsell_potential) },
];

const COMPORTEMENT_COLS: ColumnDef[] = [
  { key: "duration", label: "Durée (sec)", category: "comportement", getValue: (s) => fmt(s.duration_seconds) },
  { key: "abandoned_step", label: "Abandon à l'étape", category: "comportement", getValue: (s) => fmt(s.abandoned_at_step) },
  { key: "question_path", label: "Chemin questions", category: "comportement", getValue: (s) => fmt(s.question_path) },
  { key: "back_nav", label: "Retours en arrière", category: "comportement", getValue: (s) => fmt(s.back_navigation_count) },
  { key: "optional_details", label: "Détails optionnels", category: "comportement", getValue: (s) => fmt(s.has_optional_details) },
  { key: "behavior_tags", label: "Tags comportementaux", category: "comportement", getValue: (s) => fmt(s.behavior_tags) },
  { key: "engagement_score", label: "Score engagement (%)", category: "comportement", getValue: (s) => s.engagement_score != null ? `${s.engagement_score}%` : "—" },
];

/* ── Child column generators ───────────────────────────── */

function childStaticCols(index: number): ColumnDef[] {
  const label = `Enfant ${index + 1}`;
  const getChild = (s: DiagnosticSession): DiagnosticChild | undefined =>
    getSortedChildren(s)[index];

  return [
    { key: `c${index}_name`, label: `${label} — Prénom`, category: "statiques", getValue: (s) => fmt(getChild(s)?.first_name) },
    { key: `c${index}_birth`, label: `${label} — Date naiss.`, category: "statiques", getValue: (s) => fmt(getChild(s)?.birth_date) },
    { key: `c${index}_age`, label: `${label} — Âge`, category: "statiques", getValue: (s) => getChild(s)?.age != null ? `${getChild(s)!.age} ans` : "—" },
    { key: `c${index}_range`, label: `${label} — Tranche`, category: "statiques", getValue: (s) => fmt(getChild(s)?.age_range) },
    { key: `c${index}_skin`, label: `${label} — Peau`, category: "statiques", getValue: (s) => fmt(getChild(s)?.skin_concern) },
    { key: `c${index}_routine`, label: `${label} — A une routine`, category: "statiques", getValue: (s) => fmt(getChild(s)?.has_routine) },
    { key: `c${index}_satisfaction`, label: `${label} — Satisfaction`, category: "statiques", getValue: (s) => fmt(getChild(s)?.routine_satisfaction) },
    { key: `c${index}_issue`, label: `${label} — Problème`, category: "statiques", getValue: (s) => fmt(getChild(s)?.routine_issue) },
    { key: `c${index}_issue_detail`, label: `${label} — Détail problème`, category: "statiques", getValue: (s) => fmt(getChild(s)?.routine_issue_details) },
    { key: `c${index}_has_ouate`, label: `${label} — Utilise Ouate`, category: "statiques", getValue: (s) => fmt(getChild(s)?.has_ouate_products) },
    { key: `c${index}_ouate_products`, label: `${label} — Produits Ouate`, category: "statiques", getValue: (s) => fmt(getChild(s)?.ouate_products) },
    { key: `c${index}_routine_desc`, label: `${label} — Routine décrite`, category: "statiques", getValue: (s) => fmt(getChild(s)?.existing_routine_description) },
    { key: `c${index}_reactivity`, label: `${label} — Réactivité`, category: "statiques", getValue: (s) => fmt(getChild(s)?.skin_reactivity) },
    { key: `c${index}_react_detail`, label: `${label} — Détail réactivité`, category: "statiques", getValue: (s) => fmt(getChild(s)?.reactivity_details) },
    { key: `c${index}_fragrance`, label: `${label} — Exclure parfum`, category: "statiques", getValue: (s) => fmt(getChild(s)?.exclude_fragrance) },
  ];
}

function childDynamicCols(index: number): ColumnDef[] {
  const label = `Enfant ${index + 1}`;
  const getChild = (s: DiagnosticSession): DiagnosticChild | undefined =>
    getSortedChildren(s)[index];

  return [
    { key: `c${index}_dq1`, label: `${label} — Q IA 1`, category: "dynamiques", getValue: (s) => fmt(getChild(s)?.dynamic_question_1) },
    { key: `c${index}_da1`, label: `${label} — R IA 1`, category: "dynamiques", getValue: (s) => fmt(getChild(s)?.dynamic_answer_1) },
    { key: `c${index}_dq2`, label: `${label} — Q IA 2`, category: "dynamiques", getValue: (s) => fmt(getChild(s)?.dynamic_question_2) },
    { key: `c${index}_da2`, label: `${label} — R IA 2`, category: "dynamiques", getValue: (s) => fmt(getChild(s)?.dynamic_answer_2) },
    { key: `c${index}_dq3`, label: `${label} — Q IA 3`, category: "dynamiques", getValue: (s) => fmt(getChild(s)?.dynamic_question_3) },
    { key: `c${index}_da3`, label: `${label} — R IA 3`, category: "dynamiques", getValue: (s) => fmt(getChild(s)?.dynamic_answer_3) },
    { key: `c${index}_insights`, label: `${label} — Insight targets`, category: "dynamiques", getValue: (s) => fmt(getChild(s)?.dynamic_insight_targets) },
  ];
}

/* ── Build all columns ─────────────────────────────────── */

function buildAllColumns(): ColumnDef[] {
  const cols: ColumnDef[] = [
    ...IDENTIFICATION_COLS,
    ...PERSONA_COLS,
    ...BUSINESS_COLS,
    ...COMPORTEMENT_COLS,
  ];

  // Static child columns (1-4)
  for (let i = 0; i < 4; i++) {
    cols.push(...childStaticCols(i));
  }

  // Global static questions
  cols.push(
    { key: "routine_pref", label: "Routine souhaitée", category: "statiques", getValue: (s) => fmt(s.routine_size_preference) },
    { key: "priorities", label: "Priorités (ordonnées)", category: "statiques", getValue: (s) => fmt(s.priorities_ordered) },
    { key: "trust_triggers", label: "Éléments de réassurance", category: "statiques", getValue: (s) => fmt(s.trust_triggers_ordered) },
    { key: "content_pref", label: "Format contenu préféré", category: "statiques", getValue: (s) => fmt(s.content_format_preference) },
  );

  // Extra children (5+) summary
  cols.push({
    key: "extra_children",
    label: "Enfants supplémentaires (5+)",
    category: "statiques",
    getValue: getExtraChildrenSummary,
  });

  // Dynamic child columns (1-4)
  for (let i = 0; i < 4; i++) {
    cols.push(...childDynamicCols(i));
  }

  // Extra children dynamic
  cols.push({
    key: "extra_children_dynamic",
    label: "Enfants 5+ — Réponses IA",
    category: "dynamiques",
    getValue: getExtraChildrenDynamic,
  });

  return cols;
}

/* ── Compute category spans for the grouped header row ── */

function getCategorySpans(columns: ColumnDef[]) {
  const spans: Array<{ category: CategoryKey; count: number }> = [];
  let current: CategoryKey | null = null;

  for (const col of columns) {
    if (col.category !== current) {
      spans.push({ category: col.category, count: 1 });
      current = col.category;
    } else {
      spans[spans.length - 1].count++;
    }
  }
  return spans;
}

const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

/* ── Component ─────────────────────────────────────────── */

interface SessionsTableProps {
  sessions: DiagnosticSession[];
  searchTerm?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  statusFilter?: string;
  conversionFilter?: string;
}

type SortKey = "date" | "recommended_cart" | "validated_cart";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export function SessionsTable({ sessions, searchTerm, dateFrom, dateTo, statusFilter, conversionFilter }: SessionsTableProps) {
  const columns = useMemo(buildAllColumns, []);
  const spans = useMemo(() => getCategorySpans(columns), [columns]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let result = sessions;

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      result = result.filter((s) => getDisplayStatus(s) === statusFilter);
    }

    // Conversion filter
    if (conversionFilter && conversionFilter !== "all") {
      const val = conversionFilter === "oui";
      result = result.filter((s) => s.conversion === val);
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.session_code?.toLowerCase().includes(q) ||
          s.user_name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.persona_detected?.toLowerCase().includes(q)
      );
    }

    // Date range filter (using Europe/Paris timezone)
    if (dateFrom) {
      result = result.filter((s) => {
        if (!s.created_at) return false;
        const sessionDate = new Date(s.created_at);
        const parisDate = new Date(sessionDate.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
        const fromStart = new Date(dateFrom);
        fromStart.setHours(0, 0, 0, 0);
        return parisDate >= fromStart;
      });
    }
    if (dateTo) {
      result = result.filter((s) => {
        if (!s.created_at) return false;
        const sessionDate = new Date(s.created_at);
        const parisDate = new Date(sessionDate.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        return parisDate <= toEnd;
      });
    }

    // Sorting
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      } else if (sortKey === "recommended_cart") {
        cmp = (a.recommended_cart_amount ?? 0) - (b.recommended_cart_amount ?? 0);
      } else if (sortKey === "validated_cart") {
        cmp = (a.validated_cart_amount ?? 0) - (b.validated_cart_amount ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [sessions, searchTerm, dateFrom, dateTo, statusFilter, conversionFilter, sortKey, sortDir]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, pageSize, statusFilter, conversionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedSessions = filtered.slice(startIndex, endIndex);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="w-full whitespace-nowrap rounded-lg border border-border">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              {/* Category band row */}
              <TableRow className="border-b-0">
                {spans.map((span, i) => {
                  const cat = categoryMap[span.category];
                  return (
                    <TableHead
                      key={`cat-${i}`}
                      colSpan={span.count}
                      className="text-center text-xs font-bold py-2 border-x border-border/30"
                      style={{ backgroundColor: cat?.color ?? "#f5f5f5" }}
                    >
                      {cat?.label ?? span.category}
                    </TableHead>
                  );
                })}
              </TableRow>

              {/* Column headers row */}
              <TableRow>
                {columns.map((col) => {
                  const cat = categoryMap[col.category];
                  const sortableMap: Record<string, SortKey> = {
                    date: "date",
                    recommended_cart: "recommended_cart",
                    validated_cart: "validated_cart",
                  };
                  const sk = sortableMap[col.key];
                  const isSortable = !!sk;
                  const isActive = sk === sortKey;
                  return (
                    <TableHead
                      key={col.key}
                      className={`text-xs font-medium px-3 py-2 min-w-[120px] border-x border-border/20 ${isSortable ? "cursor-pointer select-none hover:opacity-80" : ""}`}
                      style={{ backgroundColor: `${cat?.color ?? "#f5f5f5"}80` }}
                      onClick={isSortable ? () => handleSort(sk) : undefined}
                    >
                      {col.label}
                      {isSortable && (
                        <span className="ml-1 opacity-40">
                          {isActive ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedSessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Aucune session trouvée
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className="px-3 py-2 text-xs max-w-[250px] truncate"
                        title={col.getValue(session)}
                      >
                        {col.getValue(session)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Lignes par page :</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[70px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-2">
            Affichage {filtered.length === 0 ? 0 : startIndex + 1}–{endIndex} sur {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            className="h-8 px-3 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Précédent
          </Button>

          {getPageNumbers().map((page, i) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-xs">…</span>
            ) : (
              <Button
                key={page}
                variant={page === safeCurrentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="h-8 w-8 p-0 text-xs"
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="h-8 px-3 text-xs"
          >
            Suivant
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Export helpers (used by ResponsesSection) ─────────── */

export function getColumnDefs() {
  return buildAllColumns();
}
