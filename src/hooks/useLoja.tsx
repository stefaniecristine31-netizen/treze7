import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useLoja() {
  const { user } = useAuth();
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [loja, setLoja] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLojaId(null); setLoja(null); setLoading(false); return; }

    const load = async () => {
      const { data: profile } = await (supabase as any).from('profiles').select('loja_id').eq('user_id', user.id).maybeSingle();
      if (profile?.loja_id) {
        setLojaId(profile.loja_id);
        const { data: lojaData } = await (supabase as any).from('lojas').select('*').eq('id', profile.loja_id).maybeSingle();
        setLoja(lojaData);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return { lojaId, loja, loading };
}
