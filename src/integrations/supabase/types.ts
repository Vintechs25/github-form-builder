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
          ttl: number
          type: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          domain_id: string
          host?: string
          id?: string
          ttl?: number
          type?: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          domain_id?: string
          host?: string
          id?: string
          ttl?: number
          type?: string
          updated_at?: string
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
          sell_price_register: number | null
          sell_price_renew: number | null
          sell_price_transfer: number | null
          tld: string
          transfer_price: number
          updated_at: string
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
          sell_price_register?: number | null
          sell_price_renew?: number | null
          sell_price_transfer?: number | null
          tld: string
          transfer_price?: number
          updated_at?: string
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
          sell_price_register?: number | null
          sell_price_renew?: number | null
          sell_price_transfer?: number | null
          tld?: string
          transfer_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      domains: {
        Row: {
          created_at: string
          domain_name: string
          domain_type: string
          expires_at: string | null
          hosting_account_id: string | null
          id: string
          nameserver_1: string | null
          nameserver_2: string | null
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
          hosting_account_id?: string | null
          id?: string
          nameserver_1?: string | null
          nameserver_2?: string | null
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
          hosting_account_id?: string | null
          id?: string
          nameserver_1?: string | null
          nameserver_2?: string | null
          registrar?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_hosting_account_id_fkey"
            columns: ["hosting_account_id"]
            isOneToOne: false
            referencedRelation: "hosting_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      hosting_accounts: {
        Row: {
          bandwidth_used_mb: number
          cpanel_username: string | null
          created_at: string
          domain: string
          expires_at: string | null
          ftp_username: string | null
          hosting_type: string
          id: string
          plan_id: string | null
          ssl_enabled: boolean
          status: string
          storage_used_mb: number
          updated_at: string
          user_id: string
          wordpress_url: string | null
        }
        Insert: {
          bandwidth_used_mb?: number
          cpanel_username?: string | null
          created_at?: string
          domain: string
          expires_at?: string | null
          ftp_username?: string | null
          hosting_type?: string
          id?: string
          plan_id?: string | null
          ssl_enabled?: boolean
          status?: string
          storage_used_mb?: number
          updated_at?: string
          user_id: string
          wordpress_url?: string | null
        }
        Update: {
          bandwidth_used_mb?: number
          cpanel_username?: string | null
          created_at?: string
          domain?: string
          expires_at?: string | null
          ftp_username?: string | null
          hosting_type?: string
          id?: string
          plan_id?: string | null
          ssl_enabled?: boolean
          status?: string
          storage_used_mb?: number
          updated_at?: string
          user_id?: string
          wordpress_url?: string | null
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
      hosting_databases: {
        Row: {
          created_at: string
          db_host: string
          db_name: string
          db_port: number
          db_username: string
          hosting_account_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          db_host?: string
          db_name: string
          db_port?: number
          db_username: string
          hosting_account_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          db_host?: string
          db_name?: string
          db_port?: number
          db_username?: string
          hosting_account_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosting_databases_hosting_account_id_fkey"
            columns: ["hosting_account_id"]
            isOneToOne: false
            referencedRelation: "hosting_accounts"
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
          max_databases: number
          max_domains: number
          max_email_accounts: number
          name: string
          price_monthly: number
          price_yearly: number | null
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
          max_databases?: number
          max_domains?: number
          max_email_accounts?: number
          name: string
          price_monthly?: number
          price_yearly?: number | null
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
          max_databases?: number
          max_domains?: number
          max_email_accounts?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
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
          currency: string
          description: string | null
          due_date: string
          hosting_account_id: string | null
          id: string
          invoice_number: string
          order_id: string | null
          paid_at: string | null
          payment_gateway: string | null
          payment_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          due_date: string
          hosting_account_id?: string | null
          id?: string
          invoice_number: string
          order_id?: string | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string
          hosting_account_id?: string | null
          id?: string
          invoice_number?: string
          order_id?: string | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_hosting_account_id_fkey"
            columns: ["hosting_account_id"]
            isOneToOne: false
            referencedRelation: "hosting_accounts"
            referencedColumns: ["id"]
          },
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
          package_id: string | null
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
          package_id?: string | null
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
          package_id?: string | null
          status?: string
          total_amount?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "hosting_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          method: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
