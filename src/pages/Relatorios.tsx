import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FileText, ShoppingCart, Receipt, Wrench, DollarSign, CalendarIcon } from 'lucide-react';
import { gerarRelatorioPdf } from '@/lib/pdfUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const periodos = [
  { value: 'todos', label: 'Todo período' },
  { value: 'semana', label: 'Última semana' },
  { value: 'mes', label: 'Este mês' },
  { value: 'ano', label: 'Este ano' },
  { value: 'personalizado', label: 'Personalizado' },
];

export default function Relatorios() {
  const { user } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState('');
  const [periodo, setPeriodo] = useState('todos');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase.from('configuracoes').select('*').maybeSingle().then(({ data }) => setConfig(data));
  }, [user]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const getDateRange = (): { start?: Date; end?: Date } => {
    const now = new Date();
    switch (periodo) {
      case 'semana': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start, end: now };
      }
      case 'mes': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
      }
      case 'ano': {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start, end: now };
      }
      case 'personalizado':
        return { start: dataInicio, end: dataFim };
      default:
        return {};
    }
  };

  const filterByPeriod = (items: any[]) => {
    const { start, end } = getDateRange();
    if (!start) return items;
    return items.filter(i => {
      const d = new Date(i.created_at);
      if (d < start) return false;
      if (end) { const e = new Date(end); e.setHours(23, 59, 59); if (d > e) return false; }
      return true;
    });
  };

  const periodoLabel = () => {
    const { start, end } = getDateRange();
    if (!start) return 'Todo período';
    const s = start.toLocaleDateString('pt-BR');
    const e = end ? end.toLocaleDateString('pt-BR') : 'hoje';
    return `${s} a ${e}`;
  };

  const gerarVendas = async () => {
    setLoading('vendas');
    const { data } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    const items = filterByPeriod(data || []);
    const total = items.reduce((s, v) => s + Number(v.valor), 0);
    const totalLucro = items.reduce((s, v) => s + Number(v.lucro_venda || v.valor), 0);
    const celulares = items.filter(v => v.tipo_venda === 'celular');
    await gerarRelatorioPdf(
      `Relatório de Vendas — ${periodoLabel()}`,
      ['Produto', 'Tipo', 'Valor', 'Lucro', 'Data'],
      items.map(v => [
        v.produto,
        v.tipo_venda === 'celular' ? '📱 Celular' : v.tipo_venda === 'assistencia' ? '🔧 Assist.' : 'Produto',
        fmt(v.valor),
        fmt(v.lucro_venda || v.valor),
        new Date(v.created_at).toLocaleDateString('pt-BR'),
      ]),
      {
        'Total Vendas': fmt(total),
        'Lucro Vendas': fmt(totalLucro),
        'Quantidade': String(items.length),
        'Celulares': String(celulares.length),
        'Ticket Médio': fmt(items.length ? total / items.length : 0),
      },
      config
    );
    toast.success('PDF gerado'); setLoading('');
  };

  const gerarDespesas = async () => {
    setLoading('despesas');
    const { data } = await supabase.from('despesas').select('*').order('created_at', { ascending: false });
    const items = filterByPeriod(data || []);
    const total = items.reduce((s, d) => s + Number(d.valor), 0);
    await gerarRelatorioPdf(
      `Relatório de Despesas — ${periodoLabel()}`,
      ['Tipo', 'Nome', 'Valor', 'Data'],
      items.map(d => [d.tipo, d.nome || '-', fmt(d.valor), new Date(d.created_at).toLocaleDateString('pt-BR')]),
      { 'Total Despesas': fmt(total), 'Quantidade': String(items.length) },
      config
    );
    toast.success('PDF gerado'); setLoading('');
  };

  const gerarAssistencias = async () => {
    setLoading('assistencias');
    const { data } = await supabase.from('assistencias').select('*').order('created_at', { ascending: false });
    const items = filterByPeriod(data || []);
    const lucroTotal = items.reduce((s, a) => s + Number(a.lucro), 0);
    const brutoTotal = items.reduce((s, a) => s + Number(a.valor_servico), 0);
    await gerarRelatorioPdf(
      `Relatório de Assistências — ${periodoLabel()}`,
      ['Cliente', 'Aparelho', 'Serviço', 'Valor', 'Lucro', 'Status', 'Data'],
      items.map(a => [a.cliente, a.aparelho || '-', a.servico || '-', fmt(a.valor_servico), fmt(a.lucro), a.status, new Date(a.created_at).toLocaleDateString('pt-BR')]),
      { 'Total': String(items.length), 'Valor Bruto': fmt(brutoTotal), 'Lucro Total': fmt(lucroTotal) },
      config
    );
    toast.success('PDF gerado'); setLoading('');
  };

  const gerarFinanceiro = async () => {
    setLoading('financeiro');
    const [v, d, a] = await Promise.all([
      supabase.from('vendas').select('*'),
      supabase.from('despesas').select('*'),
      supabase.from('assistencias').select('*'),
    ]);
    const vendas = filterByPeriod(v.data || []);
    const despesas = filterByPeriod(d.data || []);
    const assistencias = filterByPeriod(a.data || []);

    const brutoVendas = vendas.reduce((s, x) => s + Number(x.valor), 0);
    const brutoAssist = assistencias.reduce((s, x) => s + Number(x.valor_servico), 0);
    const totalBruto = brutoVendas + brutoAssist;

    const lucroVendas = vendas.reduce((s, x) => s + Number(x.lucro_venda || x.valor), 0);
    const lucroAssist = assistencias.reduce((s, x) => s + Number(x.lucro), 0);
    const totalLiquido = lucroVendas + lucroAssist;

    const totalDespesas = despesas.reduce((s, x) => s + Number(x.valor), 0);
    const lucroFinal = totalLiquido - totalDespesas;

    const celulares = vendas.filter(x => x.tipo_venda === 'celular');

    await gerarRelatorioPdf(
      `Relatório Financeiro — ${periodoLabel()}`,
      ['Categoria', 'Valor'],
      [
        ['Total Bruto (entradas)', fmt(totalBruto)],
        ['  → Vendas', fmt(brutoVendas)],
        ['  → Assistências', fmt(brutoAssist)],
        ['Venda Líquida (lucros)', fmt(totalLiquido)],
        ['  → Lucro Vendas', fmt(lucroVendas)],
        ['  → Lucro Assistências', fmt(lucroAssist)],
        ['Total Despesas', fmt(totalDespesas)],
        ['Lucro Final', fmt(lucroFinal)],
        ['---', '---'],
        ['Qtd. Vendas', String(vendas.length)],
        ['Qtd. Celulares', String(celulares.length)],
        ['Qtd. Assistências', String(assistencias.length)],
        ['Qtd. Despesas', String(despesas.length)],
      ],
      {
        'Total Bruto': fmt(totalBruto),
        'Venda Líquida': fmt(totalLiquido),
        'Lucro Final': fmt(lucroFinal),
      },
      config
    );
    toast.success('PDF gerado'); setLoading('');
  };

  const reports = [
    { key: 'vendas', title: 'Relatório de Vendas', desc: 'Vendas com tipo, lucro e ticket médio', icon: ShoppingCart, action: gerarVendas },
    { key: 'despesas', title: 'Relatório de Despesas', desc: 'Despesas por categoria com totais', icon: Receipt, action: gerarDespesas },
    { key: 'assistencias', title: 'Relatório de Assistências', desc: 'Assistências com valor bruto e lucro', icon: Wrench, action: gerarAssistencias },
    { key: 'financeiro', title: 'Relatório Financeiro', desc: 'Visão completa: bruto, líquido e lucro', icon: DollarSign, action: gerarFinanceiro },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios em PDF</h1>

      {/* Period filter */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodos.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {periodo === 'personalizado' && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(!dataInicio && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dataInicio ? format(dataInicio, "dd/MM/yy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(!dataFim && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dataFim ? format(dataFim, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map(r => (
          <Card key={r.key} className="shadow-card">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <r.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{r.desc}</p>
                <Button size="sm" onClick={r.action} disabled={loading === r.key}>
                  <FileText className="mr-2 h-4 w-4" />
                  {loading === r.key ? 'Gerando...' : 'Gerar PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
