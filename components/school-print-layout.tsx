'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
}

const cards = [
  { id: 3, nome: { x: 82, y: 749.5 }, ajudante: { x: 152, y: 642 }, data: { x: 72, y: 703.5 }, numeroParte: { x: 252, y: 742 }, salaoPrincipal: { x: 178, y: 839 }, salaB: { x: 178, y: 866 }, salaC: { x: 178, y: 893 } },
  { id: 4, nome: { x: 378, y: 749.5 }, ajudante: { x: 400, y: 726 }, data: { x: 372, y: 703.5 }, numeroParte: { x: 440, y: 680 }, salaoPrincipal: { x: 476, y: 839 }, salaB: { x: 476, y: 866 }, salaC: { x: 476, y: 893 } },
  { id: 1, nome: { x: 77, y: 329 }, ajudante: { x: 97, y: 306 }, data: { x: 77, y: 282 }, numeroParte: { x: 144, y: 260 }, salaoPrincipal: { x: 178, y: 418 }, salaB: { x: 178, y: 445 }, salaC: { x: 178, y: 472 } },
  { id: 2, nome: { x: 375, y: 329 }, ajudante: { x: 395, y: 306 }, data: { x: 370, y: 282 }, numeroParte: { x: 435, y: 260 }, salaoPrincipal: { x: 476, y: 418 }, salaB: { x: 476, y: 445 }, salaC: { x: 476, y: 472 } },
  { id: 5, nome: { x: 82, y: 749.5 }, ajudante: { x: 152, y: 642 }, data: { x: 72, y: 703.5 }, numeroParte: { x: 150, y: 680 }, salaoPrincipal: { x: 178, y: 839 }, salaB: { x: 178, y: 866 }, salaC: { x: 178, y: 893 } },
];

function Overlay({ x, y, w, value, align = 'left', fontSize = 11 }: { x: number; y: number; w: number; value: string; align?: 'left' | 'right' | 'center'; fontSize?: number }) {
  const scale = 794 / 595;
  const left = x * scale;
  const top = (842 - y - 12 + 1.5) * scale;
  const width = w * scale;

  const clean = (value && value !== 'null' && value !== 'undefined') ? value : '';
  if (!clean) return null;

  return (
    <div style={{
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
      textAlign: align,
      fontSize: `${fontSize * scale}px`,
      fontWeight: 'bold',
      color: '#111827',
      paddingLeft: '2px',
      paddingRight: '2px',
      lineHeight: 1.1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      {clean}
    </div>
  );
}

function SchoolPage({ pageCards, pageIndex }: { pageCards: CardData[]; pageIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ url: '/designacao-escola.pdf' });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const scale = 2;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvas, canvasContext: context, viewport }).promise;

        if (active) setIsLoaded(true);
      } catch (error) {
        console.error("Error loading school PDF:", error);
      }
    }
    loadPdf();
    return () => { active = false; };
  }, []);

  return (
    <div data-school-page style={{ position: 'relative', width: '794px', height: '1123px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
          <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
        </div>
      )}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '794px', height: '1123px', zIndex: 0, pointerEvents: 'none' }} />

      {isLoaded && (
        <div data-school-overlays style={{ position: 'absolute', top: 0, left: 0, width: '794px', height: '1123px', zIndex: 10, pointerEvents: 'none' }}>
          {pageCards.map((card, i) => {
            const pos = cards[pageIndex * 4 + i];
            if (!pos) return null;
            return (
              <React.Fragment key={i}>
                <Overlay x={pos.nome.x} y={pos.nome.y} w={180} value={card.nome} />
                <Overlay x={pos.ajudante.x} y={pos.ajudante.y} w={180} value={card.ajudante} />
                <Overlay x={pos.data.x} y={pos.data.y} w={180} value={card.data} />
                <Overlay x={pos.numeroParte.x} y={pos.numeroParte.y} w={180} value={card.numeroParte} />
                <Overlay x={pos.salaoPrincipal.x} y={pos.salaoPrincipal.y} w={180} value={card.salaoPrincipal} />
                <Overlay x={pos.salaB.x} y={pos.salaB.y} w={180} value={card.salaB} />
                <Overlay x={pos.salaC.x} y={pos.salaC.y} w={180} value={card.salaC} />
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SchoolPrintLayout({ cards: cardsData }: Props) {
  const pages: CardData[][] = [];
  for (let i = 0; i < cardsData.length; i += 4) {
    pages.push(cardsData.slice(i, i + 4));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {pages.map((pageCards, idx) => (
        <SchoolPage key={idx} pageCards={pageCards} pageIndex={idx} />
      ))}
    </div>
  );
}
