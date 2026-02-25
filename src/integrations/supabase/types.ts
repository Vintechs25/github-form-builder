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
      dns_records: {
        Row: {
          created_at: string
          domain_id: string
          host: string
          id: string
          priority: number | null
          record_type: string
          ttl: number
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          domain_id: string
          host?: string
          id?: string
          priority?: number | null
          record_type?: string
          ttl?: number
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          domain_id?: string
          host?: string
          id?: string
          priority?: number | null
          record_type?: string
          ttl?: number
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "dns_records_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_pricing: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_enabled: boolean
          last_synced_at: string | null
          markup_fixed: number
          markup_percent: number
          markup_type: string
          register_price: number
          renew_price: number
          sell_price_register: number
          sell_price_renew: number
          sell_price_transfer: number
          tld: string
          transfer_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          markup_fixed?: number
          markup_percent?: number
          markup_type?: string
          register_price?: number
          renew_price?: number
          sell_price_register?: number
          sell_price_renew?: number
          sell_price_transfer?: number
          tld: string
          transfer_price?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          markup_fixed?: number
          markup_percent?: number
          markup_type?: string
          register_price?: number
          renew_price?: number
          sell_price_register?: number
          sell_price_renew?: number
          sell_price_transfer?: number
          tld?: string
          transfer_price?: number
        }
        Relationships: []
      }
      domains: {
        Row: {
          created_at: string
          domain_name: string
          domain_type: string
          expires_at: string | null
          id: string
          registrar: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain_name: string
          domain_type?: string
          expires_at?: string | null
          id?: string
          registrar?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain_name?: string
          domain_type?: string
          expires_at?: string | null
          id?: string
          registrar?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hosting_accounts: {
        Row: {
          backend_id: string | null
          created_at: string
          domain: string
          hosting_type: string
          id: string
          plan_id: string | null
          ssl_enabled: boolean
          status: string
          storage_used_mb: number
          updated_at: string
          user_id: string
        }
        Insert: {
          backend_id?: string | null
          created_at?: string
          domain: string
          hosting_type?: string
          id?: string
          plan_id?: string | null
          ssl_enabled?: boolean
          status?: string
          storage_used_mb?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          backend_id?: string | null
          created_at?: string
          domain?: string
          hosting_type?: string
          id?: string
          plan_id?: string | null
          ssl_enabled?: boolean
          status?: string
          storage_used_mb?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosting_accounts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hosting_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      hosting_plans: {
        Row: {
          bandwidth_mb: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_apps: number
          max_databases: number
          max_domains: number
          max_email_accounts: number
          name: string
          plan_type: string
          price_monthly: number
          price_yearly: number | null
          ram_mb: number
          slug: string
          storage_mb: number
          updated_at: string
          wordpress_enabled: boolean
        }
        Insert: {
          bandwidth_mb?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_apps?: number
          max_databases?: number
          max_domains?: number
          max_email_accounts?: number
          name: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number | null
          ram_mb?: number
          slug: string
          storage_mb?: number
          updated_at?: string
          wordpress_enabled?: boolean
        }
        Update: {
          bandwidth_mb?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_apps?: number
          max_databases?: number
          max_domains?: number
          max_email_accounts?: number
          name?: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number | null
          ram_mb?: number
          slug?: string
          storage_mb?: number
          updated_at?: string
          wordpress_enabled?: boolean
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          order_id: string | null
          paid_at: string | null
          payment_gateway: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number: string
          order_id?: string | null
          paid_at?: string | null
          payment_gateway?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          order_id?: string | null
          paid_at?: string | null
          payment_gateway?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_cycle: string
          created_at: string
          domain_name: string | null
          id: string
          plan_id: string | null
          status: string
          total_amount: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          domain_name?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          total_amount?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          domain_name?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          total_amount?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hosting_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          plan_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          plan_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          plan_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hosting_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
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
