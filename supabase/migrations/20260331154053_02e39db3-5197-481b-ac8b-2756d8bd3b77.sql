
CREATE TABLE public.precos_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id),
  marca text NOT NULL,
  modelo text NOT NULL,
  servico text NOT NULL,
  valor_peca numeric NOT NULL DEFAULT 0,
  frete numeric NOT NULL DEFAULT 0,
  mao_de_obra numeric NOT NULL DEFAULT 0,
  lucro_loja numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.precos_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loja read precos" ON public.precos_servicos FOR SELECT TO authenticated
  USING (loja_id = get_user_loja_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Loja insert precos" ON public.precos_servicos FOR INSERT TO authenticated
  WITH CHECK (loja_id = get_user_loja_id(auth.uid()));

CREATE POLICY "Loja update precos" ON public.precos_servicos FOR UPDATE TO authenticated
  USING (loja_id = get_user_loja_id(auth.uid()));

CREATE POLICY "Loja delete precos" ON public.precos_servicos FOR DELETE TO authenticated
  USING (loja_id = get_user_loja_id(auth.uid()));

CREATE TRIGGER update_precos_servicos_updated_at
  BEFORE UPDATE ON public.precos_servicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
