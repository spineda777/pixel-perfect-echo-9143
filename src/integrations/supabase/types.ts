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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      campaign_packages: {
        Row: {
          campaign_id: string
          created_at: string
          entries: number
          id: string
          is_active: boolean
          is_recommended: boolean
          price_cents: number
          sort_order: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          entries: number
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          price_cents: number
          sort_order?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          entries?: number
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          price_cents?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_packages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          currency: string
          demo_entries_sold: number
          description: Json
          ends_at: string | null
          hero_image_url: string | null
          id: string
          is_featured: boolean
          max_inventory: number
          max_per_user: number
          mode: Database["public"]["Enums"]["campaign_mode"]
          rules_status: string
          slug: string
          starts_at: string | null
          tagline: Json
          timezone: string
          title: Json
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          demo_entries_sold?: number
          description?: Json
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          max_inventory?: number
          max_per_user?: number
          mode?: Database["public"]["Enums"]["campaign_mode"]
          rules_status?: string
          slug: string
          starts_at?: string | null
          tagline?: Json
          timezone?: string
          title?: Json
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          demo_entries_sold?: number
          description?: Json
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          max_inventory?: number
          max_per_user?: number
          mode?: Database["public"]["Enums"]["campaign_mode"]
          rules_status?: string
          slug?: string
          starts_at?: string | null
          tagline?: Json
          timezone?: string
          title?: Json
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          campaign_id: string
          created_at: string
          entry_number: number
          id: string
          order_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          entry_number: number
          id?: string
          order_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          entry_number?: number
          id?: string
          order_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: Json
          campaign_id: string
          created_at: string
          id: string
          is_published: boolean
          question: Json
          sort_order: number
        }
        Insert: {
          answer?: Json
          campaign_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: Json
          sort_order?: number
        }
        Update: {
          answer?: Json
          campaign_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: Json
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "faqs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          campaign_id: string
          completed_at: string | null
          created_at: string
          currency: string
          entries_count: number
          first_entry_number: number | null
          id: string
          last_entry_number: number | null
          order_code: string
          package_id: string | null
          payer_email: string | null
          payer_name: string | null
          paypal_capture_id: string | null
          paypal_order_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          entries_count: number
          first_entry_number?: number | null
          id?: string
          last_entry_number?: number | null
          order_code?: string
          package_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          entries_count?: number
          first_entry_number?: number | null
          id?: string
          last_entry_number?: number | null
          order_code?: string
          package_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "campaign_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          approx_value_cents: number | null
          campaign_id: string
          created_at: string
          description: Json
          id: string
          image_url: string | null
          rank: number
          title: Json
          winner_count: number
        }
        Insert: {
          approx_value_cents?: number | null
          campaign_id: string
          created_at?: string
          description?: Json
          id?: string
          image_url?: string | null
          rank: number
          title?: Json
          winner_count?: number
        }
        Update: {
          approx_value_cents?: number | null
          campaign_id?: string
          created_at?: string
          description?: Json
          id?: string
          image_url?: string | null
          rank?: number
          title?: Json
          winner_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          public_handle: string
        }
        Insert: {
          created_at?: string
          id: string
          public_handle: string
        }
        Update: {
          created_at?: string
          id?: string
          public_handle?: string
        }
        Relationships: []
      }
      rules_sections: {
        Row: {
          body: Json
          campaign_id: string
          created_at: string
          id: string
          section_number: number
          title: Json
        }
        Insert: {
          body?: Json
          campaign_id: string
          created_at?: string
          id?: string
          section_number: number
          title?: Json
        }
        Update: {
          body?: Json
          campaign_id?: string
          created_at?: string
          id?: string
          section_number?: number
          title?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rules_sections_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      admins_exist: { Args: never; Returns: boolean }
      allocate_entries: {
        Args: { _campaign_id: string; _quantity: number; _user_id: string | null }
        Returns: {
          campaign_id: string
          created_at: string
          entry_number: number
          id: string
          order_id: string | null
          status: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "entries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_first_admin: { Args: never; Returns: boolean }
      get_campaign_stats: {
        Args: { _campaign_id: string }
        Returns: {
          entries_sold: number
          is_demo: boolean
          max_inventory: number
          remaining: number
        }[]
      }
      get_my_allowance: {
        Args: { _campaign_id: string }
        Returns: {
          email_verified: boolean
          max_per_user: number
          my_entries: number
          remaining: number
        }[]
      }
      get_public_entries: {
        Args: { _campaign_id: string; _limit?: number; _offset?: number }
        Returns: {
          created_at: string
          entry_number: number
          order_code: string
          public_handle: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_published_campaign_media: { Args: { _name: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      campaign_mode: "demo" | "production"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      campaign_mode: ["demo", "production"],
    },
  },
} as const
