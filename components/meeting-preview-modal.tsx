'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MidweekPreviewData {
  weekRange: string;
  president: string;
  openingPrayer: string;
  closingPrayer: string;
  talkSpeaker: string;
  talkTheme: string;
  gemsSpeaker: string;
  gemsTheme: string;
  bibleReadingReader: string;
  bibleReadingRef: string;
  part1Theme: string;
  part1Speaker: string;
  part1Assistant: string;
  part1SecondHelper: string;
  part2Theme: string;
  part2Speaker: string;
  part2Assistant: string;
  part2SecondHelper: string;
  part3Theme: string;
  part3Speaker: string;
  part3Assistant: string;
  part3SecondHelper: string;
  part4Theme: string;
  part4Speaker: string;
  part4Assistant: string;
  part4SecondHelper: string;
  lifePart1Theme: string;
  lifePart1Speaker: string;
  lifePart2Theme: string;
  lifePart2Speaker: string;
  lifePart3Theme: string;
  lifePart3Speaker: string;
  mechanicalIndicador1: string;
  mechanicalIndicador2: string;
  mechanicalMicrofone1: string;
  mechanicalMicrofone2: string;
  mechanicalAudioVideo: string;
  mechanicalPalco: string;
  cbsConductor: string;
  cbsReader: string;
  showSuperVisit: boolean;
  superVisitTheme: string;
  superVisitSuperintendent: string;
  superintendentName: string;
  superintendentWife: string;
}

interface WeekendPreviewData {
  president: string;
  openingPrayer: string;
  closingPrayer: string;
  talkTheme: string;
  localSpeaker: string;
  visitingSpeaker: string;
  watchtowerConductor: string;
  watchtowerReader: string;
  mechanicalIndicador1: string;
  mechanicalIndicador2: string;
  mechanicalMicrofone1: string;
  mechanicalMicrofone2: string;
  mechanicalAudioVideo: string;
  mechanicalPalco: string;
  showSuperVisit?: boolean;
  superVisitTheme?: string;
  superVisitSuperintendent?: string;
}

interface Props {
  midweek: MidweekPreviewData;
  weekend: WeekendPreviewData;
  onClose: () => void;
  userEmail?: string;
}

interface PosMeta {
  x: number;
  y: number;
  w?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

interface DebugContextType {
  debug: boolean;
  positions: Record<string, PosMeta>;
  selectedId: string | null;
  select: (id: string | null) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateWidth: (id: string, w: number, x?: number, y?: number) => void;
  updateStyle: (id: string, patch: Partial<PosMeta>) => void;
}

const DebugContext = React.createContext<DebugContextType>({ debug: false, positions: {}, selectedId: null, select: () => {}, updatePosition: () => {}, updateWidth: () => {}, updateStyle: () => {} });

interface OverlayProps {
  id?: string;
  x: number;
  y: number;
  w: number;
  h?: number;
  value: string;
  align?: 'left' | 'right' | 'center';
  fontSize?: number;
  fontWeight?: string;
  color?: string;
}

function v(s: string | undefined | null): boolean {
  return !!s && s.trim() !== '';
}

const DEFAULT_STYLE = { fontFamily: 'Arial, Helvetica, sans-serif', color: '#000000' };

function Overlay({ id, x, y, w, h = 14, value, align = 'left', fontSize = 11, fontWeight = 'bold', color }: OverlayProps) {
  const { debug, positions, selectedId, select, updatePosition, updateWidth, updateStyle } = React.useContext(DebugContext);
  const scale = 794 / 595;
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ mx: 0, my: 0, sx: 0, sy: 0 });

  const override = id ? positions[id] : undefined;
  const effX = override?.x ?? x;
  const effY = override?.y ?? y;
  const effW = override?.w ?? w;
  const effFontSize = override?.fontSize ?? fontSize;
  const effFontFamily = override?.fontFamily ?? DEFAULT_STYLE.fontFamily;
  const effColor = override?.color ?? color ?? DEFAULT_STYLE.color;
  const isSelected = debug && id === selectedId;

  const baseLeft = effX * scale;
  const baseTop = (842 - effY - h + 22.5) * scale;
  const left = baseLeft + dragOffset.x;
  const top = baseTop + dragOffset.y;
  const width = effW * scale;
  const height = h * scale;

  const handleResizeDown = (e: React.MouseEvent) => {
    if (!debug || !id) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const startMX = e.clientX;
    const startW = effW;
    const startX = effX;
    const startY = effY;
    const handleMouseMove = (ev: MouseEvent) => {
      const delta = (ev.clientX - startMX) / scale;
      setDragOffset({ x: 0, y: 0 });
      updateWidth(id!, Math.max(20, Math.round(startW + delta)), startX, startY);
    };
    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const cleanValue = (value && value !== 'null' && value !== 'undefined' && value !== 'N/A') ? value : '';
  const displayValue = cleanValue || '';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!debug) return;
    e.preventDefault();
    e.stopPropagation();
    if (id) select(id);
    if (!id) return;
    setDragging(true);
    startPos.current = { mx: e.clientX, my: e.clientY, sx: dragOffset.x, sy: dragOffset.y };
    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.mx;
      const dy = ev.clientY - startPos.current.my;
      setDragOffset({ x: startPos.current.sx + dx, y: startPos.current.sy + dy });
    };
    const handleMouseUp = (ev: MouseEvent) => {
      setDragging(false);
      const dx = ev.clientX - startPos.current.mx;
      const dy = ev.clientY - startPos.current.my;
      const moved = Math.abs(dx) > 2 || Math.abs(dy) > 2;
      setDragOffset({ x: 0, y: 0 });
      if (moved) {
        const newX = Math.round(effX + dx / scale);
        const newY = Math.round(effY - dy / scale);
        updatePosition(id!, newX, newY);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      data-overlay-id={id}
      data-pdf-x={effX}
      data-pdf-y={effY}
      data-pdf-w={effW}
      data-pdf-h={h}
      data-pdf-align={align}
      data-pdf-font-size={effFontSize}
      data-pdf-font-weight={fontWeight}
      data-pdf-font-family={effFontFamily}
      data-pdf-color={effColor}
      onMouseDown={handleMouseDown}
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
        fontSize: `${effFontSize * scale}px`,
        fontWeight: fontWeight,
        color: isSelected ? '#22D3EE' : (effColor || '#000000'),
        paddingLeft: align === 'left' ? '3px' : '0px',
        paddingRight: align === 'right' ? '3px' : '0px',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        fontFamily: effFontFamily,
        background: isSelected ? 'rgba(34,211,238,0.15)' : (debug ? 'rgba(14,165,233,0.2)' : 'transparent'),
        border: isSelected ? '1px solid #22D3EE' : (debug ? '1px dashed rgba(14,165,233,0.5)' : 'none'),
        borderRadius: debug ? '2px' : '0',
        cursor: debug ? (dragging ? 'grabbing' : 'grab') : 'default',
        pointerEvents: debug ? 'auto' : 'none',
        zIndex: dragging ? 999 : (isSelected ? 5 : 1),
        boxShadow: debug ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none',
      }}
    >
      {displayValue || (debug ? `${id || ''}` : '')}
      {debug && (
        <span style={{ position: 'absolute', bottom: '-17px', right: '0', fontSize: '8px', color: '#38bdf8', background: '#0F172A', padding: '0 4px', borderRadius: '2px', whiteSpace: 'nowrap', lineHeight: '16px', fontFamily: 'monospace', zIndex: 9999, pointerEvents: 'none' }}>
          {id} x:{effX} y:{effY} w:{Math.round(effW)}
        </span>
      )}
      {debug && (
        <div
          onMouseDown={handleResizeDown}
          style={{
            position: 'absolute',
            right: '-3px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '6px',
            height: '100%',
            minHeight: '14px',
            cursor: 'ew-resize',
            background: '#38bdf8',
            borderRadius: '3px',
            zIndex: 99999,
            pointerEvents: 'auto',
          }}
          title="Arrastar para ajustar a largura"
        />
      )}
    </div>
  );
}

function Grid({ gridStep }: { gridStep: number }) {
  const scale = 794 / 595;
  const lines: React.ReactElement[] = [];
  for (let y = 0; y <= 842; y += gridStep) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={(842 - y) * scale}
        x2={595 * scale}
        y2={(842 - y) * scale}
        stroke="#0EA5E9"
        strokeWidth={0.5}
        opacity={0.6}
      />
    );
  }
  for (let x = 0; x <= 595; x += gridStep) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x * scale}
        y1={0}
        x2={x * scale}
        y2={842 * scale}
        stroke="#0EA5E9"
        strokeWidth={0.5}
        opacity={0.6}
      />
    );
  }
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '794px', height: '1123px', pointerEvents: 'none', zIndex: 5 }}
      width="794"
      height="1123"
    >
      {lines}
    </svg>
  );
}

function PrintLayout({ midweek, weekend, userEmail }: { midweek: MidweekPreviewData; weekend: WeekendPreviewData; userEmail?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);
  const [debug, setDebug] = useState(false);
  const [positions, setPositions] = useState<Record<string, PosMeta>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridVisible, setGridVisible] = useState(false);
  const [gridStep, setGridStep] = useState(20);
  const [fontSize, setFontSize] = useState(10);
  const updatePosition = React.useCallback((id: string, x: number, y: number) => {
    setPositions(prev => ({ ...prev, [id]: { ...(prev[id] || {}), x, y } }));
  }, []);
  const updateWidth = React.useCallback((id: string, w: number, x?: number, y?: number) => {
    setPositions(prev => {
      const existing = prev[id] || {};
      return { ...prev, [id]: { ...existing, x: existing.x ?? x ?? 0, y: existing.y ?? y ?? 0, w } };
    });
  }, []);
  const updateStyle = React.useCallback((id: string, patch: Partial<PosMeta>) => {
    setPositions(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }, []);
  const select = React.useCallback((id: string | null) => setSelectedId(id), []);
  const debugContext: DebugContextType = { debug, positions, selectedId, select, updatePosition, updateWidth, updateStyle };

  const STORAGE_KEY = 'meeting-print-positions';
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPositions(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }, []);
  useEffect(() => {
    try { if (Object.keys(positions).length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); } catch (e) { /* ignore */ }
  }, [positions]);

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
    { y: 573, labelX: 7, labelW: 150, valX: 181, valW: 400 },
    { y: 543, labelX: 7, labelW: 150, valX: 179, valW: 402 },
    { y: 513, labelX: 8, labelW: 161, valX: 179, valW: 402 },
    { y: 483, labelX: 7, labelW: 150, valX: 179, valW: 320 },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
    <div data-print-layout style={{ position: 'relative', width: '794px', height: '1123px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {userEmail === 'mariomarciofranco@gmail.com' && (
        <button onClick={() => setDebug(d => !d)}
          style={{
            position: 'absolute', top: '4px', right: '4px', zIndex: 9999,
            background: debug ? '#DC2626' : '#0EA5E9', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold',
            cursor: 'pointer', opacity: 0.7
          }}>
          {debug ? 'Fechar' : 'Construtor'}
        </button>
      )}
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
        <DebugContext.Provider value={debugContext}>
        <div 
          className="overlay-container"
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '794px', 
            height: '1123px', 
            zIndex: 10,
            pointerEvents: debug ? 'auto' : 'none'
          }}
        >
          {gridVisible && <Grid gridStep={gridStep} />}
          {/* Week range */}
          <Overlay id="weekRange" x={418} y={801} w={167} value={midweek.weekRange.toUpperCase() + ' |'} align="right" fontSize={11} />

          {/* Superintendente Visit */}
          {(midweek.showSuperVisit || weekend.showSuperVisit) && (
            <Overlay id="visitaHeader" x={10} y={801} w={393} value={"Semana Visita Superintendente " + ((midweek.superintendentName || "") + " - " + (midweek.superintendentWife || "")).trim()} fontSize={11} fontWeight="bold" align="left" />
          )}

          {/* Midweek header */}
          <Overlay id="mwPresident" x={10} y={782} w={68} value="Presidente" fontSize={11} fontWeight="bold" color="#15515d" />
          <Overlay id="mwPresidentNome" x={77} y={783} w={199} value={midweek.president || "(sem designado)"} fontSize={11} />
          <Overlay id="mwOpeningPrayer" x={279} y={783} w={84} value="Oração Inicial" fontSize={11} fontWeight="bold" color="#15515d" />
          <Overlay id="mwOpeningPrayerNome" x={361} y={782} w={208} value={midweek.openingPrayer || "(sem designado)"} fontSize={11} />
          <Overlay id="mwClosingPrayer" x={278} y={761} w={82} value="Oração Final" fontSize={11} fontWeight="bold" color="#15515d" />
          <Overlay id="mwClosingPrayerNome" x={360} y={761} w={210} value={midweek.closingPrayer || "(sem designado)"} fontSize={11} />

          {/* Treasures */}
          <Overlay id="mwTalkTheme" x={6} y={699} w={88} value="01 - Tesouros" color="#3a6869" />
          <Overlay id={`mwTalkSpeaker`} x={281} y={699} w={260} value={midweek.talkSpeaker} />
          <Overlay id="mwGemsTheme" x={7} y={674} w={65} value="02 - Jóias" color="#15515d" />
          <Overlay id="mwGemsSpeaker" x={281} y={673} w={230} value={midweek.gemsSpeaker} />
          <Overlay id="mwBibleReadingRef" x={7} y={647} w={136} value="03 - Leitura da Biblia" color="#4e6b6a" />
          <Overlay id="mwBibleReading" x={281} y={648} w={230} value={midweek.bibleReadingReader} />

          {/* Faça Seu Melhor (Ministry) */}
          {ministeriosSlots.map((slot, i) => {
            if (i < activeParts.length) {
              const part = activeParts[i];
              const fullNames = [part.person, part.asst, part.h2].filter(Boolean).join(' / ');
              const themeColors = ['#c8901b', '#d48d01', '#d19403', '#d19403'];
              const namesW = [400, 402, 402, 320];
              return (
                <React.Fragment key={i}>
                  <Overlay id={`ministTheme${i}`} x={slot.labelX} y={slot.y} w={slot.labelW} value={part.theme} fontSize={11} color={themeColors[i]} />
                  <Overlay id={`ministNames${i}`} x={slot.valX} y={slot.y} w={i < namesW.length ? namesW[i] : slot.valW} value={fullNames} fontSize={fontSize} align="left" />
                </React.Fragment>
              );
            }
            return null;
          })}

          {/* Nossa Vida Cristã section */}
          {activeLife.map((life, i) => {
            const lifeSlots = [
              { y: 420, labelX: 8, labelW: 348, valX: 360, valW: 320 },
              { y: 406, labelX: 8, labelW: 348, valX: 360, valW: 320 },
              { y: 393, labelX: 8, labelW: 349, valX: 361, valW: 320 },
            ];
            const lifeThemeColors = ['#7d3d3e', '#7d3d3e', '#7d3d3e'];
            const slot = lifeSlots[i];
            return (
              <React.Fragment key={i}>
                <Overlay id={`lifeTheme${i}`} x={slot.labelX} y={slot.y} w={slot.labelW} value={life.theme} fontSize={11} color={lifeThemeColors[i]} />
                <Overlay id={`lifeSpeaker${i}`} x={slot.valX} y={slot.y} w={slot.valW} value={life.speaker} fontSize={fontSize} align="left" />
              </React.Fragment>
            );
          })}

          {/* CBS section */}
          <Overlay id="cbsLabel" x={7} y={378} w={91} value="Estudo Bíblico" fontSize={11} fontWeight="bold" color="#7d3d3e" />
          <Overlay id="cbsDir" x={97} y={379} w={200} value={midweek.cbsConductor || "—"} fontSize={11} />
          <Overlay id="cbsLeitor" x={298} y={379} w={57} value="Leitor:" fontSize={11} fontWeight="bold" color="#7d3d3e" />
          <Overlay id="cbsLeitorNome" x={361} y={380} w={232} value={midweek.cbsReader || "—"} fontSize={11} />

          {/* Mechanical parts (Midweek) */}
          <Overlay id="mwMecInd1" x={11} y={323} w={71} value="Indicador 1" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="mwMecInd1Nome" x={81} y={323} w={195} value={midweek.mechanicalIndicador1 || ""} fontSize={11} />
          <Overlay id="mwMecMic1" x={12} y={292} w={70} value="Microfone 1" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="mwMecMic1Nome" x={81} y={291} w={195} value={midweek.mechanicalMicrofone1 || ""} fontSize={11} />
          <Overlay id="mwMecAV" x={11} y={263} w={81} value="Áudio e Vídeo" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="mwMecAVNome" x={91} y={263} w={195} value={midweek.mechanicalAudioVideo || ""} fontSize={11} />
          <Overlay id="mwMecInd2" x={331} y={321} w={71} value="Indicador 2" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="mwMecInd2Nome" x={402} y={321} w={160} value={midweek.mechanicalIndicador2 || ""} fontSize={11} />
          <Overlay id="mwMecMic2" x={331} y={293} w={70} value="Microfone 2" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="mwMecMic2Nome" x={400} y={293} w={163} value={midweek.mechanicalMicrofone2 || ""} fontSize={11} />
          <Overlay id="mwMecPalco" x={331} y={262} w={41} value="Palco" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="mwMecPalcoNome" x={371} y={262} w={160} value={midweek.mechanicalPalco || ""} fontSize={11} />

          {/* FIM DE SEMANA */}
          {(() => {
            const mwHas = v(midweek.superVisitTheme) || v(midweek.superVisitSuperintendent);
            const weHas = v(weekend.superVisitTheme) || v(weekend.superVisitSuperintendent);
            const visitActive = !!(midweek.showSuperVisit || weekend.showSuperVisit);
            const showVisit = visitActive || mwHas || weHas;
            return showVisit ? (
              <>
                {mwHas && (
                  <>
                    <Overlay id="weSuperTema" x={6} y={365} w={39} value="Tema:" fontSize={11} fontWeight="bold" color="#82484a" />
                    <Overlay id="weSuperTemaVal" x={49} y={365} w={269} value={midweek.superVisitTheme || ""} fontSize={11} />
                    <Overlay id="weSuperNome" x={319} y={365} w={50} value="Orador:" fontSize={11} fontWeight="bold" color="#7d3d3e" />
                    <Overlay id="weSuperNomeVal" x={368} y={365} w={219} value={midweek.superVisitSuperintendent || ""} fontSize={11} />
                  </>
                )}
                {weHas && (
                  <>
                    <Overlay id="weSuperTema2" x={9} y={125} w={41} value="Tema:" fontSize={11} fontWeight="bold" color="#6e6e6e" />
                    <Overlay id="weSuperTema2Val" x={50} y={125} w={321} value={weekend.superVisitTheme || ""} fontSize={11} />
                    <Overlay id="weSuperNome2" x={369} y={125} w={50} value="Orador:" fontSize={11} fontWeight="bold" color="#6e6e6e" />
                    <Overlay id="weSuperNome2Val" x={416} y={125} w={162} value={weekend.superVisitSuperintendent || ""} fontSize={11} />
                  </>
                )}
              </>
            ) : null;
          })()}
          <Overlay id="wePresident" x={9} y={199} w={79} value="Presidente" fontSize={11} fontWeight="bold" color="#6e6e6e" />
          <Overlay id="wePresidentNome" x={87} y={199} w={199} value={weekend.president || "(sem designado)"} fontSize={11} />
          <Overlay id="weOpeningPrayer" x={286} y={199} w={83} value="Oração Inicial" fontSize={11} fontWeight="bold" color="#6e6e6e" />
          <Overlay id="weOpeningPrayerNome" x={371} y={199} w={215} value={weekend.openingPrayer || "(sem designado)"} fontSize={11} />
          <Overlay id="weClosingPrayer" x={286} y={185} w={75} value="Oração Final" fontSize={11} fontWeight="bold" color="#606060" />
          <Overlay id="weClosingPrayerNome" x={370} y={183} w={215} value={weekend.closingPrayer || "(sem designado)"} fontSize={11} />

          {/* Talk theme & speaker */}
          <Overlay id="weTalkTheme" x={9} y={163} w={45} value="Tema:" fontSize={11} fontWeight="bold" color="#6e6e6e" />
          <Overlay id="weTalkThemeVal" x={52} y={163} w={309} value={weekend.talkTheme || ""} fontSize={11} />
          <Overlay id="weTalkSpeaker" x={370} y={163} w={50} value="Orador:" fontSize={11} fontWeight="bold" color="#6e6e6e" />
          <Overlay id="weTalkSpeakerNome" x={419} y={163} w={164} value={(weekend.localSpeaker || weekend.visitingSpeaker) || ""} fontSize={11} />

          {/* Watchtower Study */}
          <Overlay id="weSentinelaLabel" x={9} y={144} w={65} value="Sentinela" fontSize={11} fontWeight="bold" color="#6e6e6e" />
          <Overlay id="weWatchtowerCond" x={75} y={144} w={210} value={weekend.watchtowerConductor || "\u2014"} fontSize={11} />
          <Overlay id="weReaderLabel" x={285} y={143} w={45} value="Leitor:" fontSize={11} fontWeight="bold" color="#6e6e6e" />
          <Overlay id="weWatchtowerReader" x={335} y={143} w={140} value={weekend.watchtowerReader || "\u2014"} fontSize={11} />

          {/* Mechanical parts (Weekend) */}
          <Overlay id="weMecInd1" x={9} y={84} w={69} value="Indicador 1" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="weMecInd1Nome" x={81} y={84} w={243} value={weekend.mechanicalIndicador1 || ""} fontSize={11} />
          <Overlay id="weMecMic1" x={10} y={59} w={70} value="Microfone 1" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="weMecMic1Nome" x={79} y={59} w={244} value={weekend.mechanicalMicrofone1 || ""} fontSize={11} />
          <Overlay id="weMecAV" x={11} y={34} w={85} value="Áudio e Vídeo" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="weMecAVNome" x={96} y={33} w={226} value={weekend.mechanicalAudioVideo || ""} fontSize={11} />
          <Overlay id="weMecInd2" x={331} y={84} w={69} value="Indicador 2" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="weMecInd2Nome" x={401} y={81} w={188} value={weekend.mechanicalIndicador2 || ""} fontSize={11} />
          <Overlay id="weMecMic2" x={331} y={58} w={71} value="Microfone 2" fontSize={11} fontWeight="bold" color="#284f14" />
          <Overlay id="weMecMic2Nome" x={400} y={58} w={188} value={weekend.mechanicalMicrofone2 || ""} fontSize={11} />
          <Overlay id="weMecPalco" x={331} y={33} w={42} value="Palco" fontSize={11} fontWeight="bold" color="#274e13" />
          <Overlay id="weMecPalcoNome" x={372} y={33} w={214} value={weekend.mechanicalPalco || ""} fontSize={11} />
        </div>
        {debug && (
          <div style={{ position: 'fixed', top: '72px', right: '16px', width: '280px', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#E2E8F0', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto', fontFamily: 'monospace', zIndex: 99999 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#38BDFY' }}>Construtor</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    const salvo = Object.entries(positions).reduce<Record<string, PosMeta>>((acc, [k, v]) => {
                      const item: PosMeta = { x: v.x, y: v.y };
                      if (v.w !== undefined) item.w = v.w;
                      if (v.fontSize !== undefined) item.fontSize = v.fontSize;
                      if (v.fontFamily !== undefined) item.fontFamily = v.fontFamily;
                      if (v.color !== undefined) item.color = v.color;
                      acc[k] = item;
                      return acc;
                    }, {});
                    const blob = new Blob([JSON.stringify(salvo, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'posicoes-impressao.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Configuração salva! Envie o arquivo para aplicar.');
                  }}
                  style={{ background: '#16A34A', border: '1px solid #166534', borderRadius: '4px', color: '#fff', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Salvar
                </button>
                <button
                  onClick={() => {
                    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); } catch (e) { /* ignore */ }
                    toast.success('Aplicado! O PDF já usa estas configurações.');
                  }}
                  style={{ background: '#7C3AED', border: '1px solid #5B21B6', borderRadius: '4px', color: '#fff', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Aplicar
                </button>
                <button onClick={() => { const text = Object.entries(positions).map(([k,v]) => `${k}: x={${v.x}} y={${v.y}} w={${v.w}}`).join('\n'); navigator.clipboard.writeText(text).then(() => toast.success('Posições copiadas!')); }}
                  style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#38BDFY', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>
                  Copiar
                </button>
                <button onClick={() => setPositions({})} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#F87171', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>
                  Reset
                </button>
              </div>
            </div>

            {/* Grade de referência */}
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#38BDFY' }}>Grade</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={gridVisible}
                    onChange={e => setGridVisible(e.target.checked)}
                    style={{ accentColor: '#0EA5E9', width: '14px', height: '14px' }}
                  />
                  Mostrar
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#94A3B8', fontSize: '11px' }}>Espaçamento</span>
                <button onClick={() => setGridStep(s => Math.max(5, s - 5))}
                  style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#38BDFY', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>
                  −
                </button>
                <span style={{ minWidth: '36px', textAlign: 'center', color: '#E2E8F0' }}>{gridStep} pt</span>
                <button onClick={() => setGridStep(s => Math.min(100, s + 5))}
                  style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#38BDFY', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>
                  +
                </button>
              </div>
            </div>

            {/* Propriedades da caixa selecionada */}
            {selectedId ? (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#38BDFY' }}>Propriedades</span>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>{selectedId}</span>
                </div>

                {/* Tamanho da fonte */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>Tamanho da fonte</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => updateStyle(selectedId, { fontSize: Math.max(6, (positions[selectedId]?.fontSize ?? 11) - 1) })}
                      style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#F87171', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}>A-</button>
                    <span style={{ minWidth: '26px', textAlign: 'center', color: '#E2E8F0', fontSize: '11px' }}>{positions[selectedId]?.fontSize ?? 11}</span>
                    <button onClick={() => updateStyle(selectedId, { fontSize: Math.min(24, (positions[selectedId]?.fontSize ?? 11) + 1) })}
                      style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#38BDFY', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}>A+</button>
                  </div>
                </div>

                {/* Família da fonte */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>Fonte</span>
                  <select
                    value={positions[selectedId]?.fontFamily ?? DEFAULT_STYLE.fontFamily}
                    onChange={e => updateStyle(selectedId, { fontFamily: e.target.value })}
                    style={{ background: '#1E293B', color: '#E2E8F0', border: '1px solid #334155', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', maxWidth: '150px' }}
                  >
                    <option value="Arial, Helvetica, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="Verdana, Geneva, sans-serif">Verdana</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                  </select>
                </div>

                {/* Cor da fonte */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>Cor da fonte</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={positions[selectedId]?.color ?? DEFAULT_STYLE.color}
                      onChange={e => updateStyle(selectedId, { color: e.target.value })}
                      style={{ width: '30px', height: '26px', border: '1px solid #334155', borderRadius: '4px', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    />
                    <button
                      onClick={async () => {
                        try {
                          const EyeDropper = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
                          if (!EyeDropper) {
                            toast.error('Conta-gotas não suportado neste navegador (use Chrome).');
                            return;
                          }
                          const ed = new EyeDropper();
                          const result = await ed.open();
                          if (result?.sRGBHex) updateStyle(selectedId, { color: result.sRGBHex });
                        } catch (e) { /* usuário cancelou */ }
                      }}
                      title="Conta-gotas - pegar cor da tela"
                      style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#38BDFY', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>
                      Conta-gotas
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px' }}>
                Selecione uma caixa no layout para editar fonte, tamanho e cor.
              </div>
            )}

            {Object.keys(positions).length === 0 && (
              <div style={{ color: '#64748B', fontStyle: 'italic' }}>Nenhum item ajustado ainda.<br />Arraste os itens azuis no layout.</div>
            )}
            {Object.entries(positions).map(([id, pos]) => (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1E293B', fontSize: '12px' }}>
                <span style={{ color: '#94A3B8', flex: 1 }}>{id}</span>
                <span style={{ color: '#E2E8F0' }}>x:{pos.x} y:{pos.y}</span>
              </div>
            ))}
          </div>
        )}
      </DebugContext.Provider>
      )}
    </div>
    </div>
  );
}

export function MeetingPreviewModal({ midweek, weekend, onClose, userEmail }: Props) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!layoutRef.current) return;
    setIsGenerating(true);
    const toastId = toast.loading('Gerando PDF...');
    try {
      const jsPDF = (await import('jspdf')).default;

      const layoutEl = layoutRef.current.querySelector('[data-print-layout]') as HTMLElement;
      if (!layoutEl) throw new Error('Layout não encontrado.');

      const W = 794;
      const H = 1123;
      const S = 2;
      const cw = W * S;
      const ch = H * S;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cw;
      finalCanvas.height = ch;
      const ctx = finalCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);

      const bgCanvas = layoutEl.querySelector('canvas') as HTMLCanvasElement | null;
      if (bgCanvas && bgCanvas.width > 0 && bgCanvas.height > 0) {
        try {
          ctx.drawImage(bgCanvas, 0, 0, cw, ch);
        } catch (e) {
          console.warn('Fundo não pôde ser copiado, usando branco:', e);
        }
      }

      const overlayEl = layoutEl.querySelector('.overlay-container') as HTMLElement | null;
      if (overlayEl) {
        const spans = Array.from(overlayEl.querySelectorAll('[data-overlay-id]')) as HTMLElement[];
        for (const span of spans) {
          const cs = getComputedStyle(span);
          const leftPx = parseFloat(cs.left) || 0;
          const topPx = parseFloat(cs.top) || 0;
          const wPx = parseFloat(cs.width) || 0;
          const fontPx = parseFloat(cs.fontSize) || 11;
          const weight = cs.fontWeight === 'bold' || parseInt(cs.fontWeight, 10) >= 600 ? 'bold' : 'normal';
          const color = cs.color;
          const fontFamily = cs.fontFamily || 'Arial, Helvetica, sans-serif';
          const align = (cs.textAlign || 'left') as CanvasTextAlign;

          ctx.save();
          ctx.font = `${weight} ${Math.max(1, fontPx * S)}px ${fontFamily}`;
          ctx.fillStyle = cs.color || '#000';
          if (color) ctx.fillStyle = color;
          ctx.textBaseline = 'middle';
          ctx.textAlign = align;

          const text = (span.firstChild?.textContent ?? '') || '';
          if (!text) continue;
          const lx =
            align === 'right'
              ? (leftPx + wPx) * S
              : align === 'center'
              ? (leftPx + wPx / 2) * S
              : leftPx * S;
          const ly = topPx * S + (fontPx * S) / 2;

          if (weight === 'bold' && color) ctx.fillStyle = color;
          ctx.fillText(text, lx, ly);
          ctx.restore();
        }
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(finalCanvas, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');

      const fileName = `programacao-${midweek.weekRange.replace(/[\s/]/g, '-').toLowerCase()}.pdf`;
      pdf.save(fileName);
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 overflow-y-auto z-50 p-4">
      <div className="relative max-w-5xl mx-auto" ref={layoutRef}>
        <PrintLayout midweek={midweek} weekend={weekend} userEmail={userEmail} />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/80 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Baixar PDF
          </button>
          <button
            onClick={onClose}
            className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-gray-300 px-4 py-2 rounded-lg font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export type { MidweekPreviewData, WeekendPreviewData };
