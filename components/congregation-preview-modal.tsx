'use client';

import React, { useRef, useState } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CongregationPrintLayout, CongregationPrintRow } from '@/components/congregation-print-layout';

interface Props {
  title: string;
  subtitle?: string;
  rows: CongregationPrintRow[];
  onClose: () => void;
}

export function CongregationPreviewModal({ title, subtitle, rows, onClose }: Props) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const buildPrintHtml = (): string => {
    const bodyRows = rows
      .map(
        (r) => `
    <tr>
      <td>${r.name}</td>
      <td>${r.phone || '—'}</td>
      <td>${r.groupName}</td>
      <td>${r.responsibility}</td>
      <td>${r.status}</td>
    </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; font-family:Arial,Helvetica,sans-serif; color:#111827; }
    @page { margin:0; size:A4 portrait; }
    @media print { html,body { width:210mm; height:297mm; } }
    .container { padding: 40px 36px; }
    h1 { text-align:center; font-size:20px; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
    .sub { text-align:center; font-size:12px; color:#333; margin-bottom:28px; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead tr { border-bottom:2px solid #111827; }
    th { text-align:left; padding:8px 6px; }
    th:nth-child(n+2) { text-align:center; }
    tbody tr { border-bottom:1px solid #ddd; }
    td { padding:7px 6px; }
    td:first-child { font-weight:bold; }
    td:nth-child(n+2) { text-align:center; }
    .date { text-align:right; font-size:10px; color:#666; margin-top:24px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${subtitle ? `<p class="sub">${subtitle}</p>` : ''}
    <table>
      <thead>
        <tr>
          <th>Nome</th><th>Celular</th><th>Grupo de Campo</th><th>Responsabilidade</th><th>Situação</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <p class="date">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
</body></html>`;
  };

  const handleDownloadPdf = async () => {
    if (!layoutRef.current) return;
    setIsGenerating(true);
    const toastId = toast.loading('Gerando PDF...');
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const el = layoutRef.current.querySelector('[data-congregation-page]') as HTMLElement;
      if (!el) return;

      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const imgW = pW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let srcY = 0;
      let page = 0;
      const canvasRatio = canvas.width / imgW;
      const pageCanvasH = pH * canvasRatio;

      while (srcY < canvas.height) {
        if (page > 0) pdf.addPage();
        const srcH = Math.min(pageCanvasH, canvas.height - srcY);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = srcH;
        slice.getContext('2d')!.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        pdf.addImage(slice, 'JPEG', 0, 0, imgW, (srcH * imgW) / canvas.width, undefined, 'FAST');
        srcY += srcH;
        page++;
      }

      pdf.save('publicadores-jardim-california.pdf');
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=850,height=1200');
    if (!win) { toast.error('Pop-up bloqueado. Libere no navegador.'); return; }
    win.document.write(buildPrintHtml());
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
      <div className="w-full z-10 bg-[#0F172A]/95 backdrop-blur border-b border-[#1E293B] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Visualizar Impressão</p>
            <p className="text-[10px] text-[#64748B]">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} variant="outline" className="h-9 border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155] rounded-xl gap-2 px-4 text-xs font-semibold">
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button onClick={handleDownloadPdf} disabled={isGenerating} className="h-9 bg-[#0EA5E9] hover:bg-blue-600 text-white rounded-xl gap-2 px-5 text-xs font-bold shadow-lg shadow-blue-900/30 transition-all">
            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Download className="w-4 h-4" /> Salvar PDF</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center py-8">
        <div ref={layoutRef}>
          <CongregationPrintLayout title={title} subtitle={subtitle} rows={rows} />
        </div>
      </div>
    </div>
  );
}

export default CongregationPreviewModal;