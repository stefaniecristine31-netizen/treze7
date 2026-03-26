
-- Add OS number column to assistencias
ALTER TABLE public.assistencias ADD COLUMN IF NOT EXISTS numero_os serial;

-- Create storage bucket for logo
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to logos bucket
CREATE POLICY "Users can upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Users can update logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "Users can delete logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "Public can read logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'logos');

-- Create caixa table for daily cash control
CREATE TABLE public.caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL CHECK (tipo IN ('abertura', 'entrada', 'saida', 'fechamento')),
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.caixa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own caixa" ON public.caixa FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own caixa" ON public.caixa FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own caixa" ON public.caixa FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own caixa" ON public.caixa FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create settings table for store config
CREATE TABLE public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome_loja text DEFAULT 'Treze7',
  logo_url text,
  telefone_loja text,
  endereco_loja text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own config" ON public.configuracoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own config" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own config" ON public.configuracoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
