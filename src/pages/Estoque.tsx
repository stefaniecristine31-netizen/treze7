import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

export default function Estoque() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [produto, setProduto] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('estoque').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!produto || !quantidade) { toast.error('Preencha todos os campos'); return; }
    const obj = { produto, quantidade: parseInt(quantidade), user_id: user!.id };
    if (editId) {
      await supabase.from('estoque').update(obj).eq('id', editId);
      toast.success('Estoque atualizado');
    } else {
      await supabase.from('estoque').insert(obj);
      toast.success('Item adicionado ao estoque');
    }
    setProduto(''); setQuantidade(''); setEditId(null); load();
  };

  const remove = async (id: string) => {
    await supabase.from('estoque').delete().eq('id', id);
    toast.success('Item removido'); load();
  };

  const edit = (item: any) => {
    setProduto(item.produto); setQuantidade(String(item.quantidade)); setEditId(item.id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Estoque</h1>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Item' : 'Novo Item'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Produto" value={produto} onChange={e => setProduto(e.target.value)} />
          <Input placeholder="Quantidade" type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editId && <Button variant="outline" onClick={() => { setEditId(null); setProduto(''); setQuantidade(''); }}><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.produto}</p>
                <p className="text-sm text-muted-foreground">Quantidade: {item.quantidade}</p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => edit(item)}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">Estoque vazio</p>}
      </div>
    </div>
  );
}
