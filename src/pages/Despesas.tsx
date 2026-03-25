import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StatCard } from '@/components/StatCard';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, CalendarIcon, Filter, Receipt, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const [dataDespesa, setDataDespesa] = useState<Date | undefined>(undefined);
  const [editId, setEditId] = useState<string | null>(null);

  // Filters
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [valorMin, setValorMin] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('despesas').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!tipo || !valor) { toast.error('Preencha tipo e valor'); return; }
    const obj: any = { tipo, nome, valor: parseFloat(valor), user_id: user!.id };
    if (dataDespesa) obj.created_at = dataDespesa.toISOString();
    if (editId) {
      await supabase.from('despesas').update(obj).eq('id', editId);
      toast.success('Despesa atualizada');
    } else {
      await supabase.from('despesas').insert(obj);
      toast.success('Despesa registrada');
    }
    setTipo(''); setNome(''); setValor(''); setDataDespesa(undefined); setEditId(null); load();
  };

  const remove = async (id: string) => {
    await supabase.from('despesas').delete().eq('id', id);
    toast.success('Despesa excluída'); load();
  };

  const edit = (item: any) => {
    setTipo(item.tipo);
    setNome(item.nome || '');
    setValor(String(item.valor));
    setDataDespesa(new Date(item.created_at));
    setEditId(item.id);
  };

  const filtered = useMemo(() => {
    let result = [...items];

    if (busca) result = result.filter(i =>
      (i.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      i.tipo.toLowerCase().includes(busca.toLowerCase())
    );

    if (filtroTipo !== 'todos') result = result.filter(i => i.tipo === filtroTipo);

    if (dataInicio) result = result.filter(i => new Date(i.created_at) >= dataInicio);
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59);
      result = result.filter(i => new Date(i.created_at) <= fim);
    }

    if (valorMin) result = result.filter(i => Number(i.valor) >= parseFloat(valorMin));

    return result;
  }, [items, busca, filtroTipo, dataInicio, dataFim, valorMin]);

  const totalDespesas = filtered.reduce((s, d) => s + Number(d.valor), 0);
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const clearFilters = () => {
    setBusca(''); setFiltroTipo('todos'); setDataInicio(undefined); setDataFim(undefined); setValorMin('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Despesas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total Despesas" value={fmt(totalDespesas)} icon={Receipt} color="destructive" />
        <StatCard title="Quantidade" value={String(filtered.length)} icon={DollarSign} color="warning" />
      </div>

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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataDespesa && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataDespesa ? format(dataDespesa, "PPP", { locale: ptBR }) : "Data (opcional, padrão: agora)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataDespesa} onSelect={setDataDespesa} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editId && (
              <Button variant="outline" onClick={() => { setEditId(null); setTipo(''); setNome(''); setValor(''); setDataDespesa(undefined); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Buscar despesa..." value={busca} onChange={e => setBusca(e.target.value)} className="flex-1" />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />Filtros
          </Button>
        </div>

        {showFilters && (
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposDespesa.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Input placeholder="Valor mínimo" type="number" value={valorMin} onChange={e => setValorMin(e.target.value)} />
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map(item => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.tipo}{item.nome ? ` - ${item.nome}` : ''}</p>
                <p className="text-sm text-muted-foreground">
                  {fmt(item.valor)} • {new Date(item.created_at).toLocaleString('pt-BR')}
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
