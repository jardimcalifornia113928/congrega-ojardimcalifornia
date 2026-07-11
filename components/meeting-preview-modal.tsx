'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MidweekPreviewData {
  weekRange: string;
  president: string;
  openingPrayer: string;
  closingPrayer: string;
  talkSpeaker: string;
  talkTheme: string;
  gemsSpeaker: string;
  bibleReadingReader: string;
  part1Theme: string; part1Speaker: string; part1Assistant: string; part1SecondHelper: string;
  part2Theme: string; part2Speaker: string; part2Assistant: string; part2SecondHelper: string;
  part3Theme: string; part3Speaker: string; part3Assistant: string; part3SecondHelper: string;
  part4Theme: string; part4Speaker: string; part4Assistant: string; part4SecondHelper: string;
  lifePart1Theme: string; lifePart1Speaker: string;
  lifePart2Theme: string; lifePart2Speaker: string;
  lifePart3Theme: string; lifePart3Speaker: string;
  cbsConductor: string; cbsReader: string;
  mechanicalIndicador1: string; mechanicalIndicador2: string;
  mechanicalMicrofone1: string; mechanicalMicrofone2: string;
  mechanicalPalco: string; mechanicalAudioVideo: string;
}

export interface WeekendPreviewData {
  president: string;
  openingPrayer: string;
  closingPrayer: string;
  localSpeaker: string;
  visitingSpeaker: string;
  talkTheme: string;
  watchtowerConductor: string;
  watchtowerReader: string;
  mechanicalIndicador1: string; mechanicalIndicador2: string;
  mechanicalMicrofone1: string; mechanicalMicrofone2: string;
  mechanicalPalco: string; mechanicalAudioVideo: string;
}

interface Props {
  midweek: MidweekPreviewData;
  weekend: WeekendPreviewData;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const v = (s?: string) => (s && s.trim()) ? s.trim() : '';

// ─── Overlay and Cover Sub-components ────────────────────────────────────────

interface OverlayProps {
  x: number;
  y: number;
  w: number;
  h?: number;
  value: string;
  align?: 'left' | 'right' | 'center';
  fontSize?: number;
  fontWeight?: string;
}

function Overlay({ x, y, w, h = 14, value, align = 'left', fontSize = 11, fontWeight = 'bold' }: OverlayProps) {
  const scale = 794 / 595;
  const left = x * scale;
  const heightVal = h;
  const top = (842 - y - heightVal + 22.5) * scale;
  const width = w * scale;
  const height = heightVal * scale;

  const cleanValue = (value && value !== 'null' && value !== 'undefined' && value !== 'N/A') ? value : '';
  if (!cleanValue) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        textAlign: align,
        fontSize: `${fontSize * scale}px`,
        fontWeight: fontWeight,
        color: '#000000',
        paddingLeft: align === 'left' ? '3px' : '0px',
        paddingRight: align === 'right' ? '3px' : '0px',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontFamily: 'Arial, Helvetica, sans-serif'
      }}
    >
      {cleanValue}
    </div>
  );
}

// ─── Print Layout ─────────────────────────────────────────────────────────────

function PrintLayout({ midweek, weekend }: { midweek: MidweekPreviewData; weekend: WeekendPreviewData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;
        
        const loadingTask = pdfjsLib.getDocument({ url: '/layout-impressao.pdf' });
        const pdf = await loadingTask.promise;
        if (!active) return;
        
        const page = await pdf.getPage(1);
        if (!active) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const scale = 2;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
          canvas,
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
        
        if (active) {
          setIsPdfLoaded(true);
        }
      } catch (error) {
        console.error("Error loading PDF background:", error);
      }
    }
    loadPdf();
    return () => {
      active = false;
    };
  }, []);

  const activeParts: { theme: string; person: string; asst: string; h2: string }[] = [];
  if (v(midweek.part1Speaker)) activeParts.push({ theme: midweek.part1Theme, person: midweek.part1Speaker, asst: midweek.part1Assistant, h2: midweek.part1SecondHelper });
  if (v(midweek.part2Speaker)) activeParts.push({ theme: midweek.part2Theme, person: midweek.part2Speaker, asst: midweek.part2Assistant, h2: midweek.part2SecondHelper });
  if (v(midweek.part3Speaker)) activeParts.push({ theme: midweek.part3Theme, person: midweek.part3Speaker, asst: midweek.part3Assistant, h2: midweek.part3SecondHelper });
  if (v(midweek.part4Speaker)) activeParts.push({ theme: midweek.part4Theme, person: midweek.part4Speaker, asst: midweek.part4Assistant, h2: midweek.part4SecondHelper });

  const activeLife: { theme: string; speaker: string }[] = [];
  if (v(midweek.lifePart1Theme)) activeLife.push({ theme: midweek.lifePart1Theme, speaker: midweek.lifePart1Speaker });
  if (v(midweek.lifePart2Theme)) activeLife.push({ theme: midweek.lifePart2Theme, speaker: midweek.lifePart2Speaker });
  if (v(midweek.lifePart3Theme)) activeLife.push({ theme: midweek.lifePart3Theme, speaker: midweek.lifePart3Speaker });

  // Slots positions in PDF points (width 595, height 842)
  const ministeriosSlots = [
    { y: 571, labelX: 20, labelW: 200, valX: 302, valW: 270 },
    { y: 546, labelX: 20, labelW: 200, valX: 302, valW: 270 },
    { y: 522, labelX: 20, labelW: 200, valX: 302, valW: 270 },
    { y: 497, labelX: 20, labelW: 200, valX: 302, valW: 270 },
    { y: 472, labelX: 20, labelW: 200, valX: 304, valW: 270 },
  ];

  return (
    <div style={{ position: 'relative', width: '794px', height: '1123px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {!isPdfLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', gap: '12px' }}>
          <Loader2 className="w-10 h-10 animate-spin text-[#0EA5E9]" />
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>Carregando modelo oficial...</span>
        </div>
      )}

      {/* Background PDF Canvas */}
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '794px', 
          height: '1123px', 
          zIndex: 0,
          pointerEvents: 'none' 
        }} 
      />

      {/* Overlay layers */}
      {isPdfLoaded && (
        <div 
          className="overlay-container"
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '794px', 
            height: '1123px', 
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          {/* Week range */}
          <Overlay x={420} y={799} w={142} value={midweek.weekRange.toUpperCase() + ' |'} align="right" fontSize={11} />

          {/* Midweek header */}
          <Overlay x={87} y={765} w={105} value={midweek.president} />
          <Overlay x={286} y={765} w={105} value={midweek.openingPrayer} />
          <Overlay x={478} y={765.5} w={90} value={midweek.closingPrayer} />

          {/* Tesouros */}
          <Overlay x={312} y={702} w={230} value={midweek.talkSpeaker} />
          <Overlay x={312} y={677} w={230} value={midweek.gemsSpeaker} />
          <Overlay x={312} y={653} w={230} value={midweek.bibleReadingReader} />

          {/* Faça Seu Melhor (Ministry) */}
          {ministeriosSlots.map((slot, i) => {
            if (i < activeParts.length) {
              const part = activeParts[i];
              const combinedNames = [part.person, part.asst, part.h2].filter(Boolean).join(' / ');
              return (
                <React.Fragment key={i}>
                  <Overlay x={slot.labelX} y={slot.y} w={slot.labelW} value={part.theme} />
                  <Overlay x={slot.valX} y={slot.y} w={slot.valW} value={combinedNames} />
                </React.Fragment>
              );
            }
            return null;
          })}

          {/* Nossa Vida Cristã */}
          {activeLife.length === 1 && (
            <>
              <Overlay x={20} y={411} w={290} value={activeLife[0].theme} fontSize={11} />
              <Overlay x={309} y={410} w={230} value={activeLife[0].speaker} fontSize={11} />
            </>
          )}
          {activeLife.length === 2 && (
            <>
              <Overlay x={20} y={417} w={290} value={activeLife[0].theme} fontSize={11} />
              <Overlay x={309} y={417} w={230} value={activeLife[0].speaker} fontSize={11} />
              <Overlay x={20} y={401} w={290} value={activeLife[1].theme} fontSize={11} />
              <Overlay x={309} y={401} w={230} value={activeLife[1].speaker} fontSize={11} />
            </>
          )}
          {activeLife.length === 3 && (
            <>
              <Overlay x={20} y={421} w={290} value={activeLife[0].theme} fontSize={11} />
              <Overlay x={309} y={421} w={230} value={activeLife[0].speaker} fontSize={11} />
              <Overlay x={20} y={408} w={290} value={activeLife[1].theme} fontSize={11} />
              <Overlay x={309} y={408} w={230} value={activeLife[1].speaker} fontSize={11} />
              <Overlay x={20} y={395} w={290} value={activeLife[2].theme} fontSize={11} />
              <Overlay x={309} y={395} w={230} value={activeLife[2].speaker} fontSize={11} />
            </>
          )}

          {/* Congregation Bible Study (CBS) */}
          <Overlay x={288} y={371.5} w={110} value={midweek.cbsConductor} />
          <Overlay x={453} y={371.5} w={110} value={midweek.cbsReader} />

          {/* Mechanical parts (Midweek) */}
          <Overlay x={130} y={322} w={170} value={midweek.mechanicalIndicador1} />
          <Overlay x={436} y={322} w={120} value={midweek.mechanicalIndicador2} />
          <Overlay x={130} y={297} w={170} value={midweek.mechanicalMicrofone1} />
          <Overlay x={436} y={297} w={120} value={midweek.mechanicalMicrofone2} />
          <Overlay x={130} y={273} w={170} value={midweek.mechanicalAudioVideo} />
          <Overlay x={436} y={273} w={120} value={midweek.mechanicalPalco} />

          {/* FIM DE SEMANA */}
          <Overlay x={97} y={195} w={90} value={weekend.president} />
          <Overlay x={284} y={195} w={100} value={weekend.openingPrayer} />
          <Overlay x={476} y={195} w={100} value={weekend.closingPrayer} />

          {/* Talk theme & speaker */}
          <Overlay x={18} y={171} w={380} value={weekend.talkTheme} />
          <Overlay x={446} y={170} w={120} value={weekend.localSpeaker || weekend.visitingSpeaker || ''} />

          {/* Watchtower Study */}
          <Overlay x={288} y={145} w={110} value={weekend.watchtowerConductor} />
          <Overlay x={447} y={145} w={110} value={weekend.watchtowerReader} />

          {/* Mechanical parts (Weekend) */}
          <Overlay x={130} y={97} w={170} value={weekend.mechanicalIndicador1} />
          <Overlay x={436} y={97} w={120} value={weekend.mechanicalIndicador2} />
          <Overlay x={130} y={72} w={170} value={weekend.mechanicalMicrofone1} />
          <Overlay x={436} y={72} w={120} value={weekend.mechanicalMicrofone2} />
          <Overlay x={130} y={47} w={170} value={weekend.mechanicalAudioVideo} />
          <Overlay x={436} y={47} w={120} value={weekend.mechanicalPalco} />
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function MeetingPreviewModal({ midweek, weekend, onClose }: Props) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Baixar PDF ────────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!layoutRef.current) return;
    setIsGenerating(true);
    const toastId = toast.loading('Gerando PDF...');
    try {
      const jsPDF = (await import('jspdf')).default;

      const bgCanvas = layoutRef.current.querySelector('canvas') as HTMLCanvasElement | null;
      if (!bgCanvas || !bgCanvas.width) {
        throw new Error('Modelo ainda não carregado.');
      }

      const overlayEls = layoutRef.current.querySelectorAll('.overlay-container > div');
      const cssW = layoutRef.current.offsetWidth;
      const cssH = layoutRef.current.offsetHeight;
      const cw = bgCanvas.width;
      const ch = bgCanvas.height;
      const sx = cw / cssW;
      const sy = ch / cssH;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cw;
      finalCanvas.height = ch;
      const ctx = finalCanvas.getContext('2d')!;
      ctx.drawImage(bgCanvas, 0, 0);

      overlayEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const text = htmlEl.textContent || '';
        const bg = htmlEl.style.backgroundColor;

        const left = parseFloat(htmlEl.style.left) || 0;
        const top = parseFloat(htmlEl.style.top) || 0;
        const width = parseFloat(htmlEl.style.width) || 0;
        const height = parseFloat(htmlEl.style.height) || 14;

        const cx = left * sx;
        const cy = top * sy;
        const cwE = width * sx;
        const chE = height * sy;

        if (!text.trim() && bg) {
          ctx.fillStyle = bg;
          ctx.fillRect(cx, cy, cwE, chE);
          return;
        }
        if (!text.trim()) return;

        const align = htmlEl.style.textAlign || 'left';
        const fontSize = parseFloat(htmlEl.style.fontSize) || 11;
        const fontWeight = htmlEl.style.fontWeight || 'bold';

        ctx.font = `${fontWeight === 'bold' ? 'bold ' : ''}${fontSize * sx}px Arial, Helvetica, sans-serif`;
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';

        const padding = 3 * sx;
        let tx = cx + padding;
        let ta: CanvasTextAlign = 'left';
        if (align === 'right') {
          tx = cx + cwE - padding;
          ta = 'right';
        } else if (align === 'center') {
          tx = cx + cwE / 2;
          ta = 'center';
        }
        ctx.textAlign = ta;
        ctx.fillText(text, tx, cy + chE / 2);
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const imgH = (finalCanvas.height * pW) / finalCanvas.width;

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
          if (srcY > 0) pdf.addPage();
          pdf.addImage(sliceCanvas, 'JPEG', 0, 0, pW, (srcH * pW) / finalCanvas.width, undefined, 'FAST');
          srcY += srcH;
        }
      }

      const fileName = `programacao-${midweek.weekRange.replace(/[\s/]/g, '-').toLowerCase()}.pdf`;
      pdf.save(fileName);
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Imprimir ──────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!layoutRef.current) return;
    
    // Converte o canvas renderizado para Data URL de forma que a imagem seja impressa corretamente!
    const canvasEl = layoutRef.current.querySelector('canvas');
    let bgImgSrc = '';
    if (canvasEl) {
      bgImgSrc = canvasEl.toDataURL('image/png');
    }

    const win = window.open('', '_blank', 'width=850,height=1200');
    if (!win) { toast.error('Pop-up bloqueado. Libere no navegador.'); return; }
    
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Programação - ${midweek.weekRange}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; font-family:Arial,Helvetica,sans-serif; }
    @page { margin:0; size:A4 portrait; }
    @media print { 
      html,body { width:210mm; height:297mm; } 
      .print-bg { display: block !important; }
    }
    .container { position: relative; width: 794px; height: 1123px; overflow: hidden; }
    .print-bg { position: absolute; top: 0; left: 0; width: 794px; height: 1123px; z-index: 0; }
    .overlay-content { position: absolute; top: 0; left: 0; width: 794px; height: 1123px; z-index: 10; pointer-events: none; }
  </style>
</head>
<body>
  <div class="container">
    ${bgImgSrc ? `<img src="${bgImgSrc}" class="print-bg" />` : ''}
    <div class="overlay-content">
      ${layoutRef.current.querySelector('.overlay-container')?.innerHTML || ''}
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
      style={{ scrollbarWidth: 'thin' }}
    >
      {/* ── Barra de ações ─────────────────────────────────────────────────── */}
      <div className="w-full z-10 bg-[#0F172A]/95 backdrop-blur border-b border-[#1E293B] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Pré-visualização</p>
            <p className="text-[10px] text-[#64748B]">Reunião de Meio de Semana + Fim de Semana</p>
          </div>
          <span className="text-xs text-[#0EA5E9] bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
            {midweek.weekRange}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-9 border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155] rounded-xl gap-2 px-4 text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="h-9 bg-[#0EA5E9] hover:bg-blue-600 text-white rounded-xl gap-2 px-5 text-xs font-bold shadow-lg shadow-blue-900/30 transition-all"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              : <><Download className="w-4 h-4" /> Baixar PDF</>
            }
          </Button>
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center py-8">
        {/* ── Papel A4 ─────────────────────────────────────────────────────── */}
        <div className="shadow-2xl shadow-black ring-1 ring-white/10 rounded-sm overflow-hidden flex-shrink-0">
          <div ref={layoutRef}>
            <PrintLayout midweek={midweek} weekend={weekend} />
          </div>
        </div>

        <p className="text-[#475569] text-xs pt-8">
          Clique fora para fechar • Ou use o botão ✕
        </p>
      </div>
    </div>
  );
}
