import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'vendedor';

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRole(null); setIsSuperAdmin(false); setLoading(false); return; }

    const load = async () => {
      const [roleRes, superRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
        (supabase as any).from('super_admins').select('id').eq('user_id', user.id).maybeSingle(),
      ]);
      setRole((roleRes.data?.role as AppRole) || 'vendedor');
      setIsSuperAdmin(!!superRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  const isAdmin = role === 'admin' || isSuperAdmin;
  const isVendedor = role === 'vendedor' && !isSuperAdmin;

  return { role, isAdmin, isVendedor, isSuperAdmin, loading };
}
