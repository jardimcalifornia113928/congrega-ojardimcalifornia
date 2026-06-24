'use client';

import React, { useRef, useState } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SchoolPrintLayout } from '@/components/school-print-layout';

interface CardData {
  nome: string;
  ajudante: string;
  data: string;
  numeroParte: string;
  salaoPrincipal: string;
  salaB: string;
  salaC: string;
}

interface Props {
  cards: CardData[];
  onClose: () => void;
}

export function SchoolPreviewModal({ cards, onClose }: Props) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!layoutRef.current) return;
    setIsGenerating(true);
    const toastId = toast.loading('Gerando PDF...');
    try {
      const jsPDF = (await import('jspdf')).default;
      const pages = layoutRef.current.querySelectorAll('[data-school-page]');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();

      pages.forEach((pageEl, i) => {
        const canvas = pageEl.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const overlayEls = pageEl.querySelectorAll('[data-school-overlays] > div');
        const cssW = pageEl.clientWidth;
        const cssH = pageEl.clientHeight;
        const cw = canvas.width;
        const ch = canvas.height;
        const sx = cw / cssW;
        const sy = ch / cssH;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = cw;
        finalCanvas.height = ch;
        const ctx = finalCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, 0);

        overlayEls.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const text = htmlEl.textContent || '';
          if (!text.trim()) return;

          const left = parseFloat(htmlEl.style.left) || 0;
          const top = parseFloat(htmlEl.style.top) || 0;
          const width = parseFloat(htmlEl.style.width) || 0;
          const fontSize = parseFloat(htmlEl.style.fontSize) || 9;
          const align = htmlEl.style.textAlign || 'left';
          const fontWeight = htmlEl.style.fontWeight || 'bold';

          const cx = left * sx;
          const cy = top * sy;
          const cwE = width * sx;
          const chE = 12 * sy;

          ctx.font = `${fontWeight === 'bold' ? 'bold ' : ''}${fontSize * sx}px Arial, Helvetica, sans-serif`;
          ctx.fillStyle = '#111827';
          ctx.textBaseline = 'middle';

          const padding = 2 * sx;
          let tx = cx + padding;
          let ta: CanvasTextAlign = 'left';
          if (align === 'right') { tx = cx + cwE - padding; ta = 'right'; }
          else if (align === 'center') { tx = cx + cwE / 2; ta = 'center'; }
          ctx.textAlign = ta;
          ctx.fillText(text, tx, cy + chE / 2);
        });

        const imgH = (finalCanvas.height * pW) / finalCanvas.width;
        if (i > 0) pdf.addPage();

        if (imgH <= pH) {
          pdf.addImage(finalCanvas, 'JPEG', 0, 0, pW, imgH, undefined, 'FAST');
        } else {
          const ratio = finalCanvas.width / pW;
          const pageImgH = pH * ratio;
          let srcY = 0;
          while (srcY < finalCanvas.height) {
            const srcH = Math.min(pageImgH, finalCanvas.height - srcY);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = finalCanvas.width;
            sliceCanvas.height = srcH;
            sliceCanvas.getContext('2d')!.drawImage(finalCanvas, 0, srcY, finalCanvas.width, srcH, 0, 0, finalCanvas.width, srcH);
            pdf.addImage(sliceCanvas, 'JPEG', 0, 0, pW, (srcH * pW) / finalCanvas.width, undefined, 'FAST');
            srcY += srcH;
            if (srcY < finalCanvas.height) pdf.addPage();
          }
        }
      });

      pdf.save('designacao-escola.pdf');
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!layoutRef.current) return;

    const pages = layoutRef.current.querySelectorAll('[data-school-page]');
    let bgImgSrcs: string[] = [];

    pages.forEach((pageEl) => {
      const canvas = pageEl.querySelector('canvas');
      if (canvas) bgImgSrcs.push(canvas.toDataURL('image/png'));
    });

    const win = window.open('', '_blank', 'width=850,height=1200');
    if (!win) { toast.error('Pop-up bloqueado. Libere no navegador.'); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Designação Escola</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; font-family:Arial,Helvetica,sans-serif; }
    @page { margin:0; size:A4 portrait; }
    @media print { html,body { width:210mm; height:297mm; } }
    .page { position: relative; width: 794px; height: 1123px; overflow: hidden; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .print-bg { position: absolute; top: 0; left: 0; width: 794px; height: 1123px; z-index: 0; }
    .overlay-content { position: absolute; top: 0; left: 0; width: 794px; height: 1123px; z-index: 10; pointer-events: none; }
  </style>
</head>
<body>`);

    pages.forEach((pageEl, idx) => {
      const overlays = pageEl.querySelector('[data-school-overlays]');
      win.document.write(`
  <div class="page">
    ${bgImgSrcs[idx] ? `<img src="${bgImgSrcs[idx]}" class="print-bg" />` : ''}
    <div class="overlay-content">
      ${overlays?.innerHTML || ''}
    </div>
  </div>`);
    });

    win.document.write(`</body></html>`);
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
            <p className="text-white font-bold text-sm leading-tight">Designação Escola</p>
            <p className="text-[10px] text-[#64748B]">Leitor da Bíblia e Partes do Ministério</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} variant="outline" className="h-9 border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155] rounded-xl gap-2 px-4 text-xs font-semibold">
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button onClick={handleDownloadPdf} disabled={isGenerating} className="h-9 bg-[#0EA5E9] hover:bg-blue-600 text-white rounded-xl gap-2 px-5 text-xs font-bold shadow-lg shadow-blue-900/30 transition-all">
            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Download className="w-4 h-4" /> Baixar PDF</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center py-8">
        <div ref={layoutRef}>
          <SchoolPrintLayout cards={cards} />
        </div>
      </div>
    </div>
  );
}
