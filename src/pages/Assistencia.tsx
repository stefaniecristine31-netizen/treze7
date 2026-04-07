import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLoja } from '@/hooks/useLoja';
import { usePersistedFilter, clearPersistedFilters } from '@/hooks/usePersistedFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/StatCard';
import { toast } from 'sonner';
import { Plus, X, Wrench, DollarSign, CalendarDays, CalendarIcon, Calculator, FilterX } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { gerarOsPdf } from '@/lib/pdfUtils';
import AssistenciaCard from '@/components/assistencia/AssistenciaCard';
import OrcamentoTab from '@/components/assistencia/OrcamentoTab';

const tecnicos = ['Assistência Loja', 'Assistência Terceirizada'];
const garantias = ['3 meses', '6 meses', '1 semana', 'Outro'];
const statusOptions = ['Em andamento', 'Concluído', 'Entregue'];
const PREFIX = 'filtro_assistencia_';

export default function Assistencia() {
  const { user } = useAuth();
  const { lojaId } = useLoja();
  const [items, setItems] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({
    cliente: '', telefone: '', aparelho: '', servico: '',
    valor_servico: '', valor_peca: '', frete: '', mao_de_obra: '',
    tecnico: '', garantia: '', status: 'Em andamento', observacao: '',
  });
  const [dataAssist, setDataAssist] = useState<Date | undefined>(undefined);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('assistencia');

  // Persistent filters
  const [busca, setBusca] = usePersistedFilter(PREFIX + 'busca', '');
  const [filtroTecnico, setFiltroTecnico] = usePersistedFilter(PREFIX + 'tecnico', 'todos');
  const [ordem, setOrdem] = usePersistedFilter<'desc' | 'asc'>(PREFIX + 'ordem', 'desc');

  const load = async () => {
    const { data } = await supabase.from('assistencias').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    supabase.from('configuracoes').select('*').maybeSingle().then(({ data }) => setConfig(data));
  }, [user]);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const calcLucro = () => {
    const vs = parseFloat(form.valor_servico) || 0;
    const vp = parseFloat(form.valor_peca) || 0;
    const fr = parseFloat(form.frete) || 0;
    const mo = parseFloat(form.mao_de_obra) || 0;
    return vs - vp - fr - mo;
  };

  const save = async () => {
    if (!form.cliente || !form.valor_servico) { toast.error('Preencha cliente e valor do serviço'); return; }
    if (!lojaId) { toast.error('Erro: loja não identificada'); return; }
    const lucro = calcLucro();
    const obj: any = {
      cliente: form.cliente, telefone: form.telefone, aparelho: form.aparelho,
      servico: form.servico, valor_servico: parseFloat(form.valor_servico) || 0,
      valor_peca: parseFloat(form.valor_peca) || 0, frete: parseFloat(form.frete) || 0,
      mao_de_obra: parseFloat(form.mao_de_obra) || 0, lucro,
      tecnico: form.tecnico, garantia: form.garantia, status: form.status,
      observacao: form.observacao, user_id: user!.id, loja_id: lojaId,
    };
    if (dataAssist) obj.created_at = dataAssist.toISOString();

    if (editId) {
      await supabase.from('assistencias').update(obj).eq('id', editId);
      if (form.status === 'Concluído' || form.status === 'Entregue') {
        // Check if venda already exists for this assistencia
        const { data: existingVenda } = await supabase.from('vendas').select('id').eq('assistencia_id', editId).maybeSingle();
        if (existingVenda) {
          await supabase.from('vendas').update({ produto: `Assistência - ${form.cliente}`, valor: lucro }).eq('assistencia_id', editId);
        } else {
          await supabase.from('vendas').insert({
            produto: `Assistência - ${form.cliente}`, valor: lucro,
            assistencia_id: editId, user_id: user!.id, loja_id: lojaId,
          });
        }
      } else {
        // If status is not Concluído/Entregue, remove any existing venda
        await supabase.from('vendas').delete().eq('assistencia_id', editId);
      }
      toast.success('Assistência atualizada');
    } else {
      const { data } = await supabase.from('assistencias').insert(obj).select().single();
      if (data && (form.status === 'Concluído' || form.status === 'Entregue')) {
        await supabase.from('vendas').insert({
          produto: `Assistência - ${form.cliente}`, valor: lucro,
          assistencia_id: data.id, user_id: user!.id, loja_id: lojaId,
        });
      }
      toast.success('Assistência registrada');
    }
    resetForm(); load();
  };

  const remove = async (id: string) => {
    await supabase.from('vendas').delete().eq('assistencia_id', id);
    await supabase.from('assistencias').delete().eq('id', id);
    toast.success('Assistência e venda vinculada excluídas'); load();
  };

  const edit = (item: any) => {
    setForm({
      cliente: item.cliente, telefone: item.telefone || '', aparelho: item.aparelho || '',
      servico: item.servico || '', valor_servico: String(item.valor_servico),
      valor_peca: String(item.valor_peca), frete: String(item.frete),
      mao_de_obra: String(item.mao_de_obra), tecnico: item.tecnico || '',
      garantia: item.garantia || '', status: item.status, observacao: item.observacao || '',
    });
    setDataAssist(new Date(item.created_at));
    setEditId(item.id);
    setActiveTab('assistencia');
  };

  const resetForm = () => {
    setForm({ cliente: '', telefone: '', aparelho: '', servico: '', valor_servico: '', valor_peca: '', frete: '', mao_de_obra: '', tecnico: '', garantia: '', status: 'Em andamento', observacao: '' });
    setDataAssist(undefined);
    setEditId(null);
  };

  const sendWhatsApp = (item: any) => {
    if (!item.telefone) { toast.error('Cliente sem telefone cadastrado'); return; }
    const phone = item.telefone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = encodeURIComponent(`Olá ${item.cliente}, seu aparelho (${item.aparelho || 'equipamento'}) está pronto para retirada. Obrigado pela preferência! - ${config?.nome_loja || 'Treze7'}`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const handleOs = (item: any, action: 'download' | 'view' | 'print') => {
    gerarOsPdf(item, config, action);
    toast.success(action === 'download' ? 'PDF baixado' : action === 'view' ? 'PDF aberto' : 'Enviado para impressão');
  };

  const handleConverterOrcamento = (data: {
    cliente: string; telefone: string; aparelho: string; servico: string;
    valor_servico: string; valor_peca: string; frete: string; mao_de_obra: string;
  }) => {
    setForm({
      ...data,
      tecnico: '', garantia: '', status: 'Em andamento', observacao: '',
    });
    setActiveTab('assistencia');
  };

  const filtered = useMemo(() => {
    let result = items;
    if (busca) result = result.filter(i => i.cliente.toLowerCase().includes(busca.toLowerCase()));
    if (filtroTecnico !== 'todos') result = result.filter(i => i.tecnico === filtroTecnico);
    if (ordem === 'asc') result = [...result].reverse();
    return result;
  }, [items, busca, filtroTecnico, ordem]);

  const totalAssist = items.length;
  const lucroTotal = items.reduce((s, a) => s + Number(a.lucro), 0);
  const hoje = new Date().toISOString().slice(0, 10);
  const assistHoje = items.filter(i => i.created_at?.slice(0, 10) === hoje).length;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const lucroPreview = calcLucro();

  const hasActiveFilters = busca || filtroTecnico !== 'todos';

  const clearFilters = () => {
    clearPersistedFilters(PREFIX);
    setBusca(''); setFiltroTecnico('todos'); setOrdem('desc');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Assistência Técnica</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Assistências" value={String(totalAssist)} icon={Wrench} color="primary" />
        <StatCard title="Lucro Total" value={fmt(lucroTotal)} icon={DollarSign} color={lucroTotal >= 0 ? 'success' : 'destructive'} />
        <StatCard title="Assistências Hoje" value={String(assistHoje)} icon={CalendarDays} color="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assistencia" className="gap-2"><Wrench className="h-4 w-4" /> Assistência</TabsTrigger>
          <TabsTrigger value="orcamento" className="gap-2"><Calculator className="h-4 w-4" /> Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="assistencia" className="space-y-4 mt-4">
          {/* Form */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{editId ? 'Editar Assistência' : 'Nova Assistência'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Cliente *" value={form.cliente} onChange={e => set('cliente', e.target.value)} />
                <Input placeholder="Telefone" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
                <Input placeholder="Aparelho" value={form.aparelho} onChange={e => set('aparelho', e.target.value)} />
                <Input placeholder="Serviço" value={form.servico} onChange={e => set('servico', e.target.value)} />
                <Input placeholder="Valor do Serviço *" type="number" step="0.01" value={form.valor_servico} onChange={e => set('valor_servico', e.target.value)} />
                <Input placeholder="Valor da Peça" type="number" step="0.01" value={form.valor_peca} onChange={e => set('valor_peca', e.target.value)} />
                <Input placeholder="Frete" type="number" step="0.01" value={form.frete} onChange={e => set('frete', e.target.value)} />
                <Input placeholder="Mão de Obra" type="number" step="0.01" value={form.mao_de_obra} onChange={e => set('mao_de_obra', e.target.value)} />
                <Select value={form.tecnico} onValueChange={v => set('tecnico', v)}>
                  <SelectTrigger><SelectValue placeholder="Técnico" /></SelectTrigger>
                  <SelectContent>{tecnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.garantia} onValueChange={v => set('garantia', v)}>
                  <SelectTrigger><SelectValue placeholder="Garantia" /></SelectTrigger>
                  <SelectContent>{garantias.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataAssist && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataAssist ? format(dataAssist, "PPP", { locale: ptBR }) : "Data (opcional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataAssist} onSelect={setDataAssist} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <Textarea placeholder="Observação" value={form.observacao} onChange={e => set('observacao', e.target.value)} />

              <div className={`p-3 rounded-lg text-sm font-semibold ${lucroPreview >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                Lucro previsto: {fmt(lucroPreview)} (Serviço - Peça - Frete - Mão de Obra)
              </div>

              <div className="flex gap-2">
                <Button onClick={save} className="flex-1">
                  <Plus className="mr-2 h-4 w-4" />{editId ? 'Atualizar' : 'Salvar'}
                </Button>
                {editId && <Button variant="outline" onClick={resetForm}><X className="h-4 w-4" /></Button>}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} className="flex-1" />
            <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos técnicos</SelectItem>
                {tecnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ordem} onValueChange={(v: 'desc' | 'asc') => setOrdem(v)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mais recentes</SelectItem>
                <SelectItem value="asc">Mais antigas</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="destructive" size="sm" onClick={clearFilters}>
                <FilterX className="mr-2 h-4 w-4" />Limpar
              </Button>
            )}
          </div>

          {/* Cards */}
          <div className="space-y-1.5">
            {filtered.map(item => (
              <AssistenciaCard
                key={item.id}
                item={item}
                onEdit={edit}
                onRemove={remove}
                onOs={handleOs}
                onWhatsApp={sendWhatsApp}
              />
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma assistência encontrada</p>}
          </div>
        </TabsContent>

        <TabsContent value="orcamento" className="mt-4">
          <OrcamentoTab
            onConverterAssistencia={handleConverterOrcamento}
            nomeLoja={config?.nome_loja}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
