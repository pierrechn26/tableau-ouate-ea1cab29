export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aski_chats: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      aski_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          response_time_ms: number | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aski_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "aski_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_children: {
        Row: {
          age: number | null
          age_range: string | null
          birth_date: string | null
          child_index: number
          dynamic_answer_1: string | null
          dynamic_answer_2: string | null
          dynamic_answer_3: string | null
          dynamic_insight_targets: string | null
          dynamic_question_1: string | null
          dynamic_question_2: string | null
          dynamic_question_3: string | null
          exclude_fragrance: boolean | null
          existing_routine_description: string | null
          first_name: string | null
          has_ouate_products: boolean | null
          has_routine: boolean | null
          id: string
          ouate_products: string | null
          reactivity_details: string | null
          routine_issue: string | null
          routine_issue_details: string | null
          routine_satisfaction: number | null
          session_id: string
          skin_concern: string | null
          skin_reactivity: string | null
        }
        Insert: {
          age?: number | null
          age_range?: string | null
          birth_date?: string | null
          child_index: number
          dynamic_answer_1?: string | null
          dynamic_answer_2?: string | null
          dynamic_answer_3?: string | null
          dynamic_insight_targets?: string | null
          dynamic_question_1?: string | null
          dynamic_question_2?: string | null
          dynamic_question_3?: string | null
          exclude_fragrance?: boolean | null
          existing_routine_description?: string | null
          first_name?: string | null
          has_ouate_products?: boolean | null
          has_routine?: boolean | null
          id?: string
          ouate_products?: string | null
          reactivity_details?: string | null
          routine_issue?: string | null
          routine_issue_details?: string | null
          routine_satisfaction?: number | null
          session_id: string
          skin_concern?: string | null
          skin_reactivity?: string | null
        }
        Update: {
          age?: number | null
          age_range?: string | null
          birth_date?: string | null
          child_index?: number
          dynamic_answer_1?: string | null
          dynamic_answer_2?: string | null
          dynamic_answer_3?: string | null
          dynamic_insight_targets?: string | null
          dynamic_question_1?: string | null
          dynamic_question_2?: string | null
          dynamic_question_3?: string | null
          exclude_fragrance?: boolean | null
          existing_routine_description?: string | null
          first_name?: string | null
          has_ouate_products?: boolean | null
          has_routine?: boolean | null
          id?: string
          ouate_products?: string | null
          reactivity_details?: string | null
          routine_issue?: string | null
          routine_issue_details?: string | null
          routine_satisfaction?: number | null
          session_id?: string
          skin_concern?: string | null
          skin_reactivity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_children_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_responses: {
        Row: {
          answers: Json | null
          child_age: number | null
          child_name: string | null
          created_at: string | null
          detected_persona: string | null
          email: string | null
          email_optin: boolean | null
          id: string
          metadata: Json | null
          parent_name: string | null
          persona_confidence: number | null
          persona_scores: Json | null
          phone: string | null
          session_id: string
          sms_optin: boolean | null
          source_url: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          answers?: Json | null
          child_age?: number | null
          child_name?: string | null
          created_at?: string | null
          detected_persona?: string | null
          email?: string | null
          email_optin?: boolean | null
          id?: string
          metadata?: Json | null
          parent_name?: string | null
          persona_confidence?: number | null
          persona_scores?: Json | null
          phone?: string | null
          session_id: string
          sms_optin?: boolean | null
          source_url?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          answers?: Json | null
          child_age?: number | null
          child_name?: string | null
          created_at?: string | null
          detected_persona?: string | null
          email?: string | null
          email_optin?: boolean | null
          id?: string
          metadata?: Json | null
          parent_name?: string | null
          persona_confidence?: number | null
          persona_scores?: Json | null
          phone?: string | null
          session_id?: string
          sms_optin?: boolean | null
          source_url?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_responses_detected_persona_fkey"
            columns: ["detected_persona"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["name"]
          },
        ]
      }
      diagnostic_sessions: {
        Row: {
          abandoned_at_step: string | null
          adapted_tone: string | null
          avg_response_time: number | null
          back_navigation_count: number | null
          behavior_tags: string | null
          cart_selected_at: string | null
          checkout_at: string | null
          checkout_started: boolean
          content_format_preference: string | null
          conversion: boolean | null
          created_at: string | null
          device: string | null
          duration_seconds: number | null
          email: string | null
          engagement_score: number | null
          existing_ouate_products: string | null
          exit_type: string | null
          has_detailed_responses: boolean | null
          has_optional_details: boolean | null
          id: string
          is_existing_client: boolean | null
          locale: string | null
          matching_score: number | null
          number_of_children: number | null
          optin_email: boolean | null
          optin_sms: boolean | null
          persona_code: string | null
          phone: string | null
          priorities_ordered: string | null
          question_path: string | null
          recommended_cart_amount: number | null
          recommended_products: string | null
          relationship: string | null
          result_url: string | null
          routine_size_preference: string | null
          selected_cart_amount: number | null
          session_code: string
          source: string | null
          status: string
          step_timestamps: Json | null
          total_text_length: number | null
          trust_triggers_ordered: string | null
          upsell_potential: string | null
          user_name: string | null
          utm_campaign: string | null
          validated_cart_amount: number | null
          validated_products: string | null
        }
        Insert: {
          abandoned_at_step?: string | null
          adapted_tone?: string | null
          avg_response_time?: number | null
          back_navigation_count?: number | null
          behavior_tags?: string | null
          cart_selected_at?: string | null
          checkout_at?: string | null
          checkout_started?: boolean
          content_format_preference?: string | null
          conversion?: boolean | null
          created_at?: string | null
          device?: string | null
          duration_seconds?: number | null
          email?: string | null
          engagement_score?: number | null
          existing_ouate_products?: string | null
          exit_type?: string | null
          has_detailed_responses?: boolean | null
          has_optional_details?: boolean | null
          id?: string
          is_existing_client?: boolean | null
          locale?: string | null
          matching_score?: number | null
          number_of_children?: number | null
          optin_email?: boolean | null
          optin_sms?: boolean | null
          persona_code?: string | null
          phone?: string | null
          priorities_ordered?: string | null
          question_path?: string | null
          recommended_cart_amount?: number | null
          recommended_products?: string | null
          relationship?: string | null
          result_url?: string | null
          routine_size_preference?: string | null
          selected_cart_amount?: number | null
          session_code: string
          source?: string | null
          status?: string
          step_timestamps?: Json | null
          total_text_length?: number | null
          trust_triggers_ordered?: string | null
          upsell_potential?: string | null
          user_name?: string | null
          utm_campaign?: string | null
          validated_cart_amount?: number | null
          validated_products?: string | null
        }
        Update: {
          abandoned_at_step?: string | null
          adapted_tone?: string | null
          avg_response_time?: number | null
          back_navigation_count?: number | null
          behavior_tags?: string | null
          cart_selected_at?: string | null
          checkout_at?: string | null
          checkout_started?: boolean
          content_format_preference?: string | null
          conversion?: boolean | null
          created_at?: string | null
          device?: string | null
          duration_seconds?: number | null
          email?: string | null
          engagement_score?: number | null
          existing_ouate_products?: string | null
          exit_type?: string | null
          has_detailed_responses?: boolean | null
          has_optional_details?: boolean | null
          id?: string
          is_existing_client?: boolean | null
          locale?: string | null
          matching_score?: number | null
          number_of_children?: number | null
          optin_email?: boolean | null
          optin_sms?: boolean | null
          persona_code?: string | null
          phone?: string | null
          priorities_ordered?: string | null
          question_path?: string | null
          recommended_cart_amount?: number | null
          recommended_products?: string | null
          relationship?: string | null
          result_url?: string | null
          routine_size_preference?: string | null
          selected_cart_amount?: number | null
          session_code?: string
          source?: string | null
          status?: string
          step_timestamps?: Json | null
          total_text_length?: number | null
          trust_triggers_ordered?: string | null
          upsell_potential?: string | null
          user_name?: string | null
          utm_campaign?: string | null
          validated_cart_amount?: number | null
          validated_products?: string | null
        }
        Relationships: []
      }
      funnel_recommendations: {
        Row: {
          applied: boolean
          applied_at: string | null
          created_at: string
          id: string
          issue: string
          kept_from_previous: boolean
          recommendation: string
          step: string
          week_start: string
        }
        Insert: {
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          id?: string
          issue: string
          kept_from_previous?: boolean
          recommendation: string
          step: string
          week_start: string
        }
        Update: {
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          id?: string
          issue?: string
          kept_from_previous?: boolean
          recommendation?: string
          step?: string
          week_start?: string
        }
        Relationships: []
      }
      marketing_recommendations: {
        Row: {
          ads_recommendations: Json | null
          checklist: Json | null
          email_recommendations: Json | null
          generated_at: string | null
          id: string
          offers_recommendations: Json | null
          persona_focus: Json | null
          sources_consulted: Json | null
          status: string | null
          week_start: string
        }
        Insert: {
          ads_recommendations?: Json | null
          checklist?: Json | null
          email_recommendations?: Json | null
          generated_at?: string | null
          id?: string
          offers_recommendations?: Json | null
          persona_focus?: Json | null
          sources_consulted?: Json | null
          status?: string | null
          week_start: string
        }
        Update: {
          ads_recommendations?: Json | null
          checklist?: Json | null
          email_recommendations?: Json | null
          generated_at?: string | null
          id?: string
          offers_recommendations?: Json | null
          persona_focus?: Json | null
          sources_consulted?: Json | null
          status?: string | null
          week_start?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          age_range: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shopify_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_email: string | null
          diagnostic_session_id: string | null
          id: string
          is_from_diagnostic: boolean | null
          order_number: string | null
          shopify_order_id: string
          total_price: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          diagnostic_session_id?: string | null
          id?: string
          is_from_diagnostic?: boolean | null
          order_number?: string | null
          shopify_order_id: string
          total_price?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          diagnostic_session_id?: string | null
          id?: string
          is_from_diagnostic?: boolean | null
          order_number?: string | null
          shopify_order_id?: string
          total_price?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
