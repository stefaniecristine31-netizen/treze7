import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StatCard } from '@/components/StatCard';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Wrench, DollarSign, CalendarDays, FileText, MessageCircle, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { gerarOsPdf } from '@/lib/pdfUtils';

const tecnicos = ['Marco', 'Terceiro'];
const garantias = ['3 meses', '6 meses', '1 semana', 'Outro'];
const statusOptions = ['Em andamento', 'Concluído', 'Entregue'];

export default function Assistencia() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({
    cliente: '', telefone: '', aparelho: '', servico: '',
    valor_servico: '', valor_peca: '', frete: '', mao_de_obra: '',
    tecnico: '', garantia: '', status: 'Em andamento', observacao: '',
  });
  const [dataAssist, setDataAssist] = useState<Date | undefined>(undefined);
  const [editId, setEditId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [ordem, setOrdem] = useState<'desc' | 'asc'>('desc');

  const load = async () => {
    const { data } = await supabase.from('assistencias').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    supabase.from('configuracoes').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setConfig(data));
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
    const lucro = calcLucro();
    const obj: any = {
      cliente: form.cliente, telefone: form.telefone, aparelho: form.aparelho,
      servico: form.servico, valor_servico: parseFloat(form.valor_servico) || 0,
      valor_peca: parseFloat(form.valor_peca) || 0, frete: parseFloat(form.frete) || 0,
      mao_de_obra: parseFloat(form.mao_de_obra) || 0, lucro,
      tecnico: form.tecnico, garantia: form.garantia, status: form.status,
      observacao: form.observacao, user_id: user!.id,
    };
    if (dataAssist) obj.created_at = dataAssist.toISOString();

    if (editId) {
      await supabase.from('assistencias').update(obj).eq('id', editId);
      await supabase.from('vendas').update({ produto: `Assistência - ${form.cliente}`, valor: lucro }).eq('assistencia_id', editId);
      toast.success('Assistência atualizada');
    } else {
      const { data } = await supabase.from('assistencias').insert(obj).select().single();
      if (data) {
        await supabase.from('vendas').insert({
          produto: `Assistência - ${form.cliente}`, valor: lucro,
          assistencia_id: data.id, user_id: user!.id,
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
  };

  const resetForm = () => {
    setForm({ cliente: '', telefone: '', aparelho: '', servico: '', valor_servico: '', valor_peca: '', frete: '', mao_de_obra: '', tecnico: '', garantia: '', status: 'Em andamento', observacao: '' });
    setDataAssist(undefined);
    setEditId(null);
  };

  const sendWhatsApp = (item: any) => {
    if (!item.telefone) { toast.error('Cliente sem telefone cadastrado'); return; }
    const phone = item.telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${item.cliente}, seu aparelho (${item.aparelho || 'equipamento'}) está pronto para retirada. Obrigado pela preferência! - ${config?.nome_loja || 'Treze7'}`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  const downloadOs = (item: any) => {
    gerarOsPdf(item, config);
    toast.success('PDF da OS gerado');
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

  const statusColor = (s: string) => {
    if (s === 'Entregue') return 'default';
    if (s === 'Concluído') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assistência Técnica</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Assistências" value={String(totalAssist)} icon={Wrench} color="primary" />
        <StatCard title="Lucro Total" value={fmt(lucroTotal)} icon={DollarSign} color={lucroTotal >= 0 ? 'success' : 'destructive'} />
        <StatCard title="Assistências Hoje" value={String(assistHoje)} icon={CalendarDays} color="warning" />
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{editId ? 'Editar Assistência' : 'Nova Assistência'}</CardTitle></CardHeader>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} className="flex-1" />
        <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos técnicos</SelectItem>
            {tecnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ordem} onValueChange={(v: 'desc' | 'asc') => setOrdem(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Mais recentes</SelectItem>
            <SelectItem value="asc">Mais antigas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(item => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{item.cliente}</p>
                    <Badge variant={statusColor(item.status)}>{item.status}</Badge>
                    <Badge variant="outline" className="text-xs">OS #{String(item.numero_os || '').padStart(4, '0')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.telefone} • {item.aparelho} • {item.servico}</p>
                  <p className="text-sm text-muted-foreground">Serviço: {fmt(item.valor_servico)}</p>
                  <p className={`text-sm font-semibold ${Number(item.lucro) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    Lucro: {fmt(item.lucro)}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => edit(item)} title="Editar"><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => downloadOs(item)} title="Gerar OS PDF"><FileText className="h-4 w-4 text-primary" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => sendWhatsApp(item)} title="WhatsApp"><MessageCircle className="h-4 w-4 text-green-500" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma assistência encontrada</p>}
      </div>
    </div>
  );
}
