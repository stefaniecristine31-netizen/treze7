
-- User roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'vendedor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- RLS policies for user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-assign admin role on first signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Estoque improvements: add valor_custo, valor_venda, estoque_minimo
ALTER TABLE public.estoque
  ADD COLUMN IF NOT EXISTS valor_custo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_venda numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo integer NOT NULL DEFAULT 0;

-- Vendas improvements: add garantia_dias
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS garantia_dias integer NOT NULL DEFAULT 0;
