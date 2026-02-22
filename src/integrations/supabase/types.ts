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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          empresa_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          empresa_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          empresa_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          id: string
          limite_credito: number
          nome: string
          status: string
          telefone: string | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome: string
          status?: string
          telefone?: string | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome?: string
          status?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          created_at: string
          data_vencimento: string
          deleted_at: string | null
          descricao: string
          empresa_id: string
          fornecedor_id: string | null
          id: string
          nota_fiscal: string | null
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_vencimento: string
          deleted_at?: string | null
          descricao: string
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal?: string | null
          status?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_vencimento?: string
          deleted_at?: string | null
          descricao?: string
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_vencimento: string
          deleted_at: string | null
          descricao: string
          empresa_id: string
          id: string
          nota_fiscal: string | null
          status: string
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_vencimento: string
          deleted_at?: string | null
          descricao: string
          empresa_id: string
          id?: string
          nota_fiscal?: string | null
          status?: string
          valor: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_vencimento?: string
          deleted_at?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          nota_fiscal?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          plano: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          plano?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          plano?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_compra_itens: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          pedido_id: string
          preco_unitario?: number
          produto_id: string
          quantidade?: number
          subtotal?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_compra_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_compra_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_venda_itens: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          pedido_id: string
          preco_unitario?: number
          produto_id: string
          quantidade?: number
          subtotal?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_venda_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_venda_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra: {
        Row: {
          created_at: string
          deleted_at: string | null
          desconto: number
          empresa_id: string
          fornecedor_id: string | null
          id: string
          nota_fiscal: string | null
          numero: number
          observacao: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          desconto?: number
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal?: string | null
          numero?: number
          observacao?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          desconto?: number
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal?: string | null
          numero?: number
          observacao?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_venda: {
        Row: {
          cliente_id: string | null
          created_at: string
          deleted_at: string | null
          desconto: number
          empresa_id: string
          id: string
          nota_fiscal: string | null
          numero: number
          observacao: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          deleted_at?: string | null
          desconto?: number
          empresa_id: string
          id?: string
          nota_fiscal?: string | null
          numero?: number
          observacao?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          deleted_at?: string | null
          desconto?: number
          empresa_id?: string
          id?: string
          nota_fiscal?: string | null
          numero?: number
          observacao?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_venda_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_venda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string | null
          codigo: string | null
          created_at: string
          custo: number
          deleted_at: string | null
          empresa_id: string
          estoque_atual: number
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          nome: string
          preco: number
        }
        Insert: {
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          custo?: number
          deleted_at?: string | null
          empresa_id: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome: string
          preco?: number
        }
        Update: {
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          custo?: number
          deleted_at?: string | null
          empresa_id?: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome?: string
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          empresa_id: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          empresa_id: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      finalizar_pedido_compra: {
        Args: { _pedido_id: string }
        Returns: undefined
      }
      finalizar_pedido_venda: {
        Args: { _pedido_id: string }
        Returns: undefined
      }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "estoque" | "usuario"
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
      app_role: ["admin", "financeiro", "estoque", "usuario"],
    },
  },
} as const
