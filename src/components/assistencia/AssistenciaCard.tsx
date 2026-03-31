import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit2, Eye, Download, Printer, MessageCircle, Trash2 } from 'lucide-react';

interface AssistenciaCardProps {
  item: any;
  onEdit: (item: any) => void;
  onRemove: (id: string) => void;
  onOs: (item: any, action: 'view' | 'download' | 'print') => void;
  onWhatsApp: (item: any) => void;
}

const statusColor = (s: string) => {
  if (s === 'Entregue') return 'default' as const;
  if (s === 'Concluído') return 'secondary' as const;
  return 'outline' as const;
};

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function AssistenciaCard({ item, onEdit, onRemove, onOs, onWhatsApp }: AssistenciaCardProps) {
  return (
    <Card className="shadow-card">
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Main info - horizontal compact */}
          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-1 items-center text-sm">
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <span className="font-semibold truncate">{item.cliente}</span>
              <Badge variant={statusColor(item.status)} className="text-[10px] px-1.5 py-0 h-5 shrink-0">{item.status}</Badge>
            </div>
            <span className="text-muted-foreground truncate">{item.telefone || '—'}</span>
            <span className="text-muted-foreground truncate">{item.servico || item.aparelho || '—'}</span>
            <span className="tabular-nums">{fmt(item.valor_servico)}</span>
            <span className={`font-semibold tabular-nums ${Number(item.lucro) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(item.lucro)}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString('pt-BR')}
              <span className="ml-1 opacity-60">OS #{String(item.numero_os || '').padStart(4, '0')}</span>
            </span>
          </div>

          {/* Actions - horizontal */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)} title="Editar">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOs(item, 'view')} title="Visualizar OS">
              <Eye className="h-3.5 w-3.5 text-primary" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOs(item, 'download')} title="Baixar OS">
              <Download className="h-3.5 w-3.5 text-primary" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOs(item, 'print')} title="Imprimir OS">
              <Printer className="h-3.5 w-3.5 text-primary" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onWhatsApp(item)} title="WhatsApp">
              <MessageCircle className="h-3.5 w-3.5 text-green-500" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemove(item.id)} title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
