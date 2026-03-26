import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ShoppingCart, Receipt, Wrench, DollarSign } from 'lucide-react';
import { gerarRelatorioPdf } from '@/lib/pdfUtils';
import { toast } from 'sonner';

export default function Relatorios() {
  const { user } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('configuracoes').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setConfig(data));
  }, [user]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const gerarVendas = async () => {
    setLoading('vendas');
    const { data } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    const items = data || [];
    const total = items.reduce((s, v) => s + Number(v.valor), 0);
    await gerarRelatorioPdf(
      'Relatório de Vendas', ['Produto', 'Valor', 'Data'],
      items.map(v => [v.produto, fmt(v.valor), new Date(v.created_at).toLocaleDateString('pt-BR')]),
      { 'Total Vendas': fmt(total), 'Quantidade': String(items.length), 'Ticket Médio': fmt(items.length ? total / items.length : 0) },
      config
    );
    toast.success('PDF gerado'); setLoading('');
  };

  const gerarDespesas = async () => {
    setLoading('despesas');
    const { data } = await supabase.from('despesas').select('*').order('created_at', { ascending: false });
    const items = data || [];
    const total = items.reduce((s, d) => s + Number(d.valor), 0);
    await gerarRelatorioPdf(
      'Relatório de Despesas', ['Tipo', 'Nome', 'Valor', 'Data'],
      items.map(d => [d.tipo, d.nome || '-', fmt(d.valor), new Date(d.created_at).toLocaleDateString('pt-BR')]),
      { 'Total Despesas': fmt(total), 'Quantidade': String(items.length) },
      config
    );
    toast.success('PDF gerado'); setLoading('');
  };

  const gerarAssistencias = async () => {
    setLoading('assistencias');
    const { data } = await supabase.from('assistencias').select('*').order('created_at', { ascending: false });
    const items = data || [];
    const lucroTotal = items.reduce((s, a) => s + Number(a.lucro), 0);
    await gerarRelatorioPdf(
      'Relatório de Assistências', ['Cliente', 'Aparelho', 'Serviço', 'Valor', 'Lucro', 'Status', 'Data'],
      items.map(a => [a.cliente, a.aparelho || '-', a.servico || '-', fmt(a.valor_servico), fmt(a.lucro), a.status, new Date(a.created_at).toLocaleDateString('pt-BR')]),
      { 'Total': String(items.length), 'Lucro Total': fmt(lucroTotal) },
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
    const vendas = v.data || [];
    const despesas = d.data || [];
    const assistencias = a.data || [];
    const totalVendas = vendas.reduce((s, x) => s + Number(x.valor), 0);
    const totalDespesas = despesas.reduce((s, x) => s + Number(x.valor), 0);
    const lucroAssist = assistencias.reduce((s, x) => s + Number(x.lucro), 0);
    
    await gerarRelatorioPdf(
      'Relatório Financeiro', ['Categoria', 'Valor'],
      [
        ['Total de Vendas', fmt(totalVendas)],
        ['Total de Despesas', fmt(totalDespesas)],
        ['Lucro Bruto', fmt(totalVendas - totalDespesas)],
        ['Lucro Assistências', fmt(lucroAssist)],
        ['Custo Peças', fmt(assistencias.reduce((s, x) => s + Number(x.valor_peca), 0))],
        ['Custo Técnicos', fmt(assistencias.reduce((s, x) => s + Number(x.mao_de_obra), 0))],
      ],
      { 'Faturamento': fmt(totalVendas), 'Lucro Líquido': fmt(totalVendas - totalDespesas) },
      config
    );
    toast.success('PDF gerado'); setLoading('');
  };

  const reports = [
    { key: 'vendas', title: 'Relatório de Vendas', desc: 'Todas as vendas com totais e ticket médio', icon: ShoppingCart, action: gerarVendas },
    { key: 'despesas', title: 'Relatório de Despesas', desc: 'Despesas por categoria com totais', icon: Receipt, action: gerarDespesas },
    { key: 'assistencias', title: 'Relatório de Assistências', desc: 'Assistências com lucros e status', icon: Wrench, action: gerarAssistencias },
    { key: 'financeiro', title: 'Relatório Financeiro', desc: 'Visão completa: vendas, despesas e lucro', icon: DollarSign, action: gerarFinanceiro },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios em PDF</h1>
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
