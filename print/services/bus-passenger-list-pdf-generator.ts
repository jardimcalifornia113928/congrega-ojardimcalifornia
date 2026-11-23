import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

export interface BusPassengerRow {
  name: string;
  phone?: string;
  groupName?: string;
}

/** Cada dia do evento gera uma lista (página) própria. */
export interface BusPassengerListSheet {
  label: string;
  date: string;
}

export interface BusPassengerListData {
  congregationName: string;
  congregationAddress?: string;
  congregationNumber?: string;
  arrangementTitle: string;
  /** Usado só se a chamada não informar sheets (arranjos antigos). */
  arrangementDate?: string;
  sheets: BusPassengerListSheet[];
  generatedAt: string;
  passengers: BusPassengerRow[];
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;

const INK = rgb(0.07, 0.1, 0.16);
const MUTED = rgb(0.42, 0.47, 0.55);
const ACCENT = rgb(0.04, 0.45, 0.76);
const ACCENT_SOFT = rgb(0.93, 0.96, 1);
const LINE = rgb(0.85, 0.88, 0.92);
const BOX = rgb(0.55, 0.61, 0.68);

/** pdf-lib com fonte padrão só aceita Latin-1 */
const sanitize = (value: string | undefined): string =>
  (value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\xFF]/g, '');

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const clip = (text: string | undefined, font: PDFFont, size: number, maxWidth: number): string => {
  let value = sanitize(text);
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}...`, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value.trimEnd()}...`;
};

const COLS = {
  name: { x: MARGIN, width: 235 },
  phone: { x: 275, width: 110 },
  group: { x: 390, width: 95 },
  ida: { x: 492, width: 30 },
  volta: { x: 532, width: 30 },
};

const drawHeader = (
  page: PDFPage,
  data: BusPassengerListData,
  sheet: BusPassengerListSheet,
  regular: PDFFont,
  bold: PDFFont,
): number => {
  let y = PAGE_H - MARGIN;

  page.drawText(sanitize(data.congregationName || 'Congregação'), {
    x: MARGIN,
    y,
    size: 13,
    font: bold,
    color: INK,
  });

  const info = [
    data.congregationNumber ? `Nº ${data.congregationNumber}` : '',
    data.congregationAddress || '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (info) {
    page.drawText(sanitize(info), { x: MARGIN, y: y - 13, size: 8, font: regular, color: MUTED });
  }

  page.drawLine({
    start: { x: MARGIN, y: y - 22 },
    end: { x: PAGE_W - MARGIN, y: y - 22 },
    thickness: 1,
    color: ACCENT,
  });

  y -= 44;
  page.drawText('LISTA DE PASSAGEIROS', { x: MARGIN, y, size: 17, font: bold, color: INK });
  page.drawText(
    sanitize(`Arranjo de Ônibus - ${data.arrangementTitle} · ${sheet.label} (${sheet.date})`),
    { x: MARGIN, y: y - 15, size: 9.5, font: regular, color: MUTED },
  );
  page.drawText('Conferência do capitão: marque a ida e a volta de cada passageiro.', {
    x: MARGIN,
    y: y - 29,
    size: 8.5,
    font: regular,
    color: ACCENT,
  });

  y -= 50;

  // Cabeçalho da tabela
  page.drawRectangle({
    x: MARGIN,
    y: y - 6,
    width: PAGE_W - MARGIN * 2,
    height: 22,
    color: ACCENT_SOFT,
  });
  const headers: [number, string][] = [
    [COLS.name.x, 'NOME'],
    [COLS.phone.x, 'TELEFONE'],
    [COLS.group.x, 'GRUPO'],
    [COLS.ida.x, 'IDA'],
    [COLS.volta.x, 'VOLTA'],
  ];
  headers.forEach(([x, label]) => {
    page.drawText(label, { x, y: y + 1, size: 7.5, font: bold, color: MUTED });
  });

  return y - 22;
};

const drawFooter = (page: PDFPage, data: BusPassengerListData, regular: PDFFont, bold: PDFFont) => {
  page.drawLine({
    start: { x: MARGIN, y: 62 },
    end: { x: PAGE_W - MARGIN, y: 62 },
    thickness: 0.8,
    color: LINE,
  });
  page.drawText(`${data.passengers.length} passageiro(s) - somente quem já pagou`, {
    x: MARGIN,
    y: 44,
    size: 9,
    font: bold,
    color: ACCENT,
  });
  page.drawText(sanitize(`Emitido em ${formatDateTime(data.generatedAt)}`), {
    x: MARGIN,
    y: 30,
    size: 8,
    font: regular,
    color: MUTED,
  });
};

const drawCheckbox = (page: PDFPage, x: number, y: number) => {
  page.drawRectangle({
    x,
    y,
    width: 11,
    height: 11,
    borderColor: BOX,
    borderWidth: 0.9,
    color: rgb(1, 1, 1),
  });
};

export async function generateBusPassengerListPDF(data: BusPassengerListData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const sheets = data.sheets?.length
    ? data.sheets
    : [{ label: data.arrangementTitle, date: data.arrangementDate || '' }];
  const rowHeight = 25;
  const minY = 88;

  sheets.forEach((sheet) => {
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = drawHeader(page, data, sheet, regular, bold);
    let rowIndex = 0;
    drawFooter(page, data, regular, bold);

    data.passengers.forEach((passenger) => {
      if (y < minY) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = drawHeader(page, data, sheet, regular, bold);
        drawFooter(page, data, regular, bold);
        rowIndex = 0;
      }

      if (rowIndex % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: y - 18,
          width: PAGE_W - MARGIN * 2,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.99),
        });
      }

      const baseY = y - 8;
      page.drawText(clip(passenger.name, regular, 10, COLS.name.width - 6), {
        x: COLS.name.x,
        y: baseY,
        size: 10,
        font: regular,
        color: INK,
      });
      page.drawText(clip(passenger.phone, regular, 9.5, COLS.phone.width - 6), {
        x: COLS.phone.x,
        y: baseY,
        size: 9.5,
        font: regular,
        color: MUTED,
      });
      page.drawText(clip(passenger.groupName, regular, 9.5, COLS.group.width - 6), {
        x: COLS.group.x,
        y: baseY,
        size: 9.5,
        font: regular,
        color: MUTED,
      });
      drawCheckbox(page, COLS.ida.x + 4, baseY - 2);
      drawCheckbox(page, COLS.volta.x + 4, baseY - 2);

      page.drawLine({
        start: { x: MARGIN, y: y - 19 },
        end: { x: PAGE_W - MARGIN, y: y - 19 },
        thickness: 0.4,
        color: LINE,
      });

      y -= rowHeight;
      rowIndex += 1;
    });
  });

  return pdfDoc.save();
}

export function busPassengerListFileName(data: BusPassengerListData): string {
  const owner = data.arrangementTitle
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `lista-passageiros-${owner || 'onibus'}.pdf`;
}
