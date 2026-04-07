import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePersistedFilter, clearPersistedFilters } from '@/hooks/usePersistedFilter';
import { StatCard } from '@/components/StatCard';
import {
  ShoppingCart, Receipt, TrendingUp, Wrench, DollarSign, Package,
  ArrowUpDown, CalendarIcon, FilterX, Hash, Percent, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const COLORS = ['hsl(221, 83%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(190, 80%, 45%)'];
const PREFIX = 'filtro_dashboard_';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [vendas, setVendas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [assistencias, setAssistencias] = useState<any[]>([]);
  const [caixa, setCaixa] = useState<any[]>([]);

  const [filtro, setFiltro] = usePersistedFilter(PREFIX + 'filtro', 'todos');
  const [dataInicio, setDataInicio] = usePersistedFilter<string | undefined>(PREFIX + 'dataInicio', undefined);
  const [dataFim, setDataFim] = usePersistedFilter<string | undefined>(PREFIX + 'dataFim', undefined);

  const dataInicioDate = dataInicio ? new Date(dataInicio) : undefined;
  const dataFimDate = dataFim ? new Date(dataFim) : undefined;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const [v, d, a, c] = await Promise.all([
        supabase.from('vendas').select('*'),
        supabase.from('despesas').select('*'),
        supabase.from('assistencias').select('*'),
        supabase.from('caixa').select('*').eq('data', hoje).order('created_at', { ascending: true }),
      ]);
      setVendas(v.data || []);
      setDespesas(d.data || []);
      setAssistencias(a.data || []);
      setCaixa(c.data || []);
    };
    load();
  }, [user]);

  // === FILTER LOGIC ===
  const filterByDate = (items: any[]) => {
    const now = new Date();
    if (filtro === 'todos') return items;
    if (filtro === 'hoje') {
      const today = now.toISOString().slice(0, 10);
      return items.filter(i => i.created_at?.slice(0, 10) === today);
    }
    if (filtro === 'este_mes') {
      return items.filter(i => {
        const d = new Date(i.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    if (filtro === 'este_ano') {
      return items.filter(i => new Date(i.created_at).getFullYear() === now.getFullYear());
    }
    if (filtro === 'periodo' && dataInicioDate) {
      const fim = dataFimDate ? new Date(dataFimDate) : new Date();
      fim.setHours(23, 59, 59);
      return items.filter(i => {
        const d = new Date(i.created_at);
        return d >= dataInicioDate && d <= fim;
      });
    }
    const monthIdx = meses.indexOf(filtro);
    if (monthIdx >= 0) return items.filter(i => new Date(i.created_at).getMonth() === monthIdx);
    return items;
  };

  const filtered = useMemo(() => ({
    vendas: filterByDate(vendas),
    despesas: filterByDate(despesas),
    assistencias: filterByDate(assistencias),
  }), [vendas, despesas, assistencias, filtro, dataInicio, dataFim]);

  // === CALCULATIONS (corrected per user rules) ===
  // Total Bruto = vendas (produto + celular) + assistências (valor_servico)
  // Exclui vendas tipo 'assistencia' pois são apenas o lucro já lançado
  const vendasProdutoCelular = filtered.vendas.filter(v => !(v.produto || '').startsWith('Assistência -'));
  const totalVendasProdCel = vendasProdutoCelular.reduce((s, v) => s + Number(v.valor), 0);
  const assistenciasEntregues = filtered.assistencias.filter(a => a.status === 'Entregue');
  const totalBrutoAssist = assistenciasEntregues.reduce((s, a) => s + Number(a.valor_servico), 0);
  const totalBruto = totalVendasProdCel + totalBrutoAssist;
  const totalVendas = filtered.vendas.reduce((s, v) => s + Number(v.valor), 0);

  // Lucro Líquido = Sum(vendas.lucro_venda) — usa o lucro real de cada venda
  const lucroLiquido = filtered.vendas.reduce((s, v) => s + Number(v.lucro_venda || v.valor), 0);

  // Custo Peças (assistências) = valor_servico - lucro for each
  const custoPecas = assistenciasEntregues.reduce((s, a) => s + (Number(a.valor_servico) - Number(a.lucro)), 0);

  // Despesas
  const totalDespesas = filtered.despesas.reduce((s, d) => s + Number(d.valor), 0);

  // Margem de Lucro
  const margemLucro = totalBruto > 0 ? (lucroLiquido / totalBruto) * 100 : 0;

  // Volumes
  const qtdVendas = filtered.vendas.length;
  const qtdDespesas = filtered.despesas.length;
  const qtdAssistencias = filtered.assistencias.length;
  const ticketMedio = qtdVendas > 0 ? totalVendas / qtdVendas : 0;

  // Saldo do Caixa (hoje)
  const saldoCaixa = useMemo(() => {
    return caixa.reduce((s, i) => {
      if (i.tipo === 'entrada' || i.tipo === 'abertura') return s + Number(i.valor);
      if (i.tipo === 'saida') return s - Number(i.valor);
      return s;
    }, 0);
  }, [caixa]);

  // === TRENDS (vs previous month) ===
  const trends = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const inMonth = (items: any[], m: number, y: number) =>
      items.filter(i => { const d = new Date(i.created_at); return d.getMonth() === m && d.getFullYear() === y; });

    const vAtual = inMonth(vendas, mesAtual, anoAtual);
    const vAnterior = inMonth(vendas, mesAnterior, anoAnterior);
    const aAtual = inMonth(assistencias, mesAtual, anoAtual);
    const aAnterior = inMonth(assistencias, mesAnterior, anoAnterior);
    const dAtual = inMonth(despesas, mesAtual, anoAtual);
    const dAnterior = inMonth(despesas, mesAnterior, anoAnterior);

    const calcTrend = (atual: number, anterior: number) => {
      if (anterior === 0) return null;
      return ((atual - anterior) / anterior * 100).toFixed(1);
    };

    const brutoAtual = vAtual.filter(v => !(v.produto || '').startsWith('Assistência -')).reduce((s, v) => s + Number(v.valor), 0) + aAtual.filter(a => a.status === 'Entregue').reduce((s, a) => s + Number(a.valor_servico), 0);
    const brutoAnterior = vAnterior.filter(v => !(v.produto || '').startsWith('Assistência -')).reduce((s, v) => s + Number(v.valor), 0) + aAnterior.filter(a => a.status === 'Entregue').reduce((s, a) => s + Number(a.valor_servico), 0);

    const liqAtual = vAtual.reduce((s, v) => s + Number(v.lucro_venda || v.valor), 0);
    const liqAnterior = vAnterior.reduce((s, v) => s + Number(v.lucro_venda || v.valor), 0);

    const despAtual = dAtual.reduce((s, d) => s + Number(d.valor), 0);
    const despAnterior = dAnterior.reduce((s, d) => s + Number(d.valor), 0);

    const margemAtual = brutoAtual > 0 ? (liqAtual / brutoAtual) * 100 : 0;
    const margemAnterior = brutoAnterior > 0 ? (liqAnterior / brutoAnterior) * 100 : 0;

    const tmAtual = vAtual.length > 0 ? vAtual.reduce((s, v) => s + Number(v.valor), 0) / vAtual.length : 0;
    const tmAnterior = vAnterior.length > 0 ? vAnterior.reduce((s, v) => s + Number(v.valor), 0) / vAnterior.length : 0;

    return {
      bruto: calcTrend(brutoAtual, brutoAnterior),
      liquido: calcTrend(liqAtual, liqAnterior),
      despesas: calcTrend(despAtual, despAnterior),
      margem: calcTrend(margemAtual, margemAnterior),
      ticket: calcTrend(tmAtual, tmAnterior),
    };
  }, [vendas, assistencias, despesas]);

  // === CHART DATA ===
  const chartData = useMemo(() => {
    return meses.map((m, i) => {
      const vendasMes = vendas.filter(v => new Date(v.created_at).getMonth() === i);
      const vendasSemAssist = vendasMes.filter(v => !(v.produto || '').startsWith('Assistência -')).reduce((s, v) => s + Number(v.valor), 0);
      const ma = assistencias.filter(a => new Date(a.created_at).getMonth() === i && a.status === 'Entregue').reduce((s, a) => s + Number(a.valor_servico), 0);
      const md = despesas.filter(d => new Date(d.created_at).getMonth() === i).reduce((s, d) => s + Number(d.valor), 0);
      const lucroMes = vendasMes.reduce((s, v) => s + Number(v.lucro_venda || v.valor), 0);
      return { mes: m.slice(0, 3), vendas: vendasSemAssist, assistencias: ma, despesas: md, lucro: lucroMes };
    });
  }, [vendas, despesas, assistencias]);

  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.despesas.forEach(d => { map[d.tipo] = (map[d.tipo] || 0) + Number(d.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered.despesas]);

  // === ÚLTIMAS VENDAS ===
  const ultimasVendas = useMemo(() => {
    const all = [
      ...vendas.map(v => ({ data: v.created_at, descricao: v.produto, valor: Number(v.valor), tipo: v.tipo_venda === 'celular' ? 'Celular' : 'Venda' })),
      ...assistencias.map(a => ({ data: a.created_at, descricao: `OS ${a.numero_os} - ${a.cliente}`, valor: Number(a.valor_servico), tipo: 'Assistência' })),
    ];
    return all.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 5);
  }, [vendas, assistencias]);

  const hasActiveFilters = filtro !== 'todos';
  const clearFilters = () => {
    clearPersistedFilters(PREFIX);
    setFiltro('todos'); setDataInicio(undefined); setDataFim(undefined);
  };

  const trendStr = (val: string | null, invert = false) => {
    if (!val) return {};
    const n = Number(val);
    const up = invert ? n <= 0 : n >= 0;
    return { trend: `${n >= 0 ? '+' : ''}${val}%`, trendUp: up };
  };

  return (
    <div className="space-y-6">
      {/* HEADER + FILTERS + SALDO */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
          </div>
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Caixa Hoje</p>
                <p className="text-lg font-bold text-foreground">{fmt(saldoCaixa)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1.5">
            {[
              { label: 'Hoje', value: 'hoje' },
              { label: 'Este mês', value: 'este_mes' },
              { label: 'Este ano', value: 'este_ano' },
              { label: 'Todos', value: 'todos' },
            ].map(f => (
              <Button
                key={f.value}
                variant={filtro === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro(f.value)}
                className="text-xs"
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Mês..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="periodo">Período</SelectItem>
              {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {filtro === 'periodo' && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("text-xs", !dataInicioDate && "text-muted-foreground")}>
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
                  <Button variant="outline" size="sm" className={cn("text-xs", !dataFimDate && "text-muted-foreground")}>
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
            <Button variant="destructive" size="sm" onClick={clearFilters} className="text-xs">
              <FilterX className="mr-1 h-3 w-3" />Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ROW 1: Receita e Resultado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Bruto" value={fmt(totalBruto)} icon={ShoppingCart} color="primary" {...trendStr(trends.bruto)} />
        <StatCard title="Custo Peças" value={fmt(custoPecas)} icon={Package} color="warning" />
        <StatCard title="Lucro Líquido" value={fmt(lucroLiquido)} icon={DollarSign} color="success" {...trendStr(trends.liquido)} />
      </div>

      {/* ROW 2: Despesas e Eficiência */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Despesas" value={fmt(totalDespesas)} icon={Receipt} color="destructive" {...trendStr(trends.despesas, true)} />
        <StatCard
          title="Margem de Lucro"
          value={`${margemLucro.toFixed(1)}%`}
          icon={Percent}
          color={margemLucro >= 0 ? 'success' : 'destructive'}
          {...trendStr(trends.margem)}
        />
        <StatCard title="Ticket Médio" value={fmt(ticketMedio)} icon={ArrowUpDown} color="primary" {...trendStr(trends.ticket)} />
      </div>

      {/* ROW 3: Volume */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Qtd. Vendas" value={String(qtdVendas)} icon={Hash} color="primary" />
        <StatCard title="Qtd. Despesas" value={String(qtdDespesas)} icon={Hash} color="warning" />
        <StatCard title="Qtd. Assistências" value={String(qtdAssistencias)} icon={Wrench} color="primary" />
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
                <Bar dataKey="assistencias" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Assistências" />
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
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma despesa no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas Vendas */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Últimas Movimentações</CardTitle></CardHeader>
        <CardContent>
          {ultimasVendas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimasVendas.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{format(new Date(item.data), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-sm font-medium">{item.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={item.tipo === 'Assistência' ? 'secondary' : 'default'} className="text-xs">
                        {item.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">{fmt(item.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma movimentação recente</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
