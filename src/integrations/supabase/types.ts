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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assistencias: {
        Row: {
          aparelho: string | null
          cliente: string
          created_at: string
          frete: number
          garantia: string | null
          id: string
          loja_id: string | null
          lucro: number
          mao_de_obra: number
          numero_os: number
          observacao: string | null
          servico: string | null
          status: string
          tecnico: string | null
          telefone: string | null
          updated_at: string
          user_id: string
          valor_peca: number
          valor_servico: number
        }
        Insert: {
          aparelho?: string | null
          cliente: string
          created_at?: string
          frete?: number
          garantia?: string | null
          id?: string
          loja_id?: string | null
          lucro?: number
          mao_de_obra?: number
          numero_os?: number
          observacao?: string | null
          servico?: string | null
          status?: string
          tecnico?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
          valor_peca?: number
          valor_servico?: number
        }
        Update: {
          aparelho?: string | null
          cliente?: string
          created_at?: string
          frete?: number
          garantia?: string | null
          id?: string
          loja_id?: string | null
          lucro?: number
          mao_de_obra?: number
          numero_os?: number
          observacao?: string | null
          servico?: string | null
          status?: string
          tecnico?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
          valor_peca?: number
          valor_servico?: number
        }
        Relationships: [
          {
            foreignKeyName: "assistencias_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          loja_id: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          tipo: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          cliente: string | null
          created_at: string
          id: string
          loja_id: string | null
          produto: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          id?: string
          loja_id?: string | null
          produto: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente?: string | null
          created_at?: string
          id?: string
          loja_id?: string | null
          produto?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          created_at: string
          endereco_loja: string | null
          id: string
          logo_url: string | null
          loja_id: string | null
          nome_loja: string | null
          telefone_loja: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endereco_loja?: string | null
          id?: string
          logo_url?: string | null
          loja_id?: string | null
          nome_loja?: string | null
          telefone_loja?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endereco_loja?: string | null
          id?: string
          logo_url?: string | null
          loja_id?: string | null
          nome_loja?: string | null
          telefone_loja?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          created_at: string
          data_vencimento: string | null
          id: string
          importante: boolean
          loja_id: string | null
          nome: string | null
          pago: boolean
          recorrente: boolean
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_vencimento?: string | null
          id?: string
          importante?: boolean
          loja_id?: string | null
          nome?: string | null
          pago?: boolean
          recorrente?: boolean
          tipo: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_vencimento?: string | null
          id?: string
          importante?: boolean
          loja_id?: string | null
          nome?: string | null
          pago?: boolean
          recorrente?: boolean
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          created_at: string
          estoque_minimo: number
          id: string
          loja_id: string | null
          produto: string
          quantidade: number
          updated_at: string
          user_id: string
          valor_custo: number
          valor_venda: number
        }
        Insert: {
          created_at?: string
          estoque_minimo?: number
          id?: string
          loja_id?: string | null
          produto: string
          quantidade?: number
          updated_at?: string
          user_id: string
          valor_custo?: number
          valor_venda?: number
        }
        Update: {
          created_at?: string
          estoque_minimo?: number
          id?: string
          loja_id?: string | null
          produto?: string
          quantidade?: number
          updated_at?: string
          user_id?: string
          valor_custo?: number
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "estoque_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          created_at: string
          email_responsavel: string | null
          id: string
          nome: string
          pagamento: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_responsavel?: string | null
          id?: string
          nome?: string
          pagamento?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_responsavel?: string | null
          id?: string
          nome?: string
          pagamento?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      precos_servicos: {
        Row: {
          created_at: string
          frete: number
          id: string
          loja_id: string | null
          lucro_loja: number
          mao_de_obra: number
          marca: string
          modelo: string
          servico: string
          updated_at: string
          user_id: string
          valor_final: number
          valor_peca: number
        }
        Insert: {
          created_at?: string
          frete?: number
          id?: string
          loja_id?: string | null
          lucro_loja?: number
          mao_de_obra?: number
          marca: string
          modelo: string
          servico: string
          updated_at?: string
          user_id: string
          valor_final?: number
          valor_peca?: number
        }
        Update: {
          created_at?: string
          frete?: number
          id?: string
          loja_id?: string | null
          lucro_loja?: number
          mao_de_obra?: number
          marca?: string
          modelo?: string
          servico?: string
          updated_at?: string
          user_id?: string
          valor_final?: number
          valor_peca?: number
        }
        Relationships: [
          {
            foreignKeyName: "precos_servicos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          loja_id: string | null
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          nome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      vendas: {
        Row: {
          assistencia_id: string | null
          created_at: string
          garantia_dias: number
          id: string
          loja_id: string | null
          lucro_venda: number
          marca: string | null
          modelo: string | null
          produto: string
          tipo_venda: string
          updated_at: string
          user_id: string
          valor: number
          valor_compra: number
        }
        Insert: {
          assistencia_id?: string | null
          created_at?: string
          garantia_dias?: number
          id?: string
          loja_id?: string | null
          lucro_venda?: number
          marca?: string | null
          modelo?: string | null
          produto: string
          tipo_venda?: string
          updated_at?: string
          user_id: string
          valor?: number
          valor_compra?: number
        }
        Update: {
          assistencia_id?: string | null
          created_at?: string
          garantia_dias?: number
          id?: string
          loja_id?: string | null
          lucro_venda?: number
          marca?: string | null
          modelo?: string | null
          produto?: string
          tipo_venda?: string
          updated_at?: string
          user_id?: string
          valor?: number
          valor_compra?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_loja_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "vendedor"
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
      app_role: ["admin", "vendedor"],
    },
  },
} as const
