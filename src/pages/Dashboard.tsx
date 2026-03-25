import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/StatCard';
import { ShoppingCart, Receipt, TrendingUp, Wrench, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Dashboard() {
  const { user } = useAuth();
  const [vendas, setVendas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [assistencias, setAssistencias] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('todos');

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
      if (filtro === 'todos') return items;
      if (filtro === 'hoje') {
        const today = now.toISOString().slice(0, 10);
        return items.filter(i => i.created_at?.slice(0, 10) === today);
      }
      const monthIdx = meses.indexOf(filtro);
      if (monthIdx >= 0) {
        return items.filter(i => new Date(i.created_at).getMonth() === monthIdx);
      }
      return items;
    };
    return {
      vendas: filterByDate(vendas),
      despesas: filterByDate(despesas),
      assistencias: filterByDate(assistencias),
    };
  }, [vendas, despesas, assistencias, filtro]);

  const totalVendas = filtered.vendas.reduce((s, v) => s + Number(v.valor), 0);
  const totalDespesas = filtered.despesas.reduce((s, d) => s + Number(d.valor), 0);
  const lucro = totalVendas - totalDespesas;
  const lucroAssist = filtered.assistencias.reduce((s, a) => s + Number(a.lucro), 0);

  // Chart data - monthly
  const chartData = useMemo(() => {
    return meses.map((m, i) => {
      const mv = vendas.filter(v => new Date(v.created_at).getMonth() === i).reduce((s, v) => s + Number(v.valor), 0);
      const md = despesas.filter(d => new Date(d.created_at).getMonth() === i).reduce((s, d) => s + Number(d.valor), 0);
      return { mes: m.slice(0, 3), vendas: mv, despesas: md, lucro: mv - md };
    });
  }, [vendas, despesas]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="hoje">Hoje</SelectItem>
            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Vendas" value={fmt(totalVendas)} icon={ShoppingCart} color="primary" />
        <StatCard title="Total Despesas" value={fmt(totalDespesas)} icon={Receipt} color="destructive" />
        <StatCard title="Lucro" value={fmt(lucro)} icon={TrendingUp} color={lucro >= 0 ? 'success' : 'destructive'} />
        <StatCard title="Assistências" value={String(filtered.assistencias.length)} icon={Wrench} color="warning" />
        <StatCard title="Lucro Assist." value={fmt(lucroAssist)} icon={DollarSign} color={lucroAssist >= 0 ? 'success' : 'destructive'} />
      </div>

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
      </div>
    </div>
  );
}
