import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

export default function Compras() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [produto, setProduto] = useState('');
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('compras').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!produto) { toast.error('Preencha o produto'); return; }
    const obj = { produto, cliente, telefone, user_id: user!.id };
    if (editId) {
      await supabase.from('compras').update(obj).eq('id', editId);
      toast.success('Compra atualizada');
    } else {
      await supabase.from('compras').insert(obj);
      toast.success('Compra registrada');
    }
    setProduto(''); setCliente(''); setTelefone(''); setEditId(null); load();
  };

  const remove = async (id: string) => {
    await supabase.from('compras').delete().eq('id', id);
    toast.success('Compra excluída'); load();
  };

  const edit = (item: any) => {
    setProduto(item.produto); setCliente(item.cliente || ''); setTelefone(item.telefone || ''); setEditId(item.id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compras</h1>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Compra' : 'Nova Compra'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Produto" value={produto} onChange={e => setProduto(e.target.value)} />
          <Input placeholder="Cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
          <Input placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editId && <Button variant="outline" onClick={() => { setEditId(null); setProduto(''); setCliente(''); setTelefone(''); }}><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.produto}</p>
                <p className="text-sm text-muted-foreground">
                  {item.cliente && `${item.cliente} • `}{item.telefone && `${item.telefone} • `}
                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => edit(item)}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma compra encontrada</p>}
      </div>
    </div>
  );
}
