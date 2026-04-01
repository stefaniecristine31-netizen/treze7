import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePersistedFilter, clearPersistedFilters } from '@/hooks/usePersistedFilter';
import { StatCard } from '@/components/StatCard';
import { ShoppingCart, Receipt, TrendingUp, Wrench, DollarSign, Package, ArrowUpDown, CalendarIcon, FilterX, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const COLORS = ['hsl(221, 83%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(190, 80%, 45%)'];
const PREFIX = 'filtro_dashboard_';

export default function Dashboard() {
  const { user } = useAuth();
  const [vendas, setVendas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [assistencias, setAssistencias] = useState<any[]>([]);

  // Persistent filters
  const [filtro, setFiltro] = usePersistedFilter(PREFIX + 'filtro', 'todos');
  const [dataInicio, setDataInicio] = usePersistedFilter<string | undefined>(PREFIX + 'dataInicio', undefined);
  const [dataFim, setDataFim] = usePersistedFilter<string | undefined>(PREFIX + 'dataFim', undefined);

  const dataInicioDate = dataInicio ? new Date(dataInicio) : undefined;
  const dataFimDate = dataFim ? new Date(dataFim) : undefined;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [v, d, a] = await Promise.all([
        supabase.from('vendas').select('*'),
        supabase.from('despesas').select('*'),
        supabase.from('assistencias').select('*'),
      ]);
      setVendas(v.data || []);
      setDespesas(d.data || []);
      setAssistencias(a.data || []);
    };
    load();
  }, [user]);

  const filtered = useMemo(() => {
    const now = new Date();
    const filterByDate = (items: any[]) => {
      if (filtro === 'periodo' && dataInicioDate) {
        const fim = dataFimDate ? new Date(dataFimDate) : new Date();
        fim.setHours(23, 59, 59);
        return items.filter(i => {
          const d = new Date(i.created_at);
          return d >= dataInicioDate && d <= fim;
        });
      }
      if (filtro === 'todos') return items;
      if (filtro === 'hoje') {
        const today = now.toISOString().slice(0, 10);
        return items.filter(i => i.created_at?.slice(0, 10) === today);
      }
      const monthIdx = meses.indexOf(filtro);
      if (monthIdx >= 0) return items.filter(i => new Date(i.created_at).getMonth() === monthIdx);
      return items;
    };
    return {
      vendas: filterByDate(vendas),
      despesas: filterByDate(despesas),
      assistencias: filterByDate(assistencias),
    };
  }, [vendas, despesas, assistencias, filtro, dataInicio, dataFim]);

  const totalVendas = filtered.vendas.reduce((s, v) => s + Number(v.valor), 0);
  const totalDespesas = filtered.despesas.reduce((s, d) => s + Number(d.valor), 0);
  const lucro = totalVendas - totalDespesas;
  const qtdVendas = filtered.vendas.length;
  const qtdDespesas = filtered.despesas.length;
  const ticketMedio = qtdVendas > 0 ? totalVendas / qtdVendas : 0;

  const custoPecas = filtered.assistencias.reduce((s, a) => s + Number(a.valor_peca), 0);
  const lucroAssist = filtered.assistencias.reduce((s, a) => s + Number(a.lucro), 0);

  const crescimento = useMemo(() => {
    const mesAtual = new Date().getMonth();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const vendasMesAtual = vendas.filter(v => new Date(v.created_at).getMonth() === mesAtual).reduce((s, v) => s + Number(v.valor), 0);
    const vendasMesAnterior = vendas.filter(v => new Date(v.created_at).getMonth() === mesAnterior).reduce((s, v) => s + Number(v.valor), 0);
    if (vendasMesAnterior === 0) return null;
    return ((vendasMesAtual - vendasMesAnterior) / vendasMesAnterior * 100).toFixed(1);
  }, [vendas]);

  const chartData = useMemo(() => {
    return meses.map((m, i) => {
      const mv = vendas.filter(v => new Date(v.created_at).getMonth() === i).reduce((s, v) => s + Number(v.valor), 0);
      const md = despesas.filter(d => new Date(d.created_at).getMonth() === i).reduce((s, d) => s + Number(d.valor), 0);
      return { mes: m.slice(0, 3), vendas: mv, despesas: md, lucro: mv - md };
    });
  }, [vendas, despesas]);

  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.despesas.forEach(d => {
      const key = d.tipo;
      map[key] = (map[key] || 0) + Number(d.valor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered.despesas]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const hasActiveFilters = filtro !== 'todos';

  const clearFilters = () => {
    clearPersistedFilters(PREFIX);
    setFiltro('todos');
    setDataInicio(undefined);
    setDataFim(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="periodo">Período</SelectItem>
              {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {filtro === 'periodo' && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!dataInicioDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dataInicioDate ? format(dataInicioDate, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataInicioDate} onSelect={d => setDataInicio(d?.toISOString())} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!dataFimDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dataFimDate ? format(dataFimDate, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataFimDate} onSelect={d => setDataFim(d?.toISOString())} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
          {hasActiveFilters && (
            <Button variant="destructive" size="sm" onClick={clearFilters}>
              <FilterX className="mr-1 h-3 w-3" />Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Row 1: Main financial cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Total Bruto Vendas" value={fmt(totalVendas)} icon={ShoppingCart} color="primary" />
        <StatCard title="Total Despesas" value={fmt(totalDespesas)} icon={Receipt} color="destructive" />
        <StatCard title="Lucro" value={fmt(lucro)} icon={TrendingUp} color={lucro >= 0 ? 'success' : 'destructive'} />
        <StatCard title="Qtd. Vendas" value={String(qtdVendas)} icon={Hash} color="primary" />
        <StatCard title="Qtd. Despesas" value={String(qtdDespesas)} icon={Hash} color="warning" />
      </div>

      {/* Row 2: Detail cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard title="Ticket Médio" value={fmt(ticketMedio)} icon={ArrowUpDown} color="primary" />
        <StatCard title="Custo Peças" value={fmt(custoPecas)} icon={Package} color="warning" />
        <StatCard
          title="Lucro Assistências"
          value={fmt(lucroAssist)}
          icon={Wrench}
          color={lucroAssist >= 0 ? 'success' : 'destructive'}
          trend={crescimento ? `${Number(crescimento) >= 0 ? '+' : ''}${crescimento}% vs mês anterior` : undefined}
          trendUp={crescimento ? Number(crescimento) >= 0 : undefined}
        />
        <StatCard title="Assistências" value={String(filtered.assistencias.length)} icon={Wrench} color="primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Vendas vs Despesas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="vendas" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} name="Vendas" />
                <Bar dataKey="despesas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Lucro Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="lucro" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            {despesasPorCategoria.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={despesasPorCategoria} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {despesasPorCategoria.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma despesa no período</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
