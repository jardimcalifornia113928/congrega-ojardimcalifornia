'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Territory } from '@/lib/types';

const PAGE_W = 595.44;
const PAGE_H = 841.92;
const CSS_W = 794;
const CSS_H = Math.round((CSS_W * PAGE_H) / PAGE_W);
const scale = CSS_W / PAGE_W;

const ROW_START = 158;
const ROW_H = 31;
const MAX_ROWS = 20;

interface FieldPos {
  x: number; // pontos do PDF, origem topo-esquerda (canto esquerdo da caixa)
  y: number;
  w: number;
  fontSize: number;
  align: 'left' | 'center' | 'right';
}

const HEADER_FIELDS: Record<string, FieldPos> = {
  mes: { x: 129, y: 84, w: 210, fontSize: 11, align: 'left' },
};

const ROW_FIELDS: Record<string, { x: number; yOffset: number; w: number; fontSize: number; align: 'left' | 'center' | 'right' }> = {
  num: { x: 32, yOffset: 0, w: 35, fontSize: 9, align: 'center' },
  last: { x: 68, yOffset: 0, w: 64, fontSize: 9, align: 'center' },
  des: { x: 132, yOffset: 7, w: 53.5, fontSize: 9, align: 'center' },
  con: { x: 186, yOffset: 7, w: 53.5, fontSize: 9, align: 'center' },
  name: { x: 132, yOffset: -8, w: 107, fontSize: 8, align: 'center' },
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return `${d}/${m}/${y} - ${days[date.getDay()]}`;
}

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function monthLabel(key: string): string {
  if (!key) return '';
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_LABELS[idx]} ${y}`;
}

interface RegistroFieldDef {
  id: string;
  text: string;
  pos: FieldPos;
}

function buildFields(territories: Territory[], viewMonth: string): RegistroFieldDef[] {
  const fields: RegistroFieldDef[] = [];
  fields.push({ id: 'mes', text: `Mês: ${monthLabel(viewMonth)}`, pos: HEADER_FIELDS.mes });
  territories.slice(0, MAX_ROWS).forEach((t, i) => {
    const y = ROW_START + i * ROW_H;
    const push = (key: keyof typeof ROW_FIELDS, text: string) => {
      const f = ROW_FIELDS[key];
      fields.push({ id: `${key}-${i}`, text, pos: { x: f.x, y: y + f.yOffset, w: f.w, fontSize: f.fontSize, align: f.align } });
    };
    push('num', t.number);
    push('last', formatDate(t.ultimaDataConcluida || t.dataConclusao || ''));
    push('des', formatDate(t.dataDesignacao || ''));
    push('con', formatDate(t.dataConclusao || ''));
    push('name', t.dirigenteName || '');
  });
  return fields;
}

interface DebugContextType {
  debug: boolean;
  positions: Record<string, { x: number; y: number }>;
  updatePosition: (id: string, x: number, y: number) => void;
}

const DebugContext = React.createContext<DebugContextType>({ debug: false, positions: {}, updatePosition: () => {} });

const STORAGE_KEY = 'registro-print-positions';

function Overlay({ id, text, pos }: { id: string; text: string; pos: FieldPos }) {
  const { debug, positions, updatePosition } = React.useContext(DebugContext);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ mx: 0, my: 0, sx: 0, sy: 0 });

  const override = positions[id];
  const effX = override?.x ?? pos.x;
  const effY = override?.y ?? pos.y;

  const left = effX * scale + dragOffset.x;
  const top = effY * scale + dragOffset.y;
  const width = pos.w * scale;

  if (!text && !debug) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!debug || !id) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    startPos.current = { mx: e.clientX, my: e.clientY, sx: dragOffset.x, sy: dragOffset.y };
    const handleMouseMove = (ev: MouseEvent) => {
      setDragOffset({ x: startPos.current.sx + (ev.clientX - startPos.current.mx), y: startPos.current.sy + (ev.clientY - startPos.current.my) });
    };
    const handleMouseUp = (ev: MouseEvent) => {
      setDragging(false);
      const newX = Math.round(effX + (ev.clientX - startPos.current.mx) / scale);
      const newY = Math.round(effY + (ev.clientY - startPos.current.my) / scale);
      setDragOffset({ x: 0, y: 0 });
      updatePosition(id, newX, newY);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      data-overlay-id={id}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${15 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: pos.align === 'left' ? 'flex-start' : pos.align === 'right' ? 'flex-end' : 'center',
        textAlign: pos.align,
        fontSize: `${pos.fontSize * scale}px`,
        fontWeight: 'bold',
        color: debug ? '#1D4ED8' : '#111827',
        paddingLeft: pos.align === 'left' ? '2px' : '0px',
        paddingRight: pos.align === 'right' ? '2px' : '0px',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontFamily: 'Arial, Helvetica, sans-serif',
        background: debug ? 'rgba(14,165,233,0.2)' : 'transparent',
        border: debug ? '1px dashed rgba(14,165,233,0.5)' : 'none',
        borderRadius: debug ? '2px' : '0',
        cursor: debug ? 'grab' : 'default',
        pointerEvents: debug ? 'auto' : 'none',
        zIndex: dragging ? 999 : 1,
      }}
    >
      {text || (debug ? id : '')}
      {debug && (
        <span style={{ position: 'absolute', bottom: '-16px', right: '0', fontSize: '8px', color: '#38bdf8', background: '#0F172A', padding: '0 4px', borderRadius: '2px', whiteSpace: 'nowrap', lineHeight: '16px', fontFamily: 'monospace', zIndex: 9999, pointerEvents: 'none' }}>
          {id} x:{effX} y:{effY}
        </span>
      )}
    </div>
  );
}

export function RegistroPrintLayout({ territories, viewMonth, userEmail }: { territories: Territory[]; viewMonth: string; userEmail?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [debug, setDebug] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const updatePosition = React.useCallback((id: string, x: number, y: number) => {
    setPositions(prev => ({ ...prev, [id]: { x, y } }));
  }, []);
  const debugContext: DebugContextType = { debug, positions, updatePosition };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPositions(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch { /* noop */ }
  }, [positions]);

  const fields = buildFields(territories, viewMonth);

  useEffect(() => {
    let active = true;
    async function loadPdf() {
      try {
        const res = await fetch('/territorio/registro-territorio.pdf', { cache: 'no-store' });
        if (!res.ok) throw new Error('Modelo indisponível');
        const buffer = await res.arrayBuffer();

        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (!active) return;
        const page = await pdf.getPage(1);
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const renderScale = 2;
        const viewport = page.getViewport({ scale: renderScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (active) setIsLoaded(true);
      } catch (error) {
        console.error('Erro ao renderizar registro:', error);
      }
    }
    loadPdf();
    return () => { active = false; };
  }, []);

  return (
    <div data-registro-page style={{ position: 'relative', width: `${CSS_W}px`, height: `${CSS_H}px`, backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
          <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
        </div>
      )}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: `${CSS_W}px`, height: `${CSS_H}px`, zIndex: 0, pointerEvents: 'none' }} />

      {isLoaded && (
        <DebugContext.Provider value={debugContext}>
          <div data-registro-overlays style={{ position: 'absolute', top: 0, left: 0, width: `${CSS_W}px`, height: `${CSS_H}px`, zIndex: 10, pointerEvents: debug ? 'auto' : 'none' }}>
            {fields.map(f => (
              <Overlay key={f.id} id={f.id} text={f.text} pos={f.pos} />
            ))}
          </div>
          {debug && (
            <div style={{ position: 'fixed', top: '72px', right: '16px', width: '280px', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#E2E8F0', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto', fontFamily: 'monospace', zIndex: 99999 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#38BDF8' }}>Coordenadas</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { const text = Object.entries(positions).map(([k, v]) => `${k}: { x: ${v.x}, y: ${v.y} }`).join('\n'); navigator.clipboard.writeText(text).then(() => {}); }}
                    style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#38BDF8', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>
                    Copiar
                  </button>
                  <button onClick={() => setPositions({})} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#F87171', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>
                    Reset
                  </button>
                </div>
              </div>
              {Object.keys(positions).length === 0 && (
                <div style={{ color: '#64748B', fontStyle: 'italic' }}>Nenhum item ajustado ainda.<br />Arraste os itens azuis no layout.</div>
              )}
              {Object.entries(positions).map(([id, p]) => (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1E293B', fontSize: '12px' }}>
                  <span style={{ color: '#94A3B8', flex: 1 }}>{id}</span>
                  <span style={{ color: '#E2E8F0' }}>x:{p.x} y:{p.y}</span>
                </div>
              ))}
            </div>
          )}
        </DebugContext.Provider>
      )}
    </div>
  );
}