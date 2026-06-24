'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PublisherData {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  baptismDate: string;
  gender: string;
  tags: string[];
  responsibility: string;
  pioneerType: string;
}

interface S21MonthEntry {
  participou: boolean;
  estudos: string;
  auxiliar: boolean;
  horas: string;
  observacao: string;
}

interface Props {
  publisher: PublisherData;
  s21Data: Record<string, S21MonthEntry>;
  serviceYear: string;
}

const MONTH_KEYS = [
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
];

const MONTH_FIELDS: Record<string, { participou: { x: number; y: number }; estudos: { x: number; y: number }; auxiliar: { x: number; y: number }; horas: { x: number; y: number }; observacao: { x: number; y: number } }> = {
  Setembro: {
    participou: { x: 130.26, y: 203.56 },
    estudos: { x: 173.48, y: 201.37 },
    auxiliar: { x: 271.37, y: 203.56 },
    horas: { x: 314.79, y: 201.37 },
    observacao: { x: 385.1, y: 201.37 },
  },
  Outubro: {
    participou: { x: 130.26, y: 223.28 },
    estudos: { x: 173.48, y: 221.29 },
    auxiliar: { x: 271.37, y: 223.28 },
    horas: { x: 314.79, y: 221.29 },
    observacao: { x: 385.1, y: 221.29 },
  },
  Novembro: {
    participou: { x: 130.26, y: 243.1 },
    estudos: { x: 173.48, y: 241.1 },
    auxiliar: { x: 271.37, y: 243.1 },
    horas: { x: 314.79, y: 241.1 },
    observacao: { x: 385.1, y: 241.1 },
  },
  Dezembro: {
    participou: { x: 130.26, y: 262.81 },
    estudos: { x: 173.48, y: 260.92 },
    auxiliar: { x: 271.37, y: 262.81 },
    horas: { x: 314.79, y: 260.92 },
    observacao: { x: 385.1, y: 260.92 },
  },
  Janeiro: {
    participou: { x: 130.26, y: 282.63 },
    estudos: { x: 173.48, y: 280.74 },
    auxiliar: { x: 271.37, y: 282.63 },
    horas: { x: 314.79, y: 280.74 },
    observacao: { x: 385.1, y: 280.74 },
  },
  Fevereiro: {
    participou: { x: 130.26, y: 302.45 },
    estudos: { x: 173.48, y: 300.66 },
    auxiliar: { x: 271.37, y: 302.45 },
    horas: { x: 314.79, y: 300.66 },
    observacao: { x: 385.1, y: 300.66 },
  },
  Março: {
    participou: { x: 130.26, y: 322.46 },
    estudos: { x: 173.48, y: 320.47 },
    auxiliar: { x: 271.37, y: 322.46 },
    horas: { x: 314.79, y: 320.47 },
    observacao: { x: 385.1, y: 320.47 },
  },
  Abril: {
    participou: { x: 130.26, y: 342.18 },
    estudos: { x: 173.48, y: 340.29 },
    auxiliar: { x: 271.37, y: 342.18 },
    horas: { x: 314.79, y: 340.29 },
    observacao: { x: 385.1, y: 340.29 },
  },
  Maio: {
    participou: { x: 130.26, y: 362.0 },
    estudos: { x: 173.48, y: 360.11 },
    auxiliar: { x: 271.37, y: 362.0 },
    horas: { x: 314.79, y: 360.11 },
    observacao: { x: 385.1, y: 360.11 },
  },
  Junho: {
    participou: { x: 130.26, y: 381.82 },
    estudos: { x: 173.48, y: 380.02 },
    auxiliar: { x: 271.37, y: 381.82 },
    horas: { x: 314.79, y: 380.02 },
    observacao: { x: 385.1, y: 380.02 },
  },
  Julho: {
    participou: { x: 130.26, y: 401.63 },
    estudos: { x: 173.48, y: 399.84 },
    auxiliar: { x: 271.37, y: 401.63 },
    horas: { x: 314.79, y: 399.84 },
    observacao: { x: 385.1, y: 399.84 },
  },
  Agosto: {
    participou: { x: 130.26, y: 421.55 },
    estudos: { x: 173.48, y: 419.66 },
    auxiliar: { x: 271.37, y: 421.55 },
    horas: { x: 314.79, y: 419.66 },
    observacao: { x: 385.1, y: 419.66 },
  },
};

const HEADER_FIELDS = {
  nome: { x: 51.49, y: 64.04, width: 526.8, fontSize: 11 },
  dataNascimento: { x: 126.67, y: 80.47, width: 243.78, fontSize: 9 },
  sexoMasculino: { x: 384.1, y: 84.85, size: 10.36 },
  sexoFeminino: { x: 485.58, y: 84.85, size: 10.36 },
  dataBatismo: { x: 108.55, y: 96.41, width: 261.91, fontSize: 9 },
  outrasOvelhas: { x: 384.1, y: 101.19, size: 10.36 },
  ungido: { x: 485.58, y: 101.19, size: 10.36 },
  anciao: { x: 16.83, y: 117.32, size: 10.36 },
  servoMinisterial: { x: 83.35, y: 117.32, size: 10.36 },
  pioneiroRegular: { x: 210.32, y: 117.32, size: 10.36 },
  pioneiroEspecial: { x: 330.52, y: 117.32, size: 10.36 },
  missionario: { x: 454.7, y: 117.32, size: 10.36 },
  anoServico: { x: 19.32, y: 174.58, width: 81.06, fontSize: 9 },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
}

function getHeaderValue(publisher: PublisherData, key: string): string {
  switch (key) {
    case 'nome':
      return [publisher.firstName, publisher.middleName, publisher.lastName].filter(Boolean).join(' ');
    case 'dataNascimento':
      return formatDate(publisher.birthDate);
    case 'dataBatismo':
      return formatDate(publisher.baptismDate);
    default:
      return '';
  }
}

function isHeaderCheckboxChecked(publisher: PublisherData, key: string): boolean {
  switch (key) {
    case 'sexoMasculino': return publisher.gender === 'masculino';
    case 'sexoFeminino': return publisher.gender === 'feminino';
    case 'outrasOvelhas': return publisher.tags.includes('Outras Ovelhas');
    case 'ungido': return publisher.tags.includes('Ungido');
    case 'anciao': return publisher.responsibility === 'anciao';
    case 'servoMinisterial': return publisher.responsibility === 'servo';
    case 'pioneiroRegular': return publisher.pioneerType === 'regular';
    case 'pioneiroEspecial': return publisher.pioneerType === 'especial';
    case 'missionario': return false;
    default: return false;
  }
}

export function S21PrintLayout({ publisher, s21Data, serviceYear }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const pdfPageW = 595.2;
  const pdfPageH = 841.9;

  useEffect(() => {
    let active = true;
    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;
        const loadingTask = pdfjsLib.getDocument({ url: '/s-21.pdf' });
        const pdf = await loadingTask.promise;
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
        console.error("Error loading S-21 PDF:", error);
      }
    }
    loadPdf();
    return () => { active = false; };
  }, []);

  const dx = 2;
  const dy = 2.5;
  const cssW = 794;
  const cssH = Math.round(cssW * (pdfPageH / pdfPageW));
  const scale = cssW / pdfPageW;

  const totalHoras = Object.values(s21Data).reduce((sum, e) => sum + (parseInt(e.horas, 10) || 0), 0);
  const totalObs = Object.values(s21Data).map(e => e.observacao).filter(Boolean).join('; ');

  return (
    <div ref={containerRef} data-s21-page style={{ position: 'relative', width: `${cssW}px`, height: `${cssH}px`, backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
          <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
        </div>
      )}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: `${cssW}px`, height: `${cssH}px`, zIndex: 0, pointerEvents: 'none' }} />

      {isLoaded && (
        <div data-s21-overlays style={{ position: 'absolute', top: 0, left: 0, width: `${cssW}px`, height: `${cssH}px`, zIndex: 10, pointerEvents: 'none' }}>
          {/* Red A debug marker at nome position */}
          <div style={{ position: 'absolute', left: `${(51.49 + dx) * scale}px`, top: `${(64.04 + dy) * scale}px`, fontSize: `${10 * scale}px`, fontWeight: 'bold', color: 'red', fontFamily: 'Arial, sans-serif' }}>A</div>

          {/* Header fields */}
          {Object.entries(HEADER_FIELDS).map(([key, f]) => {
            if ('size' in f) {
              const checked = isHeaderCheckboxChecked(publisher, key);
              if (!checked) return null;
              return (
                <div key={key} style={{
                  position: 'absolute',
                  left: `${(f.x + dx + 1) * scale}px`,
                  top: `${(f.y + dy) * scale}px`,
                  fontSize: `${9 * scale}px`,
                  fontWeight: 'bold',
                  color: '#111827',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  lineHeight: 1,
                }}>X</div>
              );
            }
            if (key === 'anoServico') {
              return (
                <div key={key} style={{
                  position: 'absolute',
                  left: `${(f.x + dx) * scale}px`,
                  top: `${(f.y + dy + 2) * scale}px`,
                  fontSize: `${9 * scale}px`,
                  fontWeight: 'bold',
                  color: '#111827',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}>
                  {serviceYear}
                </div>
              );
            }
            const value = getHeaderValue(publisher, key);
            if (!value) return null;
            return (
              <div key={key} style={{
                position: 'absolute',
                left: `${(f.x + dx) * scale}px`,
                top: `${(f.y + dy + 2) * scale}px`,
                fontSize: `${(f.fontSize || 9) * scale}px`,
                fontWeight: 'bold',
                color: '#111827',
                fontFamily: 'Arial, Helvetica, sans-serif',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {value}
              </div>
            );
          })}

          {/* Monthly lines */}
          {MONTH_KEYS.map((monthName) => {
            const mf = MONTH_FIELDS[monthName];
            if (!mf) return null;
            const monthIdx = MONTH_KEYS.indexOf(monthName);
            const docMonth = monthIdx + 8 >= 12 ? monthIdx + 8 - 12 : monthIdx + 8;
            const docYear = monthIdx + 8 >= 12 ? (parseInt(serviceYear.split('/')[0]) + 1) : parseInt(serviceYear.split('/')[0]);
            const docId = `${docYear}-${String(docMonth + 1).padStart(2, '0')}`;
            const entry = s21Data[docId];

            return (
              <React.Fragment key={monthName}>
                {/* participou checkbox */}
                {entry?.participou && (
                  <div style={{
                    position: 'absolute',
                    left: `${(mf.participou.x + dx + 1.5) * scale}px`,
                    top: `${(mf.participou.y + dy + 0.5) * scale}px`,
                    fontSize: `${9 * scale}px`,
                    fontWeight: 'bold',
                    color: '#111827',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    lineHeight: 1,
                  }}>X</div>
                )}
                {/* estudos */}
                {entry?.estudos && (
                  <div style={{
                    position: 'absolute',
                    left: `${(mf.estudos.x + dx) * scale}px`,
                    top: `${(mf.estudos.y + dy + 2) * scale}px`,
                    fontSize: `${9 * scale}px`,
                    fontWeight: 'bold',
                    color: '#111827',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    lineHeight: 1.2,
                  }}>
                    {entry.estudos}
                  </div>
                )}
                {/* auxiliar checkbox */}
                {entry?.auxiliar && (
                  <div style={{
                    position: 'absolute',
                    left: `${(mf.auxiliar.x + dx + 1.5) * scale}px`,
                    top: `${(mf.auxiliar.y + dy + 0.5) * scale}px`,
                    fontSize: `${9 * scale}px`,
                    fontWeight: 'bold',
                    color: '#111827',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    lineHeight: 1,
                  }}>X</div>
                )}
                {/* horas */}
                {entry?.horas && (
                  <div style={{
                    position: 'absolute',
                    left: `${(mf.horas.x + dx) * scale}px`,
                    top: `${(mf.horas.y + dy + 2) * scale}px`,
                    fontSize: `${9 * scale}px`,
                    fontWeight: 'bold',
                    color: '#111827',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    lineHeight: 1.2,
                  }}>
                    {entry.horas}
                  </div>
                )}
                {/* observacao */}
                {entry?.observacao && (
                  <div style={{
                    position: 'absolute',
                    left: `${(mf.observacao.x + dx) * scale}px`,
                    top: `${(mf.observacao.y + dy + 2) * scale}px`,
                    fontSize: `${8 * scale}px`,
                    fontWeight: 'bold',
                    color: '#111827',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {entry.observacao}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Total row */}
          {totalHoras > 0 && (
            <div style={{
              position: 'absolute',
              left: `${(314.79 + dx) * scale}px`,
              top: `${(439.78 + dy + 2) * scale}px`,
              fontSize: `${9 * scale}px`,
              fontWeight: 'bold',
              color: '#111827',
              fontFamily: 'Arial, Helvetica, sans-serif',
              lineHeight: 1.2,
            }}>
              {String(totalHoras)}
            </div>
          )}
          {totalObs && (
            <div style={{
              position: 'absolute',
              left: `${(385.1 + dx) * scale}px`,
              top: `${(439.78 + dy + 2) * scale}px`,
              fontSize: `${8 * scale}px`,
              fontWeight: 'bold',
              color: '#111827',
              fontFamily: 'Arial, Helvetica, sans-serif',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {totalObs}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
