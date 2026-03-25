import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

export default function Vendas() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const load = async () => {
    const { data } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!produto || !valor) { toast.error('Preencha todos os campos'); return; }
    const obj = { produto, valor: parseFloat(valor), user_id: user!.id };
    if (editId) {
      await supabase.from('vendas').update(obj).eq('id', editId);
      toast.success('Venda atualizada');
    } else {
      await supabase.from('vendas').insert(obj);
      toast.success('Venda registrada');
    }
    setProduto(''); setValor(''); setEditId(null); load();
  };

  const remove = async (id: string) => {
    await supabase.from('vendas').delete().eq('id', id);
    toast.success('Venda excluída'); load();
  };

  const edit = (item: any) => {
    setProduto(item.produto); setValor(String(item.valor)); setEditId(item.id);
  };

  const filtered = items.filter(i => i.produto.toLowerCase().includes(busca.toLowerCase()));
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendas</h1>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Venda' : 'Nova Venda'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Produto" value={produto} onChange={e => setProduto(e.target.value)} />
          <Input placeholder="Valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editId && (
              <Button variant="outline" onClick={() => { setEditId(null); setProduto(''); setValor(''); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Input placeholder="Buscar venda..." value={busca} onChange={e => setBusca(e.target.value)} />

      <div className="space-y-2">
        {filtered.map(item => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.produto}</p>
                <p className="text-sm text-muted-foreground">
                  {fmt(item.valor)} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => edit(item)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>}
      </div>
    </div>
  );
}
