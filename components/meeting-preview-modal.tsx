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
}

interface Props {
  midweek: MidweekPreviewData;
  weekend: WeekendPreviewData;
  onClose: () => void;
  userEmail?: string;
}

interface DebugContextType {
  debug: boolean;
  positions: Record<string, { x: number; y: number }>;
  updatePosition: (id: string, x: number, y: number) => void;
}

const DebugContext = React.createContext<DebugContextType>({ debug: false, positions: {}, updatePosition: () => {} });

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
}

function v(s: string): boolean {
  return !!s && s.trim() !== '';
}

function Overlay({ id, x, y, w, h = 14, value, align = 'left', fontSize = 11, fontWeight = 'bold' }: OverlayProps) {
  const { debug, positions, updatePosition } = React.useContext(DebugContext);
  const scale = 794 / 595;
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ mx: 0, my: 0, sx: 0, sy: 0 });

  const override = id && debug ? positions[id] : undefined;
  const effX = override?.x ?? x;
  const effY = override?.y ?? y;

  const baseLeft = effX * scale;
  const baseTop = (842 - effY - h + 22.5) * scale;
  const left = baseLeft + dragOffset.x;
  const top = baseTop + dragOffset.y;
  const width = w * scale;
  const height = h * scale;

  const cleanValue = (value && value !== 'null' && value !== 'undefined' && value !== 'N/A') ? value : '';
  const displayValue = cleanValue || '';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!debug || !id) return;
    e.preventDefault();
    e.stopPropagation();
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
      const newX = Math.round(effX + dx / scale);
      const newY = Math.round(effY - dy / scale);
      setDragOffset({ x: 0, y: 0 });
      updatePosition(id!, newX, newY);
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
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        textAlign: align,
        fontSize: `${fontSize * scale}px`,
        fontWeight: fontWeight,
        color: debug ? '#1D4ED8' : '#000000',
        paddingLeft: align === 'left' ? '3px' : '0px',
        paddingRight: align === 'right' ? '3px' : '0px',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        overflow: 'visible',
        fontFamily: 'Arial, Helvetica, sans-serif',
        background: debug ? 'rgba(14,165,233,0.2)' : 'transparent',
        border: debug ? '1px dashed rgba(14,165,233,0.5)' : 'none',
        borderRadius: debug ? '2px' : '0',
        cursor: debug ? 'grab' : 'default',
        pointerEvents: debug ? 'auto' : 'none',
        zIndex: dragging ? 999 : 1,
        boxShadow: debug ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none',
      }}
    >
      {displayValue || (debug ? `${id || ''}` : '')}
      {debug && (
        <span style={{ position: 'absolute', bottom: '-17px', right: '0', fontSize: '8px', color: '#38bdf8', background: '#0F172A', padding: '0 4px', borderRadius: '2px', whiteSpace: 'nowrap', lineHeight: '16px', fontFamily: 'monospace', zIndex: 9999, pointerEvents: 'none' }}>
          {id} x:{effX} y:{effY}
        </span>
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
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [gridVisible, setGridVisible] = useState(false);
  const [gridStep, setGridStep] = useState(20);
  const [fontSize, setFontSize] = useState(10);
  const updatePosition = React.useCallback((id: string, x: number, y: number) => {
    setPositions(prev => ({ ...prev, [id]: { x, y } }));
  }, []);
  const debugContext: DebugContextType = { debug, positions, updatePosition };

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
    { y: 573, labelX: 11, labelW: 150, valX: 149, valW: 320 },
    { y: 544, labelX: 11, labelW: 150, valX: 150, valW: 320 },
    { y: 516, labelX: 10, labelW: 150, valX: 150, valW: 320 },
    { y: 486, labelX: 11, labelW: 150, valX: 151, valW: 320 },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
    <div style={{ position: 'relative', width: '794px', height: '1123px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {userEmail === 'mariomarciofranco@gmail.com' && (
        <button onClick={() => setDebug(d => !d)}
          style={{
            position: 'absolute', top: '4px', right: '4px', zIndex: 9999,
            background: debug ? '#DC2626' : '#0EA5E9', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold',
            cursor: 'pointer', opacity: 0.7
          }}>
          {debug ? 'Sair' : 'Ajustar'}
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
          <Overlay id="weekRange" x={415} y={798} w={142} value={midweek.weekRange.toUpperCase() + ' |'} align="right" fontSize={11} />

          {/* Superintendente Visit */}
          {midweek.showSuperVisit && (
            <Overlay id="visitaHeader" x={16} y={799} w={495} value={"Semana Visita Superintendente " + midweek.superintendentName + " - " + midweek.superintendentWife} fontSize={11} fontWeight="bold" align="center" />
          )}

          {/* Midweek header */}
          <Overlay id="mwPresident" x={11} y={784} w={250} value={"Presidente - " + (midweek.president || "(sem designado)")} />
          <Overlay id="mwOpeningPrayer" x={280} y={784} w={220} value={"Oração Inicial - " + (midweek.openingPrayer || "(sem designado)")} />
          <Overlay id="mwClosingPrayer" x={280} y={760} w={200} value={"Oração Final - " + (midweek.closingPrayer || "(sem designado)")} />

          {/* Treasures */}
          <Overlay id="mwTalkTheme" x={11} y={699} w={380} value="01 - Tesouros" />
          <Overlay id={`mwTalkSpeaker`} x={280} y={699} w={260} value={midweek.talkSpeaker} />
          <Overlay id="mwGemsTheme" x={11} y={674} w={290} value="02 - Jóias" />
          <Overlay id="mwGemsSpeaker" x={281} y={673} w={230} value={midweek.gemsSpeaker} />
          <Overlay id="mwBibleReadingRef" x={11} y={648} w={290} value="03 - Leitura da Biblia" />
          <Overlay id="mwBibleReading" x={282} y={648} w={230} value={midweek.bibleReadingReader} />

          {/* Faça Seu Melhor (Ministry) */}
          {ministeriosSlots.map((slot, i) => {
            if (i < activeParts.length) {
              const part = activeParts[i];
              const fullNames = [part.person, part.asst, part.h2].filter(Boolean).join(' / ');
              return (
                <React.Fragment key={i}>
                  <Overlay id={`ministTheme${i}`} x={slot.labelX} y={slot.y} w={slot.labelW} value={part.theme} fontSize={11} />
                  <Overlay id={`ministNames${i}`} x={slot.valX} y={slot.y} w={slot.valW} value={fullNames} fontSize={fontSize} align="left" />
                </React.Fragment>
              );
            }
            return null;
          })}

          {/* Nossa Vida Cristã section */}
          {activeLife.map((life, i) => {
            const lifeSlots = [
              { y: 420, labelX: 11, labelW: 150, valX: 290, valW: 320 },
              { y: 407, labelX: 10, labelW: 150, valX: 290, valW: 320 },
              { y: 516, labelX: 9, labelW: 150, valX: 281, valW: 320 },
            ];
            const slot = lifeSlots[i];
            return (
              <React.Fragment key={i}>
                <Overlay id={`lifeTheme${i}`} x={slot.labelX} y={slot.y} w={slot.labelW} value={life.theme} fontSize={11} />
                <Overlay id={`lifeSpeaker${i}`} x={slot.valX} y={slot.y} w={slot.valW} value={life.speaker} fontSize={fontSize} align="left" />
              </React.Fragment>
            );
          })}

          {/* CBS section */}
          <Overlay id="cbsLabel" x={10} y={384} w={110} value="Estudo Bíblico" fontSize={11} fontWeight="bold" />
          <Overlay id="cbsDir" x={117} y={384} w={200} value={midweek.cbsConductor || "—"} fontSize={11} />
          <Overlay id="cbsLeitor" x={313} y={384} w={230} value={midweek.cbsReader ? "Leitor: " + midweek.cbsReader : "—"} fontSize={11} />

          {/* Mechanical parts (Midweek) */}
          <Overlay id="mwMecInd1" x={101} y={321} w={200} value={midweek.mechanicalIndicador1} />
          <Overlay id="mwMecMic1" x={100} y={296} w={200} value={midweek.mechanicalMicrofone1} />
          <Overlay id="mwMecAV" x={101} y={271} w={200} value={midweek.mechanicalAudioVideo} />
          <Overlay id="mwMecInd2" x={391} y={321} w={160} value={midweek.mechanicalIndicador2} />
          <Overlay id="mwMecMic2" x={390} y={296} w={160} value={midweek.mechanicalMicrofone2} />
          <Overlay id="mwMecPalco" x={390} y={271} w={160} value={midweek.mechanicalPalco} />

          {/* FIM DE SEMANA */}
          {midweek.showSuperVisit && (
            <>
              <Overlay id="weSuperTema" x={10} y={365} w={290} value={"Tema - " + midweek.superVisitTheme} fontSize={11} />
              <Overlay id="weSuperNome" x={319} y={365} w={245} value={"Super. Circuito - " + midweek.superVisitSuperintendent} fontSize={11} />
            </>
          )}
          <Overlay id="wePresident" x={10} y={199} w={250} value={"Presidente - " + (weekend.president || "(sem designado)")} />
          <Overlay id="weOpeningPrayer" x={289} y={201} w={220} value={"Oração Inicial - " + (weekend.openingPrayer || "(sem designado)")} />
          <Overlay id="weClosingPrayer" x={288} y={186} w={200} value={"Oração Final - " + (weekend.closingPrayer || "(sem designado)")} />

          {/* Talk theme & speaker */}
          <Overlay id="weTalkTheme" x={10} y={169} w={380} value={weekend.talkTheme ? "Tema - " + weekend.talkTheme : ""} />
          <Overlay id="weTalkSpeaker" x={355} y={170} w={160} value={(weekend.localSpeaker || weekend.visitingSpeaker) ? "Orador - " + (weekend.localSpeaker || weekend.visitingSpeaker) : ""} />

          {/* Watchtower Study */}
          <Overlay id="weSentinelaLabel" x={10} y={148} w={145} value="Sentinela" fontSize={11} fontWeight="bold" />
          <Overlay id="weWatchtowerCond" x={79} y={148} w={210} value={weekend.watchtowerConductor || "\u2014"} />
          <Overlay id="weWatchtowerReader" x={290} y={148} w={180} value={weekend.watchtowerReader ? "Leitor: " + weekend.watchtowerReader : "\u2014"} />

          {/* Mechanical parts (Weekend) */}
          <Overlay id="weMecInd1" x={97} y={81} w={200} value={weekend.mechanicalIndicador1} />
          <Overlay id="weMecMic1" x={98} y={57} w={200} value={weekend.mechanicalMicrofone1} />
          <Overlay id="weMecAV" x={98} y={33} w={200} value={weekend.mechanicalAudioVideo} />
          <Overlay id="weMecInd2" x={389} y={83} w={160} value={weekend.mechanicalIndicador2} />
          <Overlay id="weMecMic2" x={389} y={58} w={160} value={weekend.mechanicalMicrofone2} />
          <Overlay id="weMecPalco" x={389} y={33} w={160} value={weekend.mechanicalPalco} />
        </div>
        {debug && (
          <div style={{ position: 'fixed', top: '72px', right: '16px', width: '280px', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#E2E8F0', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto', fontFamily: 'monospace', zIndex: 99999 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#38BDFY' }}>Coordenadas</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { const text = Object.entries(positions).map(([k,v]) => `${k}: x={${v.x}} y={${v.y}}`).join('\n'); navigator.clipboard.writeText(text).then(() => toast.success('Posições copiadas!')); }}
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

            {/* Controle de tamanho de fonte */}
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #1E293B' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#94A3B8', fontSize: '11px' }}>Fonte</span>
                <button onClick={() => setFontSize(s => Math.min(14, s + 1))}
                  style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#38BDFY', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>
                  A+
                </button>
                <span style={{ minWidth: '24px', textAlign: 'center', color: '#E2E8F0' }}>{fontSize}px</span>
                <button onClick={() => setFontSize(s => Math.max(8, s - 1))}
                  style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#F87171', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>
                  A-
                </button>
              </div>
              <div style={{ fontSize: '10px', color: '#64748B' }}>Tamanho para nomes (8-14px)</div>
            </div>

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
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF', { id: toastId });
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
