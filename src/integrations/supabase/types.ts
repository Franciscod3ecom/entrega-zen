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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      carriers: {
        Row: {
          active: boolean | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          owner_user_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          owner_user_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_attempts: {
        Row: {
          attempt_time: string
          created_at: string
          driver_id: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          reason: string | null
          shipment_id: number
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          driver_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          reason?: string | null
          shipment_id: number
        }
        Update: {
          attempt_time?: string
          created_at?: string
          driver_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          reason?: string | null
          shipment_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_attempts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      driver_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          driver_id: string
          id: string
          ml_account_id: string | null
          note: string | null
          owner_user_id: string
          returned_at: string | null
          scanned_at: string | null
          shipment_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          driver_id: string
          id?: string
          ml_account_id?: string | null
          note?: string | null
          owner_user_id: string
          returned_at?: string | null
          scanned_at?: string | null
          shipment_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          driver_id?: string
          id?: string
          ml_account_id?: string | null
          note?: string | null
          owner_user_id?: string
          returned_at?: string | null
          scanned_at?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_ml_account_id_fkey"
            columns: ["ml_account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_driver_assignments_shipment"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments_cache"
            referencedColumns: ["shipment_id"]
          },
          {
            foreignKeyName: "fk_driver_assignments_shipment"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_rastreamento_completo"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      driver_load_items: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          load_id: string
          picked_at: string | null
          returned_at: string | null
          shipment_id: number
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          load_id: string
          picked_at?: string | null
          returned_at?: string | null
          shipment_id: number
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          load_id?: string
          picked_at?: string | null
          returned_at?: string | null
          shipment_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_load_items_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "driver_loads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_load_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      driver_loads: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          load_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          load_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          load_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_loads_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          active: boolean
          carrier_id: string | null
          created_at: string
          email: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          name: string
          owner_user_id: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          carrier_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          name: string
          owner_user_id: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          carrier_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          name?: string
          owner_user_id?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flex_handshake_logs: {
        Row: {
          created_at: string | null
          from_driver: string | null
          handshake_time: string | null
          id: string
          ml_account_id: string | null
          owner_user_id: string
          raw_data: Json | null
          shipment_id: string
          to_driver: string | null
        }
        Insert: {
          created_at?: string | null
          from_driver?: string | null
          handshake_time?: string | null
          id?: string
          ml_account_id?: string | null
          owner_user_id: string
          raw_data?: Json | null
          shipment_id: string
          to_driver?: string | null
        }
        Update: {
          created_at?: string | null
          from_driver?: string | null
          handshake_time?: string | null
          id?: string
          ml_account_id?: string | null
          owner_user_id?: string
          raw_data?: Json | null
          shipment_id?: string
          to_driver?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flex_handshake_logs_ml_account_id_fkey"
            columns: ["ml_account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_accounts: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          ml_user_id: number
          nickname: string | null
          owner_user_id: string
          refresh_token: string
          site_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          ml_user_id: number
          nickname?: string | null
          owner_user_id: string
          refresh_token: string
          site_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          ml_user_id?: number
          nickname?: string | null
          owner_user_id?: string
          refresh_token?: string
          site_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ml_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          seller_nickname: string | null
          site_id: string
          updated_at: string
          user_id: number
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          seller_nickname?: string | null
          site_id: string
          updated_at?: string
          user_id: number
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          seller_nickname?: string | null
          site_id?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: number | null
          created_at: string
          order_id: number
          owner_user_id: string
          pack_id: number | null
          status: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          buyer_id?: number | null
          created_at: string
          order_id: number
          owner_user_id: string
          pack_id?: number | null
          status?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          buyer_id?: number | null
          created_at?: string
          order_id?: number
          owner_user_id?: string
          pack_id?: number | null
          status?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reconciliation: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          pending_count: number
          reconciliation_date: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          pending_count?: number
          reconciliation_date: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          pending_count?: number
          reconciliation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_logs: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          ml_account_id: string | null
          owner_user_id: string
          resolved_from: string | null
          scanned_at: string
          scanned_code: string
          shipment_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          ml_account_id?: string | null
          owner_user_id: string
          resolved_from?: string | null
          scanned_at?: string
          scanned_code: string
          shipment_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          ml_account_id?: string | null
          owner_user_id?: string
          resolved_from?: string | null
          scanned_at?: string
          scanned_code?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_ml_account_id_fkey"
            columns: ["ml_account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_alerts: {
        Row: {
          alert_type: string
          carrier_id: string | null
          created_at: string | null
          detected_at: string | null
          driver_id: string | null
          id: string
          ml_account_id: string | null
          notes: string | null
          owner_user_id: string
          resolved_at: string | null
          shipment_id: string
          status: string | null
        }
        Insert: {
          alert_type: string
          carrier_id?: string | null
          created_at?: string | null
          detected_at?: string | null
          driver_id?: string | null
          id?: string
          ml_account_id?: string | null
          notes?: string | null
          owner_user_id: string
          resolved_at?: string | null
          shipment_id: string
          status?: string | null
        }
        Update: {
          alert_type?: string
          carrier_id?: string | null
          created_at?: string | null
          detected_at?: string | null
          driver_id?: string | null
          id?: string
          ml_account_id?: string | null
          notes?: string | null
          owner_user_id?: string
          resolved_at?: string | null
          shipment_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_alerts_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_alerts_ml_account_id_fkey"
            columns: ["ml_account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          created_at: string
          event_time: string
          id: string
          payload_json: Json | null
          shipment_id: number
          status: string
          substatus: string | null
        }
        Insert: {
          created_at?: string
          event_time?: string
          id?: string
          payload_json?: Json | null
          shipment_id: number
          status: string
          substatus?: string | null
        }
        Update: {
          created_at?: string
          event_time?: string
          id?: string
          payload_json?: Json | null
          shipment_id?: number
          status?: string
          substatus?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          last_update: string
          order_id: number | null
          owner_user_id: string
          shipment_id: number
          status: string
          substatus: string | null
          tracking_number: string | null
        }
        Insert: {
          created_at?: string
          last_update?: string
          order_id?: number | null
          owner_user_id: string
          shipment_id: number
          status: string
          substatus?: string | null
          tracking_number?: string | null
        }
        Update: {
          created_at?: string
          last_update?: string
          order_id?: number | null
          owner_user_id?: string
          shipment_id?: number
          status?: string
          substatus?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
        ]
      }
      shipments_cache: {
        Row: {
          cidade: string | null
          cliente_nome: string | null
          created_at: string
          estado: string | null
          last_ml_update: string
          ml_account_id: string | null
          order_id: string | null
          owner_user_id: string
          pack_id: string | null
          raw_data: Json | null
          shipment_id: string
          status: string
          substatus: string | null
          tracking_number: string | null
        }
        Insert: {
          cidade?: string | null
          cliente_nome?: string | null
          created_at?: string
          estado?: string | null
          last_ml_update?: string
          ml_account_id?: string | null
          order_id?: string | null
          owner_user_id: string
          pack_id?: string | null
          raw_data?: Json | null
          shipment_id: string
          status: string
          substatus?: string | null
          tracking_number?: string | null
        }
        Update: {
          cidade?: string | null
          cliente_nome?: string | null
          created_at?: string
          estado?: string | null
          last_ml_update?: string
          ml_account_id?: string | null
          order_id?: string | null
          owner_user_id?: string
          pack_id?: string | null
          raw_data?: Json | null
          shipment_id?: string
          status?: string
          substatus?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_cache_ml_account_id_fkey"
            columns: ["ml_account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_rastreamento_completo: {
        Row: {
          alertas_ativos: number | null
          assigned_at: string | null
          assignment_id: string | null
          cidade: string | null
          cliente_nome: string | null
          driver_id: string | null
          estado: string | null
          last_ml_update: string | null
          ml_account_id: string | null
          motorista_nome: string | null
          motorista_phone: string | null
          order_id: string | null
          owner_user_id: string | null
          pack_id: string | null
          returned_at: string | null
          scanned_at: string | null
          shipment_id: string | null
          status: string | null
          substatus: string | null
          tracking_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_cache_ml_account_id_fkey"
            columns: ["ml_account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_first_admin: { Args: never; Returns: undefined }
      cleanup_duplicate_alerts: {
        Args: never
        Returns: {
          consolidated_count: number
          deleted_ids: string[]
        }[]
      }
      cleanup_old_shipments_raw_data: {
        Args: never
        Returns: {
          cleaned_count: number
        }[]
      }
      cleanup_orphaned_alerts: {
        Args: never
        Returns: {
          deleted_count: number
          deleted_ids: string[]
        }[]
      }
      get_pendencias_with_cache: {
        Args: never
        Returns: {
          assigned_at: string
          cache_last_update: string
          cache_status: string
          cache_substatus: string
          cache_tracking: string
          driver_id: string
          driver_name: string
          driver_phone: string
          id: string
          note: string
          scanned_at: string
          shipment_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      identify_duplicate_alerts: {
        Args: never
        Returns: {
          alert_type: string
          count: number
          duplicate_ids: string[]
          oldest_alert_id: string
          shipment_id: string
        }[]
      }
      resolve_alerts_on_delivered_shipments: {
        Args: never
        Returns: {
          resolved_count: number
          resolved_ids: string[]
        }[]
      }
      slim_shipment_raw_data: { Args: { data: Json }; Returns: Json }
      sync_alert_counts: {
        Args: never
        Returns: {
          delivered_resolved: number
          duplicates_consolidated: number
          orphaned_removed: number
          total_cleaned: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "ops" | "driver"
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
      app_role: ["admin", "ops", "driver"],
    },
  },
} as const
