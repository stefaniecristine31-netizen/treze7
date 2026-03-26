import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, CalendarIcon, Filter, ShoppingCart, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { gerarVendaPdf } from '@/lib/pdfUtils';

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Vendas() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
  const [dataVenda, setDataVenda] = useState<Date | undefined>(undefined);
  const [temGarantia, setTemGarantia] = useState(false);
  const [garantiaDias, setGarantiaDias] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('recente');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    supabase.from('configuracoes').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setConfig(data));
  }, [user]);

  const save = async () => {
    if (!produto || !valor) { toast.error('Preencha todos os campos'); return; }
    const obj: any = {
      produto, valor: parseFloat(valor), user_id: user!.id,
      garantia_dias: temGarantia ? (parseInt(garantiaDias) || 0) : 0,
    };
    if (dataVenda) obj.created_at = dataVenda.toISOString();
    if (editId) {
      await supabase.from('vendas').update(obj).eq('id', editId);
      toast.success('Venda atualizada');
    } else {
      await supabase.from('vendas').insert(obj);
      toast.success('Venda registrada');
    }
    resetForm(); load();
  };

  const resetForm = () => {
    setProduto(''); setValor(''); setDataVenda(undefined); setTemGarantia(false); setGarantiaDias(''); setEditId(null);
  };

  const remove = async (id: string) => {
    await supabase.from('vendas').delete().eq('id', id);
    toast.success('Venda excluída'); load();
  };

  const edit = (item: any) => {
    setProduto(item.produto);
    setValor(String(item.valor));
    setDataVenda(new Date(item.created_at));
    setTemGarantia((item.garantia_dias || 0) > 0);
    setGarantiaDias(String(item.garantia_dias || ''));
    setEditId(item.id);
  };

  const downloadPdf = (item: any) => {
    gerarVendaPdf(item, config);
    toast.success('PDF da venda gerado');
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (busca) result = result.filter(i => i.produto.toLowerCase().includes(busca.toLowerCase()));
    if (filtroMes !== 'todos') {
      const monthIdx = meses.indexOf(filtroMes);
      if (monthIdx >= 0) result = result.filter(i => new Date(i.created_at).getMonth() === monthIdx);
    }
    if (dataInicio) result = result.filter(i => new Date(i.created_at) >= dataInicio);
    if (dataFim) {
      const fim = new Date(dataFim); fim.setHours(23, 59, 59);
      result = result.filter(i => new Date(i.created_at) <= fim);
    }
    if (valorMin) result = result.filter(i => Number(i.valor) >= parseFloat(valorMin));
    if (valorMax) result = result.filter(i => Number(i.valor) <= parseFloat(valorMax));
    switch (ordem) {
      case 'antigo': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'maior': result.sort((a, b) => Number(b.valor) - Number(a.valor)); break;
      case 'menor': result.sort((a, b) => Number(a.valor) - Number(b.valor)); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [items, busca, filtroMes, dataInicio, dataFim, valorMin, valorMax, ordem]);

  const totalVendas = filtered.reduce((s, v) => s + Number(v.valor), 0);
  const ticketMedio = filtered.length > 0 ? totalVendas / filtered.length : 0;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const clearFilters = () => {
    setBusca(''); setFiltroMes('todos'); setDataInicio(undefined); setDataFim(undefined);
    setValorMin(''); setValorMax('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Vendas" value={fmt(totalVendas)} icon={ShoppingCart} color="primary" />
        <StatCard title="Quantidade" value={String(filtered.length)} icon={DollarSign} color="warning" />
        <StatCard title="Ticket Médio" value={fmt(ticketMedio)} icon={TrendingUp} color="success" />
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Venda' : 'Nova Venda'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Produto" value={produto} onChange={e => setProduto(e.target.value)} />
          <Input placeholder="Valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataVenda && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataVenda ? format(dataVenda, "PPP", { locale: ptBR }) : "Data (opcional, padrão: agora)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataVenda} onSelect={setDataVenda} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch id="garantia" checked={temGarantia} onCheckedChange={setTemGarantia} />
            <Label htmlFor="garantia" className="text-sm">Ativar garantia</Label>
            {temGarantia && (
              <Input placeholder="Dias de garantia" type="number" value={garantiaDias} onChange={e => setGarantiaDias(e.target.value)} className="w-32 ml-auto" />
            )}
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
          <Input placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} className="flex-1" />
          <Select value={ordem} onValueChange={setOrdem}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recente">Mais recentes</SelectItem>
              <SelectItem value="antigo">Mais antigas</SelectItem>
              <SelectItem value="maior">Maior valor</SelectItem>
              <SelectItem value="menor">Menor valor</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />Filtros
          </Button>
        </div>

        {showFilters && (
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={filtroMes} onValueChange={setFiltroMes}>
                  <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
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
                <div className="flex gap-2">
                  <Input placeholder="Valor mín" type="number" value={valorMin} onChange={e => setValorMin(e.target.value)} />
                  <Input placeholder="Valor máx" type="number" value={valorMax} onChange={e => setValorMax(e.target.value)} />
                </div>
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
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.produto}</p>
                  {(item.garantia_dias || 0) > 0 && (
                    <Badge variant="outline" className="text-xs">Garantia {item.garantia_dias}d</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {fmt(item.valor)} • {new Date(item.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => downloadPdf(item)} title="Gerar PDF">
                  <FileText className="h-4 w-4 text-primary" />
                </Button>
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
