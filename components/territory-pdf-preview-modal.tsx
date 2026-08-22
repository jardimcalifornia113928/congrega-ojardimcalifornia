'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer, Share2, ZoomIn, ZoomOut, Maximize, Trash2, Plus, Check, Save, Scissors, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';

interface Props {
  pdfBytes: Uint8Array;
  fileName: string;
  shareText?: string;
  onClose: () => void;
}

interface Selection {
  id: string;
  x: number; // 0..1 (fração da largura do PDF)
  y: number; // 0..1 (fração da altura do PDF)
  w: number; // 0..1
  h: number; // 0..1
  name: string;
}

const PDF_MM_W = 508; // 1440pt
const PDF_MM_H = 285.7; // 810pt

const STORAGE_KEY = 'territory-pdf-selections';

export function TerritoryPdfPreviewModal({ pdfBytes, fileName, shareText, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfErrorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pdfError, setPdfError] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [drag, setDrag] = useState<null | { type: 'move' | 'resize'; startX: number; startY: number; orig: Selection }>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelections(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
    } catch { /* noop */ }
  }, [selections]);

  useEffect(() => {
    let active = true;
    let pdf: any = null;

    async function load() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
        pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale: 2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        if (!active) return;
      } catch (error) {
        console.error('Erro ao renderizar PDF do território:', error);
        if (active) setPdfError(true);
      }
    }

    load();
    return () => {
      active = false;
      if (pdf) {
        try { pdf.destroy(); } catch { /* noop */ }
      }
    };
  }, [pdfBytes]);

  const getBlob = () => new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });

  const getImageBlob = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return null;
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao gerar imagem')), 'image/png');
    });
  };

  const imageFileName = fileName.replace('.pdf', '.png');

  const handleDownload = () => {
    const url = URL.createObjectURL(getBlob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('PDF baixado!');
  };

  const handleDownloadImage = async () => {
    const blob = await getImageBlob();
    if (!blob) {
      toast.error('Imagem ainda não carregada.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = imageFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Imagem baixada!');
  };

  const handlePrint = () => {
    const url = URL.createObjectURL(getBlob());
    const win = window.open(url, '_blank');
    if (!win) {
      toast.error('Pop-up bloqueado. Libere no navegador.');
      return;
    }
    win.addEventListener('load', () => {
      setTimeout(() => win.print(), 500);
    });
  };

  const handleShare = async () => {
    try {
      const blob = await getImageBlob();
      if (!blob) {
        toast.error('Imagem ainda não carregada.');
        return;
      }
      const file = new File([blob], imageFileName, { type: 'image/png' });

      if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: imageFileName, text: shareText || imageFileName });
        toast.success('Compartilhado!');
        return;
      }

      await handleDownloadImage();
      toast.info('Imagem baixada — envie pelo WhatsApp.');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      await handleDownloadImage();
      toast.info('Imagem baixada — envie pelo WhatsApp.');
    }
  };

  // ── Caixa de seleção ───────────────────────────────────────────────────────
  const getWrapRect = () => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const selToPx = (s: Selection) => {
    const rect = getWrapRect();
    if (!rect) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: s.x * rect.w,
      y: s.y * rect.h,
      w: s.w * rect.w,
      h: s.h * rect.h,
    };
  };

  const pxToSel = (px: number, py: number, pw: number, ph: number): Selection => {
    const rect = getWrapRect();
    const w = rect?.w || 1;
    const h = rect?.h || 1;
    return {
      id: selection?.id || `sel-${Date.now()}`,
      x: clamp(px / w, 0, 1),
      y: clamp(py / h, 0, 1),
      w: clamp(pw / w, 0.01, 1),
      h: clamp(ph / h, 0.01, 1),
      name: selection?.name || 'Seleção',
    };
  };

  const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'resize') => {
    if (!selection) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({ type, startX: e.clientX, startY: e.clientY, orig: { ...selection } });

    const move = (ev: PointerEvent) => {
      setDrag(prev => {
        if (!prev) return prev;
        const rect = getWrapRect();
        if (!rect) return prev;

        const dx = (ev.clientX - prev.startX) / rect.w;
        const dy = (ev.clientY - prev.startY) / rect.h;

        if (prev.type === 'move') {
          const nx = clamp(prev.orig.x + dx, 0, 1 - prev.orig.w);
          const ny = clamp(prev.orig.y + dy, 0, 1 - prev.orig.h);
          setSelection({ ...prev.orig, x: nx, y: ny });
        } else {
          const nw = clamp(prev.orig.w + dx, 0.01, 1 - prev.orig.x);
          const nh = clamp(prev.orig.h + dy, 0.01, 1 - prev.orig.y);
          setSelection({ ...prev.orig, w: nw, h: nh });
        }
        return prev;
      });
    };

    const up = () => {
      setDrag(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const newSelection = () => {
    setSelection({
      id: `sel-${Date.now()}`,
      x: 0.15,
      y: 0.15,
      w: 0.3,
      h: 0.3,
      name: 'Seleção',
    });
    toast.info('Arraste a caixa e ajuste os cantos. Ao soltar, as medidas aparecem.');
  };

  const saveSelection = () => {
    if (!selection) return;
    const sel = { ...selection };
    const wMM = Math.round(sel.w * PDF_MM_W);
    const hMM = Math.round(sel.h * PDF_MM_H);
    sel.name = `Seleção ${selections.length + 1} (${wMM} × ${hMM} mm)`;
    setSelections(prev => [...prev, sel]);
    toast.success(`Posição salva: (${Math.round(sel.x * 100)}%, ${Math.round(sel.y * 100)}%) • ${wMM} × ${hMM} mm`);
  };

  const deleteSelection = (id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
  };

  const exportSelections = async () => {
    if (selections.length === 0) {
      toast.error('Nenhuma posição salva para exportar.');
      return;
    }
    try {
      const res = await fetch('/api/save-territory-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections }),
      });
      if (!res.ok) throw new Error('Falha ao exportar');
      toast.success('Posições exportadas para o servidor!');
    } catch (error) {
      console.error('Export selections error:', error);
      toast.error('Erro ao exportar posições');
    }
  };

  const applySelection = (s: Selection) => {
    setSelection({ ...s });
    setZoom(100);
  };

  const cropPdf = async (s: Selection) => {
    try {
      const doc = await PDFDocument.load(pdfBytes.slice(), { ignoreEncryption: true });
      const page = doc.getPage(0);
      const { width, height } = page.getSize();

      // Converte frações (origem topo-esquerda do canvas) para pontos (origem inferior-esquerda do PDF)
      const x = s.x * width;
      const y = (1 - s.y - s.h) * height;
      const w = s.w * width;
      const h = s.h * height;

      page.setMediaBox(x, y, w, h);
      page.setCropBox(x, y, w, h);

      const cropped = await doc.save();
      const blob = new Blob([cropped as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace('.pdf', '-recorte.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF recortado baixado!');
    } catch (error) {
      console.error('Crop PDF error:', error);
      toast.error('Erro ao recortar o PDF');
    }
  };

  const selPx = selection ? selToPx(selection) : null;
  const selWMM = selection ? Math.round(selection.w * PDF_MM_W) : 0;
  const selHMM = selection ? Math.round(selection.h * PDF_MM_H) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Barra de ações */}
      <div className="w-full z-10 bg-[#0F172A]/95 backdrop-blur border-b border-[#1E293B] px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Pré-visualização</p>
            <p className="text-[10px] text-[#64748B] truncate">{fileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={handleShare}
            variant="outline"
            className="h-9 border-[#1E293B] text-[#0EA5E9] hover:text-[#38BDF8] hover:border-[#0EA5E9]/40 rounded-xl gap-2 px-3 sm:px-4 text-xs font-semibold"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-9 border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155] rounded-xl gap-2 px-3 sm:px-4 text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button
            onClick={handleDownloadImage}
            className="h-9 bg-[#0EA5E9] hover:bg-blue-600 text-white rounded-xl gap-2 px-3 sm:px-5 text-xs font-bold shadow-lg shadow-blue-900/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar imagem</span>
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="h-9 border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155] rounded-xl gap-2 px-3 sm:px-4 text-xs font-semibold"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar PDF</span>
          </Button>
        </div>
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-6 sm:py-8 px-4 bg-black">
        <div
          ref={wrapRef}
          className="shadow-2xl shadow-black ring-1 ring-white/10 rounded-sm overflow-hidden flex-shrink-0 transition-all bg-black relative"
          style={{ width: `calc(100% * ${zoom} / 100)`, maxWidth: 980, minWidth: 280 }}
        >
          {pdfError ? (
            <div className="bg-[#0F172A] p-10 flex flex-col items-center gap-3">
              <p className="text-sm font-bold text-red-400">Não foi possível exibir o PDF.</p>
              <p className="text-xs text-[#94A3B8]">Use os botões Baixar ou Imprimir.</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          )}

          {!pdfError && selPx && (
            <div
              onPointerDown={e => handlePointerDown(e, 'move')}
              className="absolute border-2 border-[#0EA5E9] bg-[#0EA5E9]/10 cursor-move"
              style={{ left: selPx.x, top: selPx.y, width: selPx.w, height: selPx.h, zIndex: 20 }}
            >
              <div className="absolute -top-7 left-0 bg-[#0EA5E9] text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap">
                {selWMM} × {selHMM} mm
              </div>
              <div
                onPointerDown={e => handlePointerDown(e, 'resize')}
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-[#0EA5E9] rounded cursor-se-resize"
              />
            </div>
          )}
        </div>

        <p className="text-[#475569] text-xs pt-6">
          Tamanho real: 508 × 285,7 mm (1440 × 810 pt) • Ajuste com −/+ para caber
        </p>
        <p className="text-[#475569] text-xs pt-2 pb-4">
          Clique fora para fechar • Ou use o botão ✕
        </p>
      </div>

      {/* Barra inferior */}
      <div className="w-full z-10 bg-[#0F172A]/95 backdrop-blur border-t border-[#1E293B] px-4 py-2.5 flex items-center justify-center gap-2 flex-shrink-0 flex-wrap">
        <button
          onClick={() => setZoom(z => Math.max(25, z - 25))}
          className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          title="Diminuir"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(100)}
          className="px-4 py-1.5 rounded-lg text-white bg-[#1E293B] hover:bg-[#334155] transition-colors text-xs font-bold"
          title="Ajustar à tela"
        >
          <Maximize className="w-3.5 h-3.5 inline-block mr-1 align-[-2px]" />
          {zoom}%
        </button>
        <button
          onClick={() => setZoom(z => Math.min(250, z + 25))}
          className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          title="Aumentar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-[#1E293B] mx-2" />

        <button
          onClick={newSelection}
          className={`px-4 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 ${
            selection ? 'bg-[#0EA5E9] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
          }`}
          title="Criar caixa de seleção"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova seleção
        </button>
        {selection && (
          <button
            onClick={saveSelection}
            className="px-4 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            title="Salvar posição atual"
          >
            <Check className="w-3.5 h-3.5" />
            Salvar posição
          </button>
        )}
        {selection && (
          <button
            onClick={() => cropPdf(selection)}
            className="px-4 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
            title="Baixar PDF recortado somente com a área selecionada"
          >
            <Scissors className="w-3.5 h-3.5" />
            Recortar PDF
          </button>
        )}
        <button
          onClick={exportSelections}
          className={`px-4 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 ${
            selections.length > 0 ? 'bg-[#8B5CF6] hover:bg-violet-600 text-white' : 'bg-[#1E293B] text-[#64748B] cursor-not-allowed'
          }`}
          title="Enviar posições salvas para o servidor"
        >
          <Save className="w-3.5 h-3.5" />
          Exportar posições
        </button>
      </div>

      {/* Lista de posições salvas */}
      {selections.length > 0 && (
        <div className="w-full bg-[#0B1220]/95 backdrop-blur border-t border-[#1E293B] px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {selections.map(s => {
            const wMM = Math.round(s.w * PDF_MM_W);
            const hMM = Math.round(s.h * PDF_MM_H);
            return (
              <div key={s.id} className="flex items-center gap-1.5 bg-[#1E293B] rounded-lg px-3 py-1.5 whitespace-nowrap">
                <button onClick={() => applySelection(s)} className="text-xs font-bold text-[#7DD3FC] hover:text-white">
                  {s.name}
                </button>
                <button
                  onClick={() => deleteSelection(s.id)}
                  className="text-[#64748B] hover:text-red-400"
                  title="Remover"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}