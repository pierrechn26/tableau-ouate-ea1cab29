export interface DiagnosticChild {
  child_index: number;
  first_name: string | null;
  birth_date: string | null;
  age: number | null;
  age_range: string | null;
  skin_concern: string | null;
  has_routine: boolean | null;
  routine_satisfaction: number | null;
  routine_issue: string | null;
  routine_issue_details: string | null;
  has_ouate_products: boolean | null;
  ouate_products: string | null;
  existing_routine_description: string | null;
  skin_reactivity: string | null;
  reactivity_details: string | null;
  exclude_fragrance: boolean | null;
  dynamic_question_1: string | null;
  dynamic_answer_1: string | null;
  dynamic_question_2: string | null;
  dynamic_answer_2: string | null;
  dynamic_question_3: string | null;
  dynamic_answer_3: string | null;
  dynamic_insight_targets: string | null;
}

export interface DiagnosticSession {
  id: string;
  session_code: string;
  created_at: string;
  status: string;
  source: string | null;
  utm_campaign: string | null;
  device: string | null;
  user_name: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  optin_email: boolean;
  optin_sms: boolean;
  number_of_children: number | null;
  locale: string | null;
  result_url: string | null;
  persona_detected: string | null;
  persona_matching_score: number | null;
  adapted_tone: string | null;
  ai_key_messages: string | null;
  ai_suggested_segment: string | null;
  conversion: boolean;
  exit_type: string | null;
  existing_ouate_products: string | null;
  is_existing_client: boolean;
  recommended_products: string | null;
  recommended_cart_amount: number | null;
  validated_products: string | null;
  validated_cart_amount: number | null;
  upsell_potential: string | null;
  duration_seconds: number | null;
  abandoned_at_step: string | null;
  question_path: string | null;
  back_navigation_count: number;
  has_optional_details: boolean;
  behavior_tags: string | null;
  engagement_score: number | null;
  routine_size_preference: string | null;
  priorities_ordered: string | null;
  trust_triggers_ordered: string | null;
  content_format_preference: string | null;
  persona_code: string | null;
  matching_score: number | null;
  children: DiagnosticChild[];
  _source: "new" | "legacy";
}

export type CategoryKey =
  | "identification"
  | "persona"
  | "business"
  | "comportement"
  | "statiques"
  | "dynamiques";

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  color: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: "identification", label: "Identification & Tracking", color: "#E8E8E8" },
  { key: "persona", label: "Personas & IA", color: "#EDE0F0" },
  { key: "business", label: "Business & Conversion", color: "#D5F5E3" },
  { key: "comportement", label: "Comportement", color: "#FEF3C7" },
  { key: "statiques", label: "Questions statiques", color: "#DBEAFE" },
  { key: "dynamiques", label: "Questions dynamiques IA", color: "#FEE2E2" },
];

export const STATUS_LABELS: Record<string, string> = {
  en_cours: "En cours",
  termine: "Terminé",
  abandonne: "Abandonné",
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  parent_mama: "Maman",
  parent_papa: "Papa",
  beau_parent: "Beau-parent",
  grand_parent: "Grand-parent",
  autre: "Autre",
};

export function getSortedChildren(session: DiagnosticSession): DiagnosticChild[] {
  if (!session.children?.length) return [];
  return [...session.children].sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
}

export function getExtraChildrenSummary(session: DiagnosticSession): string {
  const sorted = getSortedChildren(session);
  if (sorted.length <= 4) return "—";
  return sorted
    .slice(4)
    .map((c) =>
      [c.first_name, c.age != null ? `${c.age} ans` : null, c.skin_concern]
        .filter(Boolean)
        .join(", ")
    )
    .join(" | ");
}

export function getExtraChildrenDynamic(session: DiagnosticSession): string {
  const sorted = getSortedChildren(session);
  if (sorted.length <= 4) return "—";
  return sorted
    .slice(4)
    .map((c) => {
      const parts: string[] = [];
      if (c.first_name) parts.push(c.first_name);
      if (c.dynamic_answer_1) parts.push(`R1: ${c.dynamic_answer_1}`);
      if (c.dynamic_answer_2) parts.push(`R2: ${c.dynamic_answer_2}`);
      if (c.dynamic_answer_3) parts.push(`R3: ${c.dynamic_answer_3}`);
      return parts.join(", ");
    })
    .join(" | ");
}
