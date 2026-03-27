
-- ==========================================
-- Multi-tenant SaaS Architecture Migration
-- ==========================================

-- 1. Create lojas table
CREATE TABLE public.lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'Minha Loja',
  email_responsavel text,
  status text NOT NULL DEFAULT 'ativo',
  pagamento text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- 2. Create super_admins table
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 3. Add loja_id to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
ALTER TABLE public.assistencias ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
ALTER TABLE public.caixa ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
ALTER TABLE public.estoque ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);

-- 4. Despesas improvements
ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS importante boolean NOT NULL DEFAULT false;

-- 5. Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_loja_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT loja_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
$$;

-- 6. Backfill existing data with lojas
DO $$
DECLARE
  r RECORD;
  new_loja_id uuid;
BEGIN
  FOR r IN SELECT DISTINCT p.user_id, p.email FROM public.profiles p WHERE p.loja_id IS NULL
  LOOP
    INSERT INTO public.lojas (nome, email_responsavel)
    VALUES (
      COALESCE((SELECT c.nome_loja FROM public.configuracoes c WHERE c.user_id = r.user_id LIMIT 1), 'Minha Loja'),
      r.email
    )
    RETURNING id INTO new_loja_id;

    UPDATE public.profiles SET loja_id = new_loja_id WHERE user_id = r.user_id;
    UPDATE public.assistencias SET loja_id = new_loja_id WHERE user_id = r.user_id;
    UPDATE public.caixa SET loja_id = new_loja_id WHERE user_id = r.user_id;
    UPDATE public.compras SET loja_id = new_loja_id WHERE user_id = r.user_id;
    UPDATE public.configuracoes SET loja_id = new_loja_id WHERE user_id = r.user_id;
    UPDATE public.despesas SET loja_id = new_loja_id WHERE user_id = r.user_id;
    UPDATE public.estoque SET loja_id = new_loja_id WHERE user_id = r.user_id;
    UPDATE public.vendas SET loja_id = new_loja_id WHERE user_id = r.user_id;
  END LOOP;
END;
$$;

-- 7. Update new user trigger to create lojas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_loja_id uuid;
  codigo_loja text;
  loja_exists boolean;
BEGIN
  codigo_loja := NEW.raw_user_meta_data->>'codigo_loja';

  IF codigo_loja IS NOT NULL AND codigo_loja != '' THEN
    BEGIN
      SELECT EXISTS(SELECT 1 FROM public.lojas WHERE id = codigo_loja::uuid) INTO loja_exists;
      IF loja_exists THEN
        new_loja_id := codigo_loja::uuid;
      ELSE
        INSERT INTO public.lojas (nome, email_responsavel)
        VALUES (COALESCE(NEW.raw_user_meta_data->>'nome', 'Minha Loja'), NEW.email)
        RETURNING id INTO new_loja_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.lojas (nome, email_responsavel)
      VALUES (COALESCE(NEW.raw_user_meta_data->>'nome', 'Minha Loja'), NEW.email)
      RETURNING id INTO new_loja_id;
    END;
  ELSE
    INSERT INTO public.lojas (nome, email_responsavel)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'nome', 'Minha Loja'), NEW.email)
    RETURNING id INTO new_loja_id;
  END IF;

  INSERT INTO public.profiles (user_id, nome, email, loja_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email, new_loja_id);
  RETURN NEW;
END;
$$;

-- Update role trigger: first user of loja = admin, rest = vendedor
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loja uuid;
  user_count integer;
  role_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) INTO role_exists;
  IF role_exists THEN RETURN NEW; END IF;

  SELECT loja_id INTO loja FROM public.profiles WHERE user_id = NEW.id;
  IF loja IS NOT NULL THEN
    SELECT COUNT(*) INTO user_count FROM public.profiles WHERE loja_id = loja;
    IF user_count <= 1 THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
    END IF;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- Add updated_at trigger for lojas
CREATE TRIGGER update_lojas_updated_at
  BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. RLS for lojas
CREATE POLICY "Users read own loja" ON public.lojas
  FOR SELECT TO authenticated
  USING (id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin update lojas" ON public.lojas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 9. RLS for super_admins
CREATE POLICY "Users check own super status" ON public.super_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 10. Update RLS for all data tables to use loja_id

-- assistencias
DROP POLICY IF EXISTS "Users read own assistencias" ON public.assistencias;
DROP POLICY IF EXISTS "Users insert own assistencias" ON public.assistencias;
DROP POLICY IF EXISTS "Users update own assistencias" ON public.assistencias;
DROP POLICY IF EXISTS "Users delete own assistencias" ON public.assistencias;

CREATE POLICY "Loja read assistencias" ON public.assistencias FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Loja insert assistencias" ON public.assistencias FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja update assistencias" ON public.assistencias FOR UPDATE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja delete assistencias" ON public.assistencias FOR DELETE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));

-- caixa
DROP POLICY IF EXISTS "Users read own caixa" ON public.caixa;
DROP POLICY IF EXISTS "Users insert own caixa" ON public.caixa;
DROP POLICY IF EXISTS "Users update own caixa" ON public.caixa;
DROP POLICY IF EXISTS "Users delete own caixa" ON public.caixa;

CREATE POLICY "Loja read caixa" ON public.caixa FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Loja insert caixa" ON public.caixa FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja update caixa" ON public.caixa FOR UPDATE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja delete caixa" ON public.caixa FOR DELETE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));

-- compras
DROP POLICY IF EXISTS "Users read own compras" ON public.compras;
DROP POLICY IF EXISTS "Users insert own compras" ON public.compras;
DROP POLICY IF EXISTS "Users update own compras" ON public.compras;
DROP POLICY IF EXISTS "Users delete own compras" ON public.compras;

CREATE POLICY "Loja read compras" ON public.compras FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Loja insert compras" ON public.compras FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja update compras" ON public.compras FOR UPDATE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja delete compras" ON public.compras FOR DELETE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));

-- configuracoes
DROP POLICY IF EXISTS "Users read own config" ON public.configuracoes;
DROP POLICY IF EXISTS "Users insert own config" ON public.configuracoes;
DROP POLICY IF EXISTS "Users update own config" ON public.configuracoes;

CREATE POLICY "Loja read config" ON public.configuracoes FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Loja insert config" ON public.configuracoes FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja update config" ON public.configuracoes FOR UPDATE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));

-- despesas
DROP POLICY IF EXISTS "Users read own despesas" ON public.despesas;
DROP POLICY IF EXISTS "Users insert own despesas" ON public.despesas;
DROP POLICY IF EXISTS "Users update own despesas" ON public.despesas;
DROP POLICY IF EXISTS "Users delete own despesas" ON public.despesas;

CREATE POLICY "Loja read despesas" ON public.despesas FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Loja insert despesas" ON public.despesas FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja update despesas" ON public.despesas FOR UPDATE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja delete despesas" ON public.despesas FOR DELETE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));

-- estoque
DROP POLICY IF EXISTS "Users read own estoque" ON public.estoque;
DROP POLICY IF EXISTS "Users insert own estoque" ON public.estoque;
DROP POLICY IF EXISTS "Users update own estoque" ON public.estoque;
DROP POLICY IF EXISTS "Users delete own estoque" ON public.estoque;

CREATE POLICY "Loja read estoque" ON public.estoque FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Loja insert estoque" ON public.estoque FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja update estoque" ON public.estoque FOR UPDATE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja delete estoque" ON public.estoque FOR DELETE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));

-- vendas
DROP POLICY IF EXISTS "Users read own vendas" ON public.vendas;
DROP POLICY IF EXISTS "Users insert own vendas" ON public.vendas;
DROP POLICY IF EXISTS "Users update own vendas" ON public.vendas;
DROP POLICY IF EXISTS "Users delete own vendas" ON public.vendas;

CREATE POLICY "Loja read vendas" ON public.vendas FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Loja insert vendas" ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja update vendas" ON public.vendas FOR UPDATE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));
CREATE POLICY "Loja delete vendas" ON public.vendas FOR DELETE TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users read loja profiles" ON public.profiles FOR SELECT TO authenticated
  USING (loja_id = public.get_user_loja_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- user_roles: expand read to loja members, add update for admins
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users read loja roles" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR (
      public.has_role(auth.uid(), 'admin')
      AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.loja_id = public.get_user_loja_id(auth.uid()))
    )
  );

CREATE POLICY "Admins update loja roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (
    user_id != auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.loja_id = public.get_user_loja_id(auth.uid()))
    )
  );
