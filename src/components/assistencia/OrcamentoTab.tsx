import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, MessageCircle, Wrench } from 'lucide-react';

const aparelhos = [
  'iPhone 7', 'iPhone 7 Plus', 'iPhone 8', 'iPhone 8 Plus',
  'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
  'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
  'iPhone 12', 'iPhone 12 Mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
  'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
  'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
  'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
  'Samsung Galaxy S21', 'Samsung Galaxy S22', 'Samsung Galaxy S23', 'Samsung Galaxy S24',
  'Samsung Galaxy A14', 'Samsung Galaxy A34', 'Samsung Galaxy A54',
  'Motorola Moto G', 'Motorola Edge', 'Xiaomi Redmi', 'Outro',
];

const servicos = [
  'Troca de tela',
  'Troca flex de carga',
  'Troca conector',
  'Troca placa',
  'Troca bateria',
  'Troca traseira',
  'Troca vidro',
];

// Base prices by service type (editable by user)
const precosBase: Record<string, number> = {
  'Troca de tela': 150,
  'Troca flex de carga': 60,
  'Troca conector': 80,
  'Troca placa': 200,
  'Troca bateria': 80,
  'Troca traseira': 120,
  'Troca vidro': 100,
};

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

export default function OrcamentoTab({ onConverterAssistencia, nomeLoja }: OrcamentoTabProps) {
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [aparelho, setAparelho] = useState('');
  const [servico, setServico] = useState('');
  const [valorPeca, setValorPeca] = useState('');
  const [frete, setFrete] = useState('');
  const [maoDeObra, setMaoDeObra] = useState('');
  const [lucroLoja, setLucroLoja] = useState('');

  const handleServicoChange = (s: string) => {
    setServico(s);
    const base = precosBase[s];
    if (base && !valorPeca) {
      setValorPeca(String(base));
    }
  };

  const vp = parseFloat(valorPeca) || 0;
  const fr = parseFloat(frete) || 0;
  const mo = parseFloat(maoDeObra) || 0;
  const ll = parseFloat(lucroLoja) || 0;
  const valorFinal = vp + fr + mo + ll;

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const resetForm = () => {
    setCliente(''); setTelefone(''); setAparelho(''); setServico('');
    setValorPeca(''); setFrete(''); setMaoDeObra(''); setLucroLoja('');
  };

  const enviarWhatsApp = () => {
    if (!telefone) { toast.error('Preencha o telefone do cliente'); return; }
    if (!aparelho || !servico) { toast.error('Selecione aparelho e serviço'); return; }
    const phone = telefone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = encodeURIComponent(
      `Olá ${cliente || 'cliente'}, segue orçamento:\n\n` +
      `📱 Aparelho: ${aparelho}\n` +
      `🔧 Serviço: ${servico}\n` +
      `💰 Valor: ${fmt(valorFinal)}\n\n` +
      `Aguardamos sua aprovação.\n` +
      `- ${nomeLoja || 'Treze7'}`
    );
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const gerarOrcamento = () => {
    if (!aparelho || !servico) { toast.error('Selecione aparelho e serviço'); return; }
    toast.success(`Orçamento gerado: ${aparelho} - ${servico} = ${fmt(valorFinal)}`);
  };

  const converterAssistencia = () => {
    if (!cliente) { toast.error('Preencha o nome do cliente'); return; }
    if (!aparelho || !servico) { toast.error('Selecione aparelho e serviço'); return; }
    onConverterAssistencia({
      cliente,
      telefone,
      aparelho,
      servico,
      valor_servico: String(valorFinal),
      valor_peca: valorPeca || '0',
      frete: frete || '0',
      mao_de_obra: maoDeObra || '0',
    });
    toast.success('Dados enviados para aba Assistência');
    resetForm();
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Novo Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Nome do cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
            <Input placeholder="Telefone com DDD" value={telefone} onChange={e => setTelefone(e.target.value)} />

            <Select value={aparelho} onValueChange={setAparelho}>
              <SelectTrigger><SelectValue placeholder="Selecionar aparelho" /></SelectTrigger>
              <SelectContent>
                {aparelhos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={servico} onValueChange={handleServicoChange}>
              <SelectTrigger><SelectValue placeholder="Tipo de serviço" /></SelectTrigger>
              <SelectContent>
                {servicos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input placeholder="Valor da peça (R$)" type="number" step="0.01" value={valorPeca} onChange={e => setValorPeca(e.target.value)} />
            <Input placeholder="Frete (R$)" type="number" step="0.01" value={frete} onChange={e => setFrete(e.target.value)} />
            <Input placeholder="Mão de obra (R$)" type="number" step="0.01" value={maoDeObra} onChange={e => setMaoDeObra(e.target.value)} />
            <Input placeholder="Lucro da loja (R$)" type="number" step="0.01" value={lucroLoja} onChange={e => setLucroLoja(e.target.value)} />
          </div>

          <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm font-semibold">
            Valor final do serviço: {fmt(valorFinal)} (Peça + Frete + Mão de Obra + Lucro)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={gerarOrcamento} variant="outline" className="gap-2">
              <Calculator className="h-4 w-4" /> Gerar Orçamento
            </Button>
            <Button onClick={enviarWhatsApp} variant="outline" className="gap-2 text-green-600 border-green-300 hover:bg-green-50">
              <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
            </Button>
            <Button onClick={converterAssistencia} className="gap-2">
              <Wrench className="h-4 w-4" /> Salvar como Assistência
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
