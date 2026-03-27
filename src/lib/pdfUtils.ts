import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export type PdfAction = 'download' | 'view' | 'print';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

async function addLogo(doc: jsPDF, logoUrl: string | null, x: number, y: number, maxH: number): Promise<number> {
  if (!logoUrl) return y;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = logoUrl;
    });
    const ratio = img.width / img.height;
    const h = maxH;
    const w = h * ratio;
    doc.addImage(img, 'PNG', x, y, Math.min(w, 60), h);
    return y + h + 5;
  } catch {
    return y;
  }
}

function addHeader(doc: jsPDF, config: any, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(config?.nome_loja || 'Treze7', pw / 2, y, { align: 'center' });
  y += 6;
  if (config?.telefone_loja) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(config.telefone_loja, pw / 2, y, { align: 'center' });
    y += 4;
  }
  if (config?.endereco_loja) {
    doc.setFontSize(9);
    doc.text(config.endereco_loja, pw / 2, y, { align: 'center' });
    y += 4;
  }
  y += 4;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(14, y, pw - 14, y);
  y += 8;
  return y;
}

function handlePdfAction(doc: jsPDF, filename: string, action: PdfAction = 'download') {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  switch (action) {
    case 'view': {
      window.open(url, '_blank');
      break;
    }
    case 'print': {
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => printWindow.print(), 500);
        });
      }
      break;
    }
    case 'download':
    default: {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      break;
    }
  }
}

export async function gerarOsPdf(assistencia: any, config: any, action: PdfAction = 'download') {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  y = await addLogo(doc, config?.logo_url, 14, y, 20);
  y = addHeader(doc, config, y);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORDEM DE SERVIÇO #${String(assistencia.numero_os || '').padStart(4, '0')}`, pw / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${new Date(assistencia.created_at).toLocaleDateString('pt-BR')}`, pw / 2, y, { align: 'center' });
  y += 10;

  doc.autoTable({
    startY: y,
    head: [['DADOS DO CLIENTE']],
    body: [
      [`Nome: ${assistencia.cliente}`],
      [`Telefone: ${assistencia.telefone || '-'}`],
      [`Aparelho: ${assistencia.aparelho || '-'}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  doc.autoTable({
    startY: y,
    head: [['DETALHES DO SERVIÇO']],
    body: [
      [`Serviço: ${assistencia.servico || '-'}`],
      [`Técnico: ${assistencia.tecnico || '-'}`],
      [`Valor do Serviço: ${fmt(assistencia.valor_servico)}`],
      [`Garantia: ${assistencia.garantia || '-'}`],
      [`Status: ${assistencia.status}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  if (assistencia.observacao) {
    doc.autoTable({
      startY: y,
      head: [['OBSERVAÇÕES']],
      body: [[assistencia.observacao]],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMOS E CONDIÇÕES:', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  const termos = [
    '• Não nos responsabilizamos por perda de dados.',
    '• Garantia não cobre mau uso.',
    '• Após a conclusão do serviço, o cliente será comunicado. Aparelhos não retirados',
    '  no prazo de 3 dias isentam a loja de qualquer responsabilidade sobre o equipamento.',
  ];
  termos.forEach(t => { doc.text(t, 14, y); y += 4; });

  y += 15;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.line(14, y, 90, y);
  doc.line(pw - 90, y, pw - 14, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('Assinatura do Cliente', 52, y, { align: 'center' });
  doc.text('Assinatura da Loja', pw - 52, y, { align: 'center' });

  const filename = `OS_${String(assistencia.numero_os || '').padStart(4, '0')}_${assistencia.cliente}.pdf`;
  handlePdfAction(doc, filename, action);
}

export async function gerarVendaPdf(venda: any, config: any, action: PdfAction = 'download') {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  y = await addLogo(doc, config?.logo_url, 14, y, 20);
  y = addHeader(doc, config, y);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE VENDA', pw / 2, y, { align: 'center' });
  y += 10;

  doc.autoTable({
    startY: y,
    head: [['DADOS DA VENDA']],
    body: [
      [`Produto: ${venda.produto}`],
      [`Valor: ${fmt(Number(venda.valor))}`],
      [`Data: ${new Date(venda.created_at).toLocaleDateString('pt-BR')}`],
      [`Garantia: ${(venda.garantia_dias || 0) > 0 ? `${venda.garantia_dias} dias` : 'Sem garantia'}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  if ((venda.garantia_dias || 0) > 0) {
    doc.autoTable({
      startY: y,
      head: [['TERMOS DE GARANTIA']],
      body: [[
        'Esta garantia cobre apenas defeitos de fabricação, não incluindo mau uso, ' +
        'danos por quedas, líquidos ou uso inadequado do produto. ' +
        `Válida por ${venda.garantia_dias} dias a partir da data da compra.`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  y += 15;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.line(14, y, 90, y);
  doc.line(pw - 90, y, pw - 14, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('Assinatura do Cliente', 52, y, { align: 'center' });
  doc.text('Assinatura da Loja', pw - 52, y, { align: 'center' });

  const filename = `Venda_${venda.produto}_${new Date(venda.created_at).toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  handlePdfAction(doc, filename, action);
}

export async function gerarRelatorioPdf(
  titulo: string,
  colunas: string[],
  dados: string[][],
  resumo: Record<string, string>,
  config: any,
  action: PdfAction = 'download'
) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  y = await addLogo(doc, config?.logo_url, 14, y, 16);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(config?.nome_loja || 'Treze7', pw / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(12);
  doc.text(titulo, pw / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pw / 2, y, { align: 'center' });
  y += 8;

  const entries = Object.entries(resumo);
  if (entries.length > 0) {
    doc.autoTable({
      startY: y,
      head: [entries.map(([k]) => k)],
      body: [entries.map(([, v]) => v)],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
      styles: { fontSize: 9, halign: 'center' },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  doc.autoTable({
    startY: y,
    head: [colunas],
    body: dados,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  handlePdfAction(doc, `${titulo.replace(/\s/g, '_')}.pdf`, action);
}
