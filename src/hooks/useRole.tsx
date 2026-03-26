import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'vendedor';

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRole(null); setLoading(false); return; }

    const load = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setRole((data?.role as AppRole) || 'vendedor');
      setLoading(false);
    };
    load();
  }, [user]);

  const isAdmin = role === 'admin';
  const isVendedor = role === 'vendedor';

  return { role, isAdmin, isVendedor, loading };
}
