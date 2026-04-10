import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLoja } from '@/hooks/useLoja';
import { usePersistedFilter, clearPersistedFilters } from '@/hooks/usePersistedFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StatCard } from '@/components/StatCard';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, CalendarIcon, Filter, FilterX, Receipt, DollarSign, Star, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const tiposDespesa = [
  'Aluguel', 'Água', 'Luz', 'Internet', 'CNPJ', 'Financiamento', 'Outro'
];

const PREFIX = 'filtro_despesas_';

export default function Despesas() {
  const { user } = useAuth();
  const { lojaId } = useLoja();
  const [items, setItems] = useState<any[]>([]);
  const [tipo, setTipo] = useState('');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [dataDespesa, setDataDespesa] = useState<Date | undefined>(undefined);
  const [recorrente, setRecorrente] = useState(false);
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>(undefined);
  const [pago, setPago] = useState(false);
  const [importante, setImportante] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Persistent filters
  const [busca, setBusca] = usePersistedFilter(PREFIX + 'busca', '');
  const [filtroTipo, setFiltroTipo] = usePersistedFilter(PREFIX + 'tipo', 'todos');
  const [filtroPago, setFiltroPago] = usePersistedFilter(PREFIX + 'pago', 'todos');
  const [dataInicio, setDataInicio] = usePersistedFilter<string | undefined>(PREFIX + 'dataInicio', undefined);
  const [dataFim, setDataFim] = usePersistedFilter<string | undefined>(PREFIX + 'dataFim', undefined);
  const [showFilters, setShowFilters] = useState(false);

  const dataInicioDate = dataInicio ? new Date(dataInicio) : undefined;
  const dataFimDate = dataFim ? new Date(dataFim) : undefined;

  const load = async () => {
    if (!lojaId) return;
    const { data } = await supabase.from('despesas').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { if (user && lojaId) load(); }, [user, lojaId]);

  const save = async () => {
    if (!tipo || !valor) { toast.error('Preencha tipo e valor'); return; }
    if (!lojaId) { toast.error('Erro: loja não identificada'); return; }
    const obj: any = {
      tipo, nome, valor: parseFloat(valor), user_id: user!.id, loja_id: lojaId,
      recorrente, pago, importante,
      data_vencimento: dataVencimento ? format(dataVencimento, 'yyyy-MM-dd') : null,
    };
    if (dataDespesa) obj.created_at = dataDespesa.toISOString();
    if (editId) {
      await supabase.from('despesas').update(obj).eq('id', editId);
      toast.success('Despesa atualizada');
    } else {
      await supabase.from('despesas').insert(obj);
      toast.success('Despesa registrada');
    }
    resetForm(); load();
  };

  const resetForm = () => {
    setTipo(''); setNome(''); setValor(''); setDataDespesa(undefined);
    setRecorrente(false); setDataVencimento(undefined); setPago(false); setImportante(false);
    setEditId(null);
  };

  const remove = async (id: string) => {
    await supabase.from('despesas').delete().eq('id', id);
    toast.success('Despesa excluída'); load();
  };

  const togglePago = async (item: any) => {
    await supabase.from('despesas').update({ pago: !item.pago }).eq('id', item.id);
    toast.success(item.pago ? 'Marcada como pendente' : 'Marcada como paga');
    load();
  };

  const edit = (item: any) => {
    setTipo(item.tipo);
    setNome(item.nome || '');
    setValor(String(item.valor));
    setDataDespesa(new Date(item.created_at));
    setRecorrente(item.recorrente || false);
    setDataVencimento(item.data_vencimento ? new Date(item.data_vencimento + 'T00:00:00') : undefined);
    setPago(item.pago || false);
    setImportante(item.importante || false);
    setEditId(item.id);
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (busca) result = result.filter(i =>
      (i.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      i.tipo.toLowerCase().includes(busca.toLowerCase())
    );
    if (filtroTipo !== 'todos') result = result.filter(i => i.tipo === filtroTipo);
    if (filtroPago === 'pago') result = result.filter(i => i.pago);
    if (filtroPago === 'pendente') result = result.filter(i => !i.pago);
    if (dataInicioDate) result = result.filter(i => new Date(i.created_at) >= dataInicioDate);
    if (dataFimDate) {
      const fim = new Date(dataFimDate); fim.setHours(23, 59, 59);
      result = result.filter(i => new Date(i.created_at) <= fim);
    }
    return result;
  }, [items, busca, filtroTipo, filtroPago, dataInicio, dataFim]);

  const totalDespesas = filtered.reduce((s, d) => s + Number(d.valor), 0);
  const pendentes = filtered.filter(d => !d.pago).length;
  const vencendo = items.filter(d => {
    if (!d.data_vencimento || d.pago) return false;
    const dias = differenceInDays(new Date(d.data_vencimento), new Date());
    return dias >= 0 && dias <= 3;
  });
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const hasActiveFilters = busca || filtroTipo !== 'todos' || filtroPago !== 'todos' || dataInicio || dataFim;

  const clearFilters = () => {
    clearPersistedFilters(PREFIX);
    setBusca(''); setFiltroTipo('todos'); setFiltroPago('todos'); setDataInicio(undefined); setDataFim(undefined);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Despesas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Despesas" value={fmt(totalDespesas)} icon={Receipt} color="destructive" />
        <StatCard title="Pendentes" value={String(pendentes)} icon={DollarSign} color="warning" />
        <StatCard title="Quantidade" value={String(filtered.length)} icon={Receipt} color="primary" />
      </div>

      {vencendo.length > 0 && (
        <Card className="border-warning/50 bg-warning/5 shadow-card">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">⚠️ Despesas próximas do vencimento!</p>
              <p className="text-sm text-muted-foreground">
                {vencendo.map(d => `${d.tipo}${d.nome ? ` - ${d.nome}` : ''} (${format(new Date(d.data_vencimento), 'dd/MM')})`).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataDespesa && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataDespesa ? format(dataDespesa, "PPP", { locale: ptBR }) : "Data (padrão: agora)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataDespesa} onSelect={setDataDespesa} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataVencimento && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataVencimento ? format(dataVencimento, "dd/MM/yyyy") : "Vencimento (opcional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataVencimento} onSelect={setDataVencimento} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Switch id="recorrente" checked={recorrente} onCheckedChange={setRecorrente} />
              <Label htmlFor="recorrente" className="text-sm flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Recorrente</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pago" checked={pago} onCheckedChange={setPago} />
              <Label htmlFor="pago" className="text-sm flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Pago</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="importante" checked={importante} onCheckedChange={setImportante} />
              <Label htmlFor="importante" className="text-sm flex items-center gap-1"><Star className="h-3 w-3" /> Importante</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editId && (
              <Button variant="outline" onClick={resetForm}><X className="h-4 w-4" /></Button>
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
          {hasActiveFilters && (
            <Button variant="destructive" size="sm" onClick={clearFilters}>
              <FilterX className="mr-2 h-4 w-4" />Limpar filtros
            </Button>
          )}
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
                <Select value={filtroPago} onValueChange={setFiltroPago}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicioDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicioDate ? format(dataInicioDate, "dd/MM/yyyy") : "Data início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataInicioDate} onSelect={d => setDataInicio(d?.toISOString())} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFimDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFimDate ? format(dataFimDate, "dd/MM/yyyy") : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataFimDate} onSelect={d => setDataFim(d?.toISOString())} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map(item => {
          const venc = item.data_vencimento ? differenceInDays(new Date(item.data_vencimento), new Date()) : null;
          const nearDue = venc !== null && venc >= 0 && venc <= 3 && !item.pago;
          const overdue = venc !== null && venc < 0 && !item.pago;
          return (
            <Card key={item.id} className={`shadow-card ${overdue ? 'border-destructive/50' : nearDue ? 'border-warning/50' : ''}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{item.tipo}{item.nome ? ` - ${item.nome}` : ''}</p>
                    {item.importante && <Badge variant="outline" className="text-xs border-warning text-warning">⭐ Importante</Badge>}
                    {item.recorrente && <Badge variant="outline" className="text-xs">🔄 Recorrente</Badge>}
                    <Badge variant={item.pago ? 'default' : 'destructive'} className="text-xs">
                      {item.pago ? '✅ Pago' : '⏳ Pendente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {fmt(item.valor)} • {new Date(item.created_at).toLocaleString('pt-BR')}
                    {item.data_vencimento && ` • Venc: ${format(new Date(item.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}`}
                  </p>
                  {overdue && <p className="text-xs text-destructive font-semibold">⚠️ Vencida!</p>}
                  {nearDue && <p className="text-xs text-warning font-semibold">⏰ Vence em {venc} dia(s)</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => togglePago(item)} title={item.pago ? 'Marcar pendente' : 'Marcar pago'}>
                    <CheckCircle className={`h-4 w-4 ${item.pago ? 'text-success' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => edit(item)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma despesa encontrada</p>}
      </div>
    </div>
  );
}
