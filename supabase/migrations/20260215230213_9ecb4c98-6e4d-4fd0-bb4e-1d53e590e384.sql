
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'estoque', 'usuario');

-- 2. Empresas table
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  plano TEXT NOT NULL DEFAULT 'basico',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 3. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. User Roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'usuario',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 6. Fornecedores table
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- 7. Produtos table
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  codigo TEXT,
  categoria TEXT,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 8. Movimentacoes de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- 9. Clientes table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  limite_credito NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 10. Contas a pagar
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- 11. Contas a receber
CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

-- 12. Trigger to auto-update estoque on movimentacao
CREATE OR REPLACE FUNCTION public.update_estoque_on_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.produtos SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.produto_id;
  ELSIF NEW.tipo = 'saida' THEN
    -- Check if enough stock
    IF (SELECT estoque_atual FROM public.produtos WHERE id = NEW.produto_id) < NEW.quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente para esta saída';
    END IF;
    UPDATE public.produtos SET estoque_atual = estoque_atual - NEW.quantidade WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_estoque
AFTER INSERT ON public.movimentacoes_estoque
FOR EACH ROW
EXECUTE FUNCTION public.update_estoque_on_movimentacao();

-- 13. Trigger to auto-create profile on signup (admin creates users, so profile is created manually)
-- We'll handle profile creation in application code instead

-- 14. RLS Policies

-- Empresas: users can see their own empresa
CREATE POLICY "Users can view own empresa" ON public.empresas
FOR SELECT TO authenticated
USING (id = public.get_user_empresa_id(auth.uid()));

-- Profiles: users can view profiles in their empresa
CREATE POLICY "Users can view empresa profiles" ON public.profiles
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Admin can insert profiles (for creating users)
CREATE POLICY "Admin can insert profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND empresa_id = public.get_user_empresa_id(auth.uid())
);

-- User Roles: users can view roles in their empresa
CREATE POLICY "Users can view roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

CREATE POLICY "Admin can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fornecedores RLS
CREATE POLICY "Users can view fornecedores" ON public.fornecedores
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert fornecedores" ON public.fornecedores
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can update fornecedores" ON public.fornecedores
FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can delete fornecedores" ON public.fornecedores
FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Produtos RLS
CREATE POLICY "Users can view produtos" ON public.produtos
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert produtos" ON public.produtos
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can update produtos" ON public.produtos
FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can delete produtos" ON public.produtos
FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Movimentacoes RLS
CREATE POLICY "Users can view movimentacoes" ON public.movimentacoes_estoque
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert movimentacoes" ON public.movimentacoes_estoque
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Clientes RLS
CREATE POLICY "Users can view clientes" ON public.clientes
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert clientes" ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can update clientes" ON public.clientes
FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can delete clientes" ON public.clientes
FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Contas a pagar RLS
CREATE POLICY "Users can view contas_pagar" ON public.contas_pagar
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert contas_pagar" ON public.contas_pagar
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can update contas_pagar" ON public.contas_pagar
FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can delete contas_pagar" ON public.contas_pagar
FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Contas a receber RLS
CREATE POLICY "Users can view contas_receber" ON public.contas_receber
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert contas_receber" ON public.contas_receber
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can update contas_receber" ON public.contas_receber
FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can delete contas_receber" ON public.contas_receber
FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));
