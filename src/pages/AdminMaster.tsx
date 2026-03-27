import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Store, Users, CreditCard, Ban, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';

export default function AdminMaster() {
  const [lojas, setLojas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const load = async () => {
    const { data: lojasData } = await (supabase as any).from('lojas').select('*').order('created_at', { ascending: false });
    const { data: profilesData } = await (supabase as any).from('profiles').select('*');
    setLojas(lojasData || []);
    setProfiles(profilesData || []);
  };

  useEffect(() => { load(); }, []);

  const togglePagamento = async (lojaId: string, current: string) => {
    const novo = current === 'ativo' ? 'pendente' : 'ativo';
    await (supabase as any).from('lojas').update({ pagamento: novo }).eq('id', lojaId);
    toast.success(`Pagamento alterado para ${novo}`);
    load();
  };

  const toggleStatus = async (lojaId: string, current: string) => {
    const novo = current === 'ativo' ? 'bloqueado' : 'ativo';
    await (supabase as any).from('lojas').update({ status: novo }).eq('id', lojaId);
    toast.success(`Status alterado para ${novo}`);
    load();
  };

  const lojasAtivas = lojas.filter(l => l.status === 'ativo').length;
  const pagamentosPendentes = lojas.filter(l => l.pagamento === 'pendente').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Master</h1>
          <p className="text-sm text-muted-foreground">Controle total de todas as lojas do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total Lojas" value={String(lojas.length)} icon={Store} color="primary" />
        <StatCard title="Lojas Ativas" value={String(lojasAtivas)} icon={CheckCircle} color="success" />
        <StatCard title="Pgto Pendente" value={String(pagamentosPendentes)} icon={CreditCard} color="warning" />
        <StatCard title="Total Usuários" value={String(profiles.length)} icon={Users} color="primary" />
      </div>

      <div className="space-y-3">
        {lojas.map(loja => {
          const lojaUsers = profiles.filter(p => p.loja_id === loja.id);
          return (
            <Card key={loja.id} className={`shadow-card ${loja.status === 'bloqueado' ? 'border-destructive/50 opacity-75' : ''}`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-lg">{loja.nome}</p>
                      <Badge variant={loja.status === 'ativo' ? 'default' : 'destructive'}>
                        {loja.status === 'ativo' ? '✅ Ativo' : '🚫 Bloqueado'}
                      </Badge>
                      <Badge variant={loja.pagamento === 'ativo' ? 'secondary' : 'outline'} className={loja.pagamento === 'pendente' ? 'border-warning text-warning' : ''}>
                        {loja.pagamento === 'ativo' ? '💰 Pago' : '⏳ Pendente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">📧 {loja.email_responsavel || '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastro: {new Date(loja.created_at).toLocaleDateString('pt-BR')} • {lojaUsers.length} usuário(s)
                    </p>
                    {lojaUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lojaUsers.map(u => (
                          <Badge key={u.id} variant="outline" className="text-xs">
                            {u.nome || u.email}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={loja.pagamento === 'ativo' ? 'outline' : 'default'}
                      onClick={() => togglePagamento(loja.id, loja.pagamento)}
                    >
                      <CreditCard className="mr-1 h-4 w-4" />
                      {loja.pagamento === 'ativo' ? 'Bloquear Pgto' : 'Liberar Pgto'}
                    </Button>
                    <Button
                      size="sm"
                      variant={loja.status === 'ativo' ? 'destructive' : 'default'}
                      onClick={() => toggleStatus(loja.id, loja.status)}
                    >
                      {loja.status === 'ativo' ? <Ban className="mr-1 h-4 w-4" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                      {loja.status === 'ativo' ? 'Bloquear' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {lojas.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma loja cadastrada</p>}
      </div>
    </div>
  );
}
