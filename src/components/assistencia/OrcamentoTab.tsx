import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLoja } from '@/hooks/useLoja';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Wrench, X, ChevronDown, ChevronRight } from 'lucide-react';

const marcasPadrao = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'LG', 'Huawei', 'Outro'];
const servicosPadrao = [
  'Troca de tela', 'Conector de carga', 'Bateria',
  'Traseira', 'Vidro', 'Placa', 'Outro',
];

interface PrecoServico {
  id: string;
  marca: string;
  modelo: string;
  servico: string;
  valor_peca: number;
  frete: number;
  mao_de_obra: number;
  lucro_loja: number;
  valor_final: number;
  loja_id: string | null;
  user_id: string;
}

interface OrcamentoTabProps {
  onConverterAssistencia: (data: {
    cliente: string;
    telefone: string;
    aparelho: string;
    servico: string;
    valor_servico: string;
    valor_peca: string;
    frete: string;
    mao_de_obra: string;
  }) => void;
  nomeLoja?: string;
}

export default function OrcamentoTab({ onConverterAssistencia }: OrcamentoTabProps) {
  const { user } = useAuth();
  const { lojaId } = useLoja();
  const [items, setItems] = useState<PrecoServico[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [marca, setMarca] = useState('');
  const [marcaCustom, setMarcaCustom] = useState('');
  const [modelo, setModelo] = useState('');
  const [servico, setServico] = useState('');
  const [servicoCustom, setServicoCustom] = useState('');
  const [valorPeca, setValorPeca] = useState('');
  const [frete, setFrete] = useState('');
  const [maoDeObra, setMaoDeObra] = useState('');
  const [lucroLoja, setLucroLoja] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [busca, setBusca] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('todas');
  const [filtroServico, setFiltroServico] = useState('todos');

  // Detail dialog
  const [selectedItem, setSelectedItem] = useState<PrecoServico | null>(null);

  // Collapsed brands
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data } = await (supabase as any).from('precos_servicos').select('*').order('marca').order('modelo');
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const marcaFinal = marca === 'Outro' ? marcaCustom : marca;
  const servicoFinal = servico === 'Outro' ? servicoCustom : servico;

  const vp = parseFloat(valorPeca) || 0;
  const fr = parseFloat(frete) || 0;
  const mo = parseFloat(maoDeObra) || 0;
  const ll = parseFloat(lucroLoja) || 0;
  const valorFinal = vp + fr + mo + ll;

  const resetForm = () => {
    setMarca(''); setMarcaCustom(''); setModelo(''); setServico(''); setServicoCustom('');
    setValorPeca(''); setFrete(''); setMaoDeObra(''); setLucroLoja('');
    setEditId(null); setShowForm(false);
  };

  const save = async () => {
    if (!marcaFinal || !modelo || !servicoFinal) {
      toast.error('Preencha marca, modelo e serviço');
      return;
    }
    if (!lojaId) { toast.error('Erro: loja não identificada'); return; }

    const obj = {
      marca: marcaFinal, modelo, servico: servicoFinal,
      valor_peca: vp, frete: fr, mao_de_obra: mo, lucro_loja: ll,
      valor_final: valorFinal, user_id: user!.id, loja_id: lojaId,
    };

    if (editId) {
      await (supabase as any).from('precos_servicos').update(obj).eq('id', editId);
      toast.success('Preço atualizado');
    } else {
      await (supabase as any).from('precos_servicos').insert(obj);
      toast.success('Preço cadastrado');
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from('precos_servicos').delete().eq('id', id);
    toast.success('Registro excluído');
    if (selectedItem?.id === id) setSelectedItem(null);
    load();
  };

  const edit = (item: PrecoServico) => {
    const m = marcasPadrao.includes(item.marca) ? item.marca : 'Outro';
    const s = servicosPadrao.includes(item.servico) ? item.servico : 'Outro';
    setMarca(m);
    setMarcaCustom(m === 'Outro' ? item.marca : '');
    setModelo(item.modelo);
    setServico(s);
    setServicoCustom(s === 'Outro' ? item.servico : '');
    setValorPeca(String(item.valor_peca));
    setFrete(String(item.frete));
    setMaoDeObra(String(item.mao_de_obra));
    setLucroLoja(String(item.lucro_loja));
    setEditId(item.id);
    setShowForm(true);
    setSelectedItem(null);
  };

  const usarNoAtendimento = (item: PrecoServico) => {
    onConverterAssistencia({
      cliente: '',
      telefone: '',
      aparelho: `${item.marca} ${item.modelo}`,
      servico: item.servico,
      valor_servico: String(item.valor_final),
      valor_peca: String(item.valor_peca),
      frete: String(item.frete),
      mao_de_obra: String(item.mao_de_obra),
    });
    setSelectedItem(null);
    toast.success('Valores enviados para Assistência');
  };

  const toggleBrand = (brand: string) => {
    setCollapsedBrands(prev => {
      const next = new Set(prev);
      next.has(brand) ? next.delete(brand) : next.add(brand);
      return next;
    });
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Filter & group
  const filtered = useMemo(() => {
    let result = items;
    if (busca) result = result.filter(i =>
      i.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      i.marca.toLowerCase().includes(busca.toLowerCase())
    );
    if (filtroMarca !== 'todas') result = result.filter(i => i.marca === filtroMarca);
    if (filtroServico !== 'todos') result = result.filter(i => i.servico === filtroServico);
    return result;
  }, [items, busca, filtroMarca, filtroServico]);

  const grouped = useMemo(() => {
    const map: Record<string, PrecoServico[]> = {};
    filtered.forEach(item => {
      if (!map[item.marca]) map[item.marca] = [];
      map[item.marca].push(item);
    });
    // Sort brands alphabetically, models alphabetically within
    const sorted: [string, PrecoServico[]][] = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, items]) => [brand, items.sort((a, b) => a.modelo.localeCompare(b.modelo))]);
    return sorted;
  }, [filtered]);

  const allMarcas = useMemo(() => [...new Set(items.map(i => i.marca))].sort(), [items]);
  const allServicos = useMemo(() => [...new Set(items.map(i => i.servico))].sort(), [items]);

  return (
    <div className="space-y-3">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tabela de Preços</h2>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Cadastrar
        </Button>
      </div>

      {/* Form Card */}
      {showForm && (
        <Card className="shadow-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              {editId ? 'Editar Preço' : 'Novo Preço'}
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <Select value={marca} onValueChange={setMarca}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Marca *" /></SelectTrigger>
                  <SelectContent>
                    {marcasPadrao.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {marca === 'Outro' && (
                  <Input className="mt-1 h-8 text-sm" placeholder="Nome da marca" value={marcaCustom} onChange={e => setMarcaCustom(e.target.value)} />
                )}
              </div>
              <Input className="h-9 text-sm" placeholder="Modelo *" value={modelo} onChange={e => setModelo(e.target.value)} />
              <div>
                <Select value={servico} onValueChange={setServico}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Serviço *" /></SelectTrigger>
                  <SelectContent>
                    {servicosPadrao.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {servico === 'Outro' && (
                  <Input className="mt-1 h-8 text-sm" placeholder="Nome do serviço" value={servicoCustom} onChange={e => setServicoCustom(e.target.value)} />
                )}
              </div>
              <Input className="h-9 text-sm" placeholder="Peça (R$)" type="number" step="0.01" value={valorPeca} onChange={e => setValorPeca(e.target.value)} />
              <Input className="h-9 text-sm" placeholder="Frete (R$)" type="number" step="0.01" value={frete} onChange={e => setFrete(e.target.value)} />
              <Input className="h-9 text-sm" placeholder="Mão de obra (R$)" type="number" step="0.01" value={maoDeObra} onChange={e => setMaoDeObra(e.target.value)} />
              <Input className="h-9 text-sm" placeholder="Lucro (R$)" type="number" step="0.01" value={lucroLoja} onChange={e => setLucroLoja(e.target.value)} />
              <div className="flex items-center col-span-1 md:col-span-2 px-2 rounded-md bg-primary/10 text-primary text-xs font-semibold h-9">
                Final: {fmt(valorFinal)}
              </div>
            </div>
            <Button onClick={save} size="sm" className="w-full">
              {editId ? 'Atualizar' : 'Salvar'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9 text-sm" placeholder="Buscar modelo ou marca..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroMarca} onValueChange={setFiltroMarca}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas marcas</SelectItem>
            {allMarcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroServico} onValueChange={setFiltroServico}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos serviços</SelectItem>
            {allServicos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped list */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p>
      ) : grouped.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">
          {items.length === 0 ? 'Nenhum preço cadastrado. Clique em "Cadastrar" para começar.' : 'Nenhum resultado encontrado.'}
        </p>
      ) : (
        <div className="space-y-2">
          {grouped.map(([brand, brandItems]) => (
            <div key={brand}>
              <button
                onClick={() => toggleBrand(brand)}
                className="flex items-center gap-2 w-full text-left py-1.5 px-1 font-semibold text-sm hover:text-primary transition-colors"
              >
                {collapsedBrands.has(brand)
                  ? <ChevronRight className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />
                }
                📱 {brand}
                <Badge variant="secondary" className="text-xs ml-1">{brandItems.length}</Badge>
              </button>

              {!collapsedBrands.has(brand) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pl-6 pb-2">
                  {brandItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="text-left p-2.5 rounded-lg border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{item.modelo}</span>
                        <span className="text-xs font-bold text-primary">{fmt(item.valor_final)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground truncate">{item.servico}</span>
                        <span className="text-xs text-success font-medium">Lucro: {fmt(item.lucro_loja)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-sm">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  {selectedItem.marca} {selectedItem.modelo}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="font-medium">{selectedItem.servico}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Peça</span><span>{fmt(selectedItem.valor_peca)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{fmt(selectedItem.frete)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mão de obra</span><span>{fmt(selectedItem.mao_de_obra)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Lucro</span><span className="text-success font-medium">{fmt(selectedItem.lucro_loja)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-semibold">Valor Final</span><span className="font-bold text-primary">{fmt(selectedItem.valor_final)}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => edit(selectedItem)} className="gap-1">
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(selectedItem.id)} className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3" /> Excluir
                </Button>
                <Button size="sm" onClick={() => usarNoAtendimento(selectedItem)} className="gap-1">
                  <Wrench className="h-3 w-3" /> Usar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
