
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vendas
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  assistencia_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own vendas" ON public.vendas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vendas" ON public.vendas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vendas" ON public.vendas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own vendas" ON public.vendas FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Despesas
CREATE TABLE public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own despesas" ON public.despesas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own despesas" ON public.despesas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own despesas" ON public.despesas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own despesas" ON public.despesas FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON public.despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assistencias
CREATE TABLE public.assistencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente TEXT NOT NULL,
  telefone TEXT,
  aparelho TEXT,
  servico TEXT,
  valor_servico NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_peca NUMERIC(12,2) NOT NULL DEFAULT 0,
  frete NUMERIC(12,2) NOT NULL DEFAULT 0,
  mao_de_obra NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro NUMERIC(12,2) NOT NULL DEFAULT 0,
  tecnico TEXT,
  garantia TEXT,
  status TEXT NOT NULL DEFAULT 'Em andamento',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own assistencias" ON public.assistencias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own assistencias" ON public.assistencias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own assistencias" ON public.assistencias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own assistencias" ON public.assistencias FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_assistencias_updated_at BEFORE UPDATE ON public.assistencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Estoque
CREATE TABLE public.estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own estoque" ON public.estoque FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own estoque" ON public.estoque FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own estoque" ON public.estoque FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own estoque" ON public.estoque FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Compras
CREATE TABLE public.compras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto TEXT NOT NULL,
  cliente TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own compras" ON public.compras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own compras" ON public.compras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own compras" ON public.compras FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own compras" ON public.compras FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
