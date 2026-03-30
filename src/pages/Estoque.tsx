import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Search, AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLoja } from '@/hooks/useLoja';

export default function Estoque() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [produto, setProduto] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorCusto, setValorCusto] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const load = async () => {
    const { data } = await supabase.from('estoque').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!produto || !quantidade) { toast.error('Preencha produto e quantidade'); return; }
    const obj: any = {
      produto, quantidade: parseInt(quantidade),
      valor_custo: parseFloat(valorCusto) || 0,
      valor_venda: parseFloat(valorVenda) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      user_id: user!.id,
    };
    if (editId) {
      await supabase.from('estoque').update(obj).eq('id', editId);
      toast.success('Estoque atualizado');
    } else {
      await supabase.from('estoque').insert(obj);
      toast.success('Item adicionado ao estoque');
    }
    resetForm(); load();
  };

  const remove = async (id: string) => {
    await supabase.from('estoque').delete().eq('id', id);
    toast.success('Item removido'); load();
  };

  const edit = (item: any) => {
    setProduto(item.produto);
    setQuantidade(String(item.quantidade));
    setValorCusto(String(item.valor_custo || 0));
    setValorVenda(String(item.valor_venda || 0));
    setEstoqueMinimo(String(item.estoque_minimo || 0));
    setEditId(item.id);
  };

  const resetForm = () => {
    setProduto(''); setQuantidade(''); setValorCusto(''); setValorVenda(''); setEstoqueMinimo(''); setEditId(null);
  };

  const filtered = useMemo(() => {
    if (!busca) return items;
    return items.filter(i => i.produto.toLowerCase().includes(busca.toLowerCase()));
  }, [items, busca]);

  const alertas = items.filter(i => i.estoque_minimo > 0 && i.quantidade <= i.estoque_minimo);
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Estoque</h1>

      {alertas.length > 0 && (
        <Card className="border-warning/50 bg-warning/5 shadow-card">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Estoque baixo!</p>
              <p className="text-sm text-muted-foreground">
                {alertas.map(a => `${a.produto} (${a.quantidade} un.)`).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Item' : 'Novo Item'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Produto *" value={produto} onChange={e => setProduto(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Quantidade *" type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
            <Input placeholder="Estoque mínimo" type="number" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Valor de custo" type="number" step="0.01" value={valorCusto} onChange={e => setValorCusto(e.target.value)} />
            <Input placeholder="Valor de venda" type="number" step="0.01" value={valorVenda} onChange={e => setValorVenda(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editId && <Button variant="outline" onClick={resetForm}><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(item => {
          const lowStock = item.estoque_minimo > 0 && item.quantidade <= item.estoque_minimo;
          return (
            <Card key={item.id} className={`shadow-card ${lowStock ? 'border-warning/50' : ''}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.produto}</p>
                    {lowStock && <Badge variant="outline" className="text-warning border-warning text-xs">Baixo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Qtd: {item.quantidade}
                    {item.estoque_minimo > 0 && ` (mín: ${item.estoque_minimo})`}
                  </p>
                  {(item.valor_custo > 0 || item.valor_venda > 0) && (
                    <p className="text-sm text-muted-foreground">
                      {item.valor_custo > 0 && `Custo: ${fmt(item.valor_custo)}`}
                      {item.valor_custo > 0 && item.valor_venda > 0 && ' • '}
                      {item.valor_venda > 0 && `Venda: ${fmt(item.valor_venda)}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => edit(item)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Estoque vazio</p>}
      </div>
    </div>
  );
}
