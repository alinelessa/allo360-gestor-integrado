
-- 2. AUDIT LOGS table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs" ON public.audit_logs
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

-- 3. PEDIDOS DE VENDA table
CREATE TABLE public.pedidos_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  cliente_id uuid REFERENCES public.clientes(id),
  numero serial,
  status text NOT NULL DEFAULT 'rascunho',
  subtotal numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  observacao text,
  nota_fiscal text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pedidos_venda" ON public.pedidos_venda
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can insert pedidos_venda" ON public.pedidos_venda
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can update pedidos_venda" ON public.pedidos_venda
  FOR UPDATE USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can delete pedidos_venda" ON public.pedidos_venda
  FOR DELETE USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 4. ITENS DO PEDIDO DE VENDA
CREATE TABLE public.pedido_venda_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_venda(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedido_venda_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pedido_itens" ON public.pedido_venda_itens
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can insert pedido_itens" ON public.pedido_venda_itens
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can update pedido_itens" ON public.pedido_venda_itens
  FOR UPDATE USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can delete pedido_itens" ON public.pedido_venda_itens
  FOR DELETE USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 5. ADD soft delete columns to existing tables
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 6. PEDIDOS DE COMPRA table
CREATE TABLE public.pedidos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  numero serial,
  status text NOT NULL DEFAULT 'rascunho',
  subtotal numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  observacao text,
  nota_fiscal text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pedidos_compra" ON public.pedidos_compra
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can insert pedidos_compra" ON public.pedidos_compra
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can update pedidos_compra" ON public.pedidos_compra
  FOR UPDATE USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can delete pedidos_compra" ON public.pedidos_compra
  FOR DELETE USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 7. ITENS DO PEDIDO DE COMPRA
CREATE TABLE public.pedido_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedido_compra_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pedido_compra_itens" ON public.pedido_compra_itens
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can insert pedido_compra_itens" ON public.pedido_compra_itens
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can update pedido_compra_itens" ON public.pedido_compra_itens
  FOR UPDATE USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Users can delete pedido_compra_itens" ON public.pedido_compra_itens
  FOR DELETE USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 8. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pedidos_venda_updated_at
  BEFORE UPDATE ON public.pedidos_venda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_pedidos_compra_updated_at
  BEFORE UPDATE ON public.pedidos_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 9. Function to finalize sale order (deduct stock + create conta_receber)
CREATE OR REPLACE FUNCTION public.finalizar_pedido_venda(_pedido_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pedido RECORD;
  _item RECORD;
BEGIN
  SELECT * INTO _pedido FROM public.pedidos_venda WHERE id = _pedido_id AND status = 'rascunho';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já finalizado';
  END IF;

  FOR _item IN SELECT * FROM public.pedido_venda_itens WHERE pedido_id = _pedido_id
  LOOP
    INSERT INTO public.movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, observacao)
    VALUES (_pedido.empresa_id, _item.produto_id, 'saida', _item.quantidade, 'Pedido de venda #' || _pedido.numero);
  END LOOP;

  INSERT INTO public.contas_receber (empresa_id, cliente_id, descricao, valor, data_vencimento, status, nota_fiscal)
  VALUES (_pedido.empresa_id, _pedido.cliente_id, 'Pedido de venda #' || _pedido.numero, _pedido.total, (now() + interval '30 days')::date, 'pendente', _pedido.nota_fiscal);

  UPDATE public.pedidos_venda SET status = 'finalizado' WHERE id = _pedido_id;
END;
$$;

-- 10. Function to finalize purchase order (add stock + create conta_pagar)
CREATE OR REPLACE FUNCTION public.finalizar_pedido_compra(_pedido_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pedido RECORD;
  _item RECORD;
BEGIN
  SELECT * INTO _pedido FROM public.pedidos_compra WHERE id = _pedido_id AND status = 'rascunho';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já finalizado';
  END IF;

  FOR _item IN SELECT * FROM public.pedido_compra_itens WHERE pedido_id = _pedido_id
  LOOP
    INSERT INTO public.movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, observacao)
    VALUES (_pedido.empresa_id, _item.produto_id, 'entrada', _item.quantidade, 'Pedido de compra #' || _pedido.numero);
  END LOOP;

  INSERT INTO public.contas_pagar (empresa_id, fornecedor_id, descricao, valor, data_vencimento, status, nota_fiscal)
  VALUES (_pedido.empresa_id, _pedido.fornecedor_id, 'Pedido de compra #' || _pedido.numero, _pedido.total, (now() + interval '30 days')::date, 'pendente', _pedido.nota_fiscal);

  UPDATE public.pedidos_compra SET status = 'finalizado' WHERE id = _pedido_id;
END;
$$;
