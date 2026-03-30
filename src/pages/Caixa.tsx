import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/StatCard';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, TrendingDown, Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLoja } from '@/hooks/useLoja';

export default function Caixa() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [tipo, setTipo] = useState('entrada');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const hoje = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const { data } = await supabase.from('caixa').select('*').eq('data', hoje).order('created_at', { ascending: true });
    setItems(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const caixaAberto = items.some(i => i.tipo === 'abertura');
  const caixaFechado = items.some(i => i.tipo === 'fechamento');

  const abrirCaixa = async () => {
    if (!valor) { toast.error('Informe o valor de abertura'); return; }
    await supabase.from('caixa').insert({
      user_id: user!.id, tipo: 'abertura', descricao: 'Abertura de caixa',
      valor: parseFloat(valor), data: hoje,
    });
    setValor(''); toast.success('Caixa aberto'); load();
  };

  const addMovimento = async () => {
    if (!valor || !descricao) { toast.error('Preencha descrição e valor'); return; }
    await supabase.from('caixa').insert({
      user_id: user!.id, tipo, descricao, valor: parseFloat(valor), data: hoje,
    });
    setValor(''); setDescricao(''); toast.success('Movimento registrado'); load();
  };

  const fecharCaixa = async () => {
    await supabase.from('caixa').insert({
      user_id: user!.id, tipo: 'fechamento', descricao: 'Fechamento de caixa',
      valor: saldo, data: hoje,
    });
    toast.success('Caixa fechado'); load();
  };

  const remove = async (id: string) => {
    await supabase.from('caixa').delete().eq('id', id);
    toast.success('Movimento excluído'); load();
  };

  const abertura = items.find(i => i.tipo === 'abertura');
  const entradas = items.filter(i => i.tipo === 'entrada').reduce((s, i) => s + Number(i.valor), 0);
  const saidas = items.filter(i => i.tipo === 'saida').reduce((s, i) => s + Number(i.valor), 0);
  const saldo = (abertura ? Number(abertura.valor) : 0) + entradas - saidas;

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const tipoColor = (t: string) => {
    if (t === 'entrada') return 'default';
    if (t === 'saida') return 'destructive';
    if (t === 'abertura') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Controle de Caixa</h1>
      <p className="text-muted-foreground text-sm">Data: {new Date().toLocaleDateString('pt-BR')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Abertura" value={fmt(abertura ? Number(abertura.valor) : 0)} icon={Unlock} color="primary" />
        <StatCard title="Entradas" value={fmt(entradas)} icon={TrendingUp} color="success" />
        <StatCard title="Saídas" value={fmt(saidas)} icon={TrendingDown} color="destructive" />
        <StatCard title="Saldo" value={fmt(saldo)} icon={DollarSign} color={saldo >= 0 ? 'success' : 'destructive'} />
      </div>

      {!caixaAberto && !caixaFechado && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Abrir Caixa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Valor em caixa" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
            <Button onClick={abrirCaixa} className="w-full">
              <Unlock className="mr-2 h-4 w-4" /> Abrir Caixa
            </Button>
          </CardContent>
        </Card>
      )}

      {caixaAberto && !caixaFechado && (
        <>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Novo Movimento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} />
              <Input placeholder="Valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
              <Button onClick={addMovimento} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Registrar
              </Button>
            </CardContent>
          </Card>

          <Button variant="destructive" onClick={fecharCaixa} className="w-full">
            <Lock className="mr-2 h-4 w-4" /> Fechar Caixa
          </Button>
        </>
      )}

      {caixaFechado && (
        <Card className="shadow-card border-primary">
          <CardContent className="p-4 text-center">
            <Lock className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-semibold text-lg">Caixa Fechado</p>
            <p className="text-muted-foreground">Saldo final: {fmt(saldo)}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={tipoColor(item.tipo)}>{item.tipo}</Badge>
                  <span className="font-medium text-sm">{item.descricao}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {fmt(Number(item.valor))} • {new Date(item.created_at).toLocaleTimeString('pt-BR')}
                </p>
              </div>
              {item.tipo !== 'abertura' && item.tipo !== 'fechamento' && !caixaFechado && (
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
