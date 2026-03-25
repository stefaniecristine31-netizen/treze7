import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

const tiposDespesa = [
  'Aluguel', 'Água', 'Luz', 'Internet', 'CNPJ', 'Financiamento',
  'Compra Sininho', 'Compra Ana', 'Royalts Leonardo', 'Outro'
];

export default function Despesas() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [tipo, setTipo] = useState('');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('despesas').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!tipo || !valor) { toast.error('Preencha tipo e valor'); return; }
    const obj = { tipo, nome, valor: parseFloat(valor), user_id: user!.id };
    if (editId) {
      await supabase.from('despesas').update(obj).eq('id', editId);
      toast.success('Despesa atualizada');
    } else {
      await supabase.from('despesas').insert(obj);
      toast.success('Despesa registrada');
    }
    setTipo(''); setNome(''); setValor(''); setEditId(null); load();
  };

  const remove = async (id: string) => {
    await supabase.from('despesas').delete().eq('id', id);
    toast.success('Despesa excluída'); load();
  };

  const edit = (item: any) => {
    setTipo(item.tipo); setNome(item.nome || ''); setValor(String(item.valor)); setEditId(item.id);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Despesas</h1>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Despesa' : 'Nova Despesa'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue placeholder="Tipo da despesa" /></SelectTrigger>
            <SelectContent>
              {tiposDespesa.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {tipo === 'Outro' && (
            <Input placeholder="Nome da despesa" value={nome} onChange={e => setNome(e.target.value)} />
          )}
          <Input placeholder="Valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editId && (
              <Button variant="outline" onClick={() => { setEditId(null); setTipo(''); setNome(''); setValor(''); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.tipo}{item.nome ? ` - ${item.nome}` : ''}</p>
                <p className="text-sm text-muted-foreground">
                  {fmt(item.valor)} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => edit(item)}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma despesa encontrada</p>}
      </div>
    </div>
  );
}
