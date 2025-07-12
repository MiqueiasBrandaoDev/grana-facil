export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          budget: number
          color: string
          icon: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          budget?: number
          color?: string
          icon?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'income' | 'expense'
          budget?: number
          color?: string
          icon?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          description: string
          amount: number
          type: 'income' | 'expense'
          payment_method: string
          status: 'pending' | 'completed' | 'cancelled'
          transaction_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          description: string
          amount: number
          type: 'income' | 'expense'
          payment_method?: string
          status?: 'pending' | 'completed' | 'cancelled'
          transaction_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          description?: string
          amount?: number
          type?: 'income' | 'expense'
          payment_method?: string
          status?: 'pending' | 'completed' | 'cancelled'
          transaction_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_amount: number
          current_amount: number
          target_date: string | null
          status: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          target_amount: number
          current_amount?: number
          target_date?: string | null
          status?: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          status?: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          amount: number
          type: 'payable' | 'receivable'
          due_date: string
          status: 'pending' | 'paid' | 'overdue' | 'cancelled'
          is_recurring: boolean
          recurring_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_day: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          amount: number
          type: 'payable' | 'receivable'
          due_date: string
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          is_recurring?: boolean
          recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_day?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          amount?: number
          type?: 'payable' | 'receivable'
          due_date?: string
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          is_recurring?: boolean
          recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_day?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      investments: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          symbol: string | null
          quantity: number
          purchase_price: number
          current_price: number
          purchase_date: string
          status: 'active' | 'sold' | 'partial_sold'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          symbol?: string | null
          quantity: number
          purchase_price: number
          current_price?: number
          purchase_date: string
          status?: 'active' | 'sold' | 'partial_sold'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          symbol?: string | null
          quantity?: number
          purchase_price?: number
          current_price?: number
          purchase_date?: string
          status?: 'active' | 'sold' | 'partial_sold'
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_messages: {
        Row: {
          id: string
          user_id: string
          message_text: string
          sender: 'user' | 'bot'
          message_type: 'text' | 'transaction' | 'balance' | 'report'
          processed: boolean
          transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message_text: string
          sender: 'user' | 'bot'
          message_type?: 'text' | 'transaction' | 'balance' | 'report'
          processed?: boolean
          transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message_text?: string
          sender?: 'user' | 'bot'
          message_type?: 'text' | 'transaction' | 'balance' | 'report'
          processed?: boolean
          transaction_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      monthly_summary: {
        Row: {
          user_id: string
          month: string
          total_income: number
          total_expenses: number
          net_income: number
          transaction_count: number
        }
      }
      category_summary: {
        Row: {
          user_id: string
          category_id: string
          category_name: string
          category_type: 'income' | 'expense'
          budget: number
          color: string
          icon: string
          total_spent: number
          transaction_count: number
          budget_percentage: number
        }
      }
      transactions_with_category: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          type: 'income' | 'expense'
          payment_method: string
          status: 'pending' | 'completed' | 'cancelled'
          transaction_date: string
          created_at: string
          category_name: string | null
          category_color: string | null
          category_icon: string | null
        }
      }
      goal_progress: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_amount: number
          current_amount: number
          target_date: string | null
          status: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at: string
          progress_percentage: number
          days_remaining: number | null
        }
      }
      upcoming_bills: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          amount: number
          type: 'payable' | 'receivable'
          due_date: string
          status: 'pending' | 'paid' | 'overdue' | 'cancelled'
          is_recurring: boolean
          category_name: string | null
          category_color: string | null
          category_icon: string | null
          urgency: 'overdue' | 'due_today' | 'due_soon' | 'future'
        }
      }
    }
    Functions: {
      get_user_balance: {
        Args: {
          input_user_id: string
        }
        Returns: number
      }
      get_monthly_spending_by_category: {
        Args: {
          input_user_id: string
          month_date?: string
        }
        Returns: {
          category_name: string
          category_color: string
          category_icon: string
          total_spent: number
          budget: number
          percentage: number
        }[]
      }
      update_goal_progress: {
        Args: {
          goal_id: string
          amount: number
        }
        Returns: void
      }
      process_whatsapp_transaction: {
        Args: {
          user_id: string
          message_text: string
        }
        Returns: string
      }
      create_default_categories: {
        Args: {
          user_id: string
        }
        Returns: void
      }
      create_recurring_bills: {
        Args: Record<string, never>
        Returns: void
      }
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
