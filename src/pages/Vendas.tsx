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
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, CalendarIcon, Filter, ShoppingCart, DollarSign, TrendingUp, Eye, Download, Printer, FilterX, Smartphone } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { gerarVendaPdf } from '@/lib/pdfUtils';

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PREFIX = 'filtro_vendas_';

export default function Vendas() {
  const { user } = useAuth();
  const { lojaId } = useLoja();
  const [items, setItems] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);

  // Form fields
  const [tipoVenda, setTipoVenda] = useState('produto');
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [valorCompra, setValorCompra] = useState('');
  const [dataVenda, setDataVenda] = useState<Date | undefined>(undefined);
  const [temGarantia, setTemGarantia] = useState(false);
  const [garantiaDias, setGarantiaDias] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  // Persistent filters
  const [busca, setBusca] = usePersistedFilter(PREFIX + 'busca', '');
  const [ordem, setOrdem] = usePersistedFilter(PREFIX + 'ordem', 'recente');
  const [filtroMes, setFiltroMes] = usePersistedFilter(PREFIX + 'mes', 'todos');
  const [filtroTipo, setFiltroTipo] = usePersistedFilter(PREFIX + 'tipo', 'todos');
  const [dataInicio, setDataInicio] = usePersistedFilter<string | undefined>(PREFIX + 'dataInicio', undefined);
  const [dataFim, setDataFim] = usePersistedFilter<string | undefined>(PREFIX + 'dataFim', undefined);
  const [valorMin, setValorMin] = usePersistedFilter(PREFIX + 'valorMin', '');
  const [valorMax, setValorMax] = usePersistedFilter(PREFIX + 'valorMax', '');
  const [showFilters, setShowFilters] = useState(false);

  const dataInicioDate = dataInicio ? new Date(dataInicio) : undefined;
  const dataFimDate = dataFim ? new Date(dataFim) : undefined;

  const isCelular = tipoVenda === 'celular';
  const lucroAutoCelular = isCelular ? (parseFloat(valor) || 0) - (parseFloat(valorCompra) || 0) : 0;

  const load = async () => {
    const { data } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    supabase.from('configuracoes').select('*').maybeSingle().then(({ data }) => setConfig(data));
  }, [user]);

  const save = async () => {
    if (isCelular) {
      if (!marca || !modelo || !valor) { toast.error('Preencha marca, modelo e valor de venda'); return; }
    } else {
      if (!produto || !valor) { toast.error('Preencha todos os campos'); return; }
    }
    if (!lojaId) { toast.error('Erro: loja não identificada'); return; }

    const obj: any = {
      valor: parseFloat(valor),
      user_id: user!.id,
      loja_id: lojaId,
      garantia_dias: temGarantia ? (parseInt(garantiaDias) || 0) : 0,
      tipo_venda: tipoVenda,
      marca: isCelular ? marca : null,
      modelo: isCelular ? modelo : null,
      valor_compra: isCelular ? (parseFloat(valorCompra) || 0) : 0,
      lucro_venda: isCelular ? lucroAutoCelular : (parseFloat(valor) || 0),
      produto: isCelular ? `${marca} ${modelo}` : produto,
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
    setTipoVenda('produto'); setProduto(''); setValor(''); setMarca(''); setModelo('');
    setValorCompra(''); setDataVenda(undefined); setTemGarantia(false); setGarantiaDias(''); setEditId(null);
  };

  const remove = async (id: string) => {
    await supabase.from('vendas').delete().eq('id', id);
    toast.success('Venda excluída'); load();
  };

  const edit = (item: any) => {
    setTipoVenda(item.tipo_venda || 'produto');
    setProduto(item.produto);
    setValor(String(item.valor));
    setMarca(item.marca || '');
    setModelo(item.modelo || '');
    setValorCompra(String(item.valor_compra || ''));
    setDataVenda(new Date(item.created_at));
    setTemGarantia((item.garantia_dias || 0) > 0);
    setGarantiaDias(String(item.garantia_dias || ''));
    setEditId(item.id);
  };

  const handlePdf = (item: any, action: 'download' | 'view' | 'print') => {
    gerarVendaPdf(item, config, action);
    toast.success(action === 'download' ? 'PDF baixado' : action === 'view' ? 'PDF aberto' : 'Enviado para impressão');
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (busca) result = result.filter(i => i.produto.toLowerCase().includes(busca.toLowerCase()));
    if (filtroTipo !== 'todos') result = result.filter(i => (i.tipo_venda || 'produto') === filtroTipo);
    if (filtroMes !== 'todos') {
      const monthIdx = meses.indexOf(filtroMes);
      if (monthIdx >= 0) result = result.filter(i => new Date(i.created_at).getMonth() === monthIdx);
    }
    if (dataInicioDate) result = result.filter(i => new Date(i.created_at) >= dataInicioDate);
    if (dataFimDate) {
      const fim = new Date(dataFimDate); fim.setHours(23, 59, 59);
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
  }, [items, busca, filtroMes, filtroTipo, dataInicio, dataFim, valorMin, valorMax, ordem]);

  const totalVendas = filtered.reduce((s, v) => s + Number(v.valor), 0);
  const totalLucro = filtered.reduce((s, v) => s + Number(v.lucro_venda || v.valor), 0);
  const ticketMedio = filtered.length > 0 ? totalVendas / filtered.length : 0;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const hasActiveFilters = busca || filtroMes !== 'todos' || filtroTipo !== 'todos' || dataInicio || dataFim || valorMin || valorMax;

  const clearFilters = () => {
    clearPersistedFilters(PREFIX);
    setBusca(''); setFiltroMes('todos'); setFiltroTipo('todos'); setDataInicio(undefined); setDataFim(undefined);
    setValorMin(''); setValorMax('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Vendas" value={fmt(totalVendas)} icon={ShoppingCart} color="primary" />
        <StatCard title="Quantidade" value={String(filtered.length)} icon={DollarSign} color="warning" />
        <StatCard title="Ticket Médio" value={fmt(ticketMedio)} icon={Smartphone} color="primary" />
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Venda' : 'Nova Venda'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={tipoVenda} onValueChange={setTipoVenda}>
            <SelectTrigger><SelectValue placeholder="Tipo de venda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="produto">Produto comum</SelectItem>
              <SelectItem value="celular">📱 Venda de celular</SelectItem>
              <SelectItem value="assistencia">🔧 Assistência</SelectItem>
            </SelectContent>
          </Select>

          {isCelular ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Marca (ex: Apple)" value={marca} onChange={e => setMarca(e.target.value)} />
                <Input placeholder="Modelo (ex: iPhone 11)" value={modelo} onChange={e => setModelo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Valor de venda" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
                <Input placeholder="Valor de compra" type="number" step="0.01" value={valorCompra} onChange={e => setValorCompra(e.target.value)} />
              </div>
              {valor && valorCompra && (
                <div className={cn("p-3 rounded-lg text-sm font-medium", lucroAutoCelular >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                  Lucro: {fmt(lucroAutoCelular)}
                </div>
              )}
            </>
          ) : (
            <>
              <Input placeholder="Produto" value={produto} onChange={e => setProduto(e.target.value)} />
              <Input placeholder="Valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
            </>
          )}

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
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="celular">Celular</SelectItem>
                    <SelectItem value="assistencia">Assistência</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroMes} onValueChange={setFiltroMes}>
                  <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
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
              <div className="flex gap-2">
                <Input placeholder="Valor mín" type="number" value={valorMin} onChange={e => setValorMin(e.target.value)} />
                <Input placeholder="Valor máx" type="number" value={valorMax} onChange={e => setValorMax(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map(item => {
          const tipo = item.tipo_venda || 'produto';
          const lucro = Number(item.lucro_venda || item.valor);
          return (
            <Card key={item.id} className="shadow-card">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{item.produto}</p>
                    {tipo === 'celular' && <Badge className="bg-primary/10 text-primary text-[10px]">📱 Celular</Badge>}
                    {tipo === 'assistencia' && <Badge className="bg-warning/10 text-warning text-[10px]">🔧 Assistência</Badge>}
                    {(item.garantia_dias || 0) > 0 && <Badge variant="outline" className="text-[10px]">Garantia {item.garantia_dias}d</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{fmt(item.valor)}</span>
                    {tipo === 'celular' && <span className={lucro >= 0 ? 'text-success' : 'text-destructive'}>Lucro: {fmt(lucro)}</span>}
                    <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePdf(item, 'view')} title="Visualizar PDF">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePdf(item, 'download')} title="Baixar PDF">
                    <Download className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePdf(item, 'print')} title="Imprimir">
                    <Printer className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(item)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>}
      </div>
    </div>
  );
}
