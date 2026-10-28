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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          id: string
          name: string
          description: string | null
          purchase_date: string
          purchase_amount: number
          current_value: number | null
          account: string | null
          payment_method: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          purchase_date: string
          purchase_amount: number
          current_value?: number | null
          account?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          purchase_date?: string
          purchase_amount?: number
          current_value?: number | null
          account?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          notes: string | null
          paid_on: string
          period_month: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          paid_on?: string
          period_month: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          paid_on?: string
          period_month?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fine_categories: {
        Row: {
          created_at: string
          default_amount: number
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          default_amount?: number
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          default_amount?: number
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      fines: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          issued_by: string | null
          issued_on: string
          member_id: string
          paid_on: string | null
          reason: string | null
          status: Database["public"]["Enums"]["fine_status"]
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          issued_on?: string
          member_id: string
          paid_on?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["fine_status"]
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          issued_on?: string
          member_id?: string
          paid_on?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["fine_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fine_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          id: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          created_by: string | null
          used_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          created_by?: string | null
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          created_by?: string | null
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          paid_on: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          applied_on: string
          approved_by: string | null
          approved_on: string | null
          created_at: string
          due_date: string | null
          id: string
          interest_rate: number
          member_id: string
          notes: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["loan_status"]
        }
        Insert: {
          amount: number
          applied_on?: string
          approved_by?: string | null
          approved_on?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          member_id: string
          notes?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
        }
        Update: {
          amount?: number
          applied_on?: string
          approved_by?: string | null
          approved_on?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          member_id?: string
          notes?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
        }
        Relationships: [
          {
            foreignKeyName: "loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendance: {
        Row: {
          id: string
          meeting_id: string
          member_id: string
          recorded_at: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          id?: string
          meeting_id: string
          member_id: string
          recorded_at?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          id?: string
          meeting_id?: string
          member_id?: string
          recorded_at?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          minutes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          minutes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          minutes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
        }
        Relationships: []
      }
      money_market: {
        Row: {
          id: string
          institution: string
          investment_date: string
          amount: number
          account: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution: string
          investment_date: string
          amount: number
          account?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution?: string
          investment_date?: string
          amount?: number
          account?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          joined_at: string
          member_no: string | null
          phone: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          joined_at?: string
          member_no?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          joined_at?: string
          member_no?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          auto_fine_missed_meeting: boolean
          chama_name: string
          currency: string
          id: number
          late_contribution_fine: number
          loan_interest_rate: number
          missed_meeting_fine: number
          monthly_contribution: number
          updated_at: string
        }
        Insert: {
          auto_fine_missed_meeting?: boolean
          chama_name?: string
          currency?: string
          id?: number
          late_contribution_fine?: number
          loan_interest_rate?: number
          missed_meeting_fine?: number
          monthly_contribution?: number
          updated_at?: string
        }
        Update: {
          auto_fine_missed_meeting?: boolean
          chama_name?: string
          currency?: string
          id?: number
          late_contribution_fine?: number
          loan_interest_rate?: number
          missed_meeting_fine?: number
          monthly_contribution?: number
          updated_at?: string
        }
        Relationships: []
      }
      stocks: {
        Row: {
          id: string
          stock_name: string
          purchase_date: string
          num_shares: number
          price_per_share: number
          account: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stock_name: string
          purchase_date: string
          num_shares: number
          price_per_share: number
          account?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stock_name?: string
          purchase_date?: string
          num_shares?: number
          price_per_share?: number
          account?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "administrator"
        | "chairperson"
        | "treasurer"
        | "secretary"
        | "member"
      attendance_status: "present" | "absent" | "excused"
      fine_status: "outstanding" | "paid" | "waived"
      loan_status: "pending" | "approved" | "rejected" | "active" | "repaid"
      meeting_status: "scheduled" | "completed" | "cancelled"
      member_status: "active" | "inactive"
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
      app_role: [
        "administrator",
        "chairperson",
        "treasurer",
        "secretary",
        "member",
      ],
      attendance_status: ["present", "absent", "excused"],
      fine_status: ["outstanding", "paid", "waived"],
      loan_status: ["pending", "approved", "rejected", "active", "repaid"],
      meeting_status: ["scheduled", "completed", "cancelled"],
      member_status: ["active", "inactive"],
    },
  },
} as const