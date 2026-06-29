import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ScheduleRow {
  day?: string;
  date?: string;
  time: string;
  location: string;
  leader: string;
}

export interface ServicePrintData {
  month: string;
  weekSchedule: ScheduleRow[];
  saturdaySchedule: ScheduleRow[];
  sundayLontras: ScheduleRow[];
  sundayPraia: ScheduleRow[];
}

const formatValue = (value: string): string => {
  if (!value || value.trim() === '') return '';
  return value;
};

const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

const drawTable = (
  page: ReturnType<PDFDocument['addPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  boldFont: Awaited<ReturnType<PDFDocument['embedFont']>>,
  title: string,
  rows: ScheduleRow[],
  startY: number,
  useDay: boolean
): number => {
  const leftMargin = 50;
  const tableWidth = 495;
  const colDayWidth = 80;
  const colTimeWidth = 70;
  const colLocationWidth = 170;
  const colLeaderWidth = 175;
  const rowHeight = 22;
  const headerHeight = 24;

  // Section title
  page.drawText(title, {
    x: leftMargin,
    y: startY,
    size: 12,
    font: boldFont,
    color: rgb(0.12, 0.23, 0.55),
  });

  let currentY = startY - headerHeight - 4;

  // Table header background
  page.drawRectangle({
    x: leftMargin,
    y: currentY - 2,
    width: tableWidth,
    height: headerHeight,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.12, 0.23, 0.55),
    borderWidth: 1,
  });

  // Header text
  page.drawText(useDay ? 'Dia' : 'Data', {
    x: leftMargin + 6,
    y: currentY + 5,
    size: 10,
    font: boldFont,
    color: rgb(0.12, 0.23, 0.55),
  });
  page.drawText('Horário', {
    x: leftMargin + colDayWidth + 6,
    y: currentY + 5,
    size: 10,
    font: boldFont,
    color: rgb(0.12, 0.23, 0.55),
  });
  page.drawText('Local Saída', {
    x: leftMargin + colDayWidth + colTimeWidth + 6,
    y: currentY + 5,
    size: 10,
    font: boldFont,
    color: rgb(0.12, 0.23, 0.55),
  });
  page.drawText('Dirigente', {
    x: leftMargin + colDayWidth + colTimeWidth + colLocationWidth + 6,
    y: currentY + 5,
    size: 10,
    font: boldFont,
    color: rgb(0.12, 0.23, 0.55),
  });

  currentY -= headerHeight;

  // Rows
  rows.forEach((row, index) => {
    const bgColor = index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 1);

    page.drawRectangle({
      x: leftMargin,
      y: currentY - 2,
      width: tableWidth,
      height: rowHeight,
      color: bgColor,
      borderColor: rgb(0.85, 0.88, 0.95),
      borderWidth: 0.5,
    });

    page.drawText(formatValue(useDay ? (row.day || '') : (row.date || '')), {
      x: leftMargin + 6,
      y: currentY + 5,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(formatValue(row.time), {
      x: leftMargin + colDayWidth + 6,
      y: currentY + 5,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(formatValue(row.location), {
      x: leftMargin + colDayWidth + colTimeWidth + 6,
      y: currentY + 5,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(formatValue(row.leader), {
      x: leftMargin + colDayWidth + colTimeWidth + colLocationWidth + 6,
      y: currentY + 5,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= rowHeight;
  });

  return currentY;
};

export async function generateServicePDF(data: ServicePrintData): Promise<Uint8Array> {
  const templateBytes = await fetch('/campo-semana.pdf').then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let currentY = 720;

  // Week
  const weekRows = weekDays.map((day, i) => data.weekSchedule[i] || { day, time: '', location: '', leader: '' });
  currentY = drawTable(page, font, boldFont, 'DESIGNAÇÃO SEMANA', weekRows, currentY, true);
  currentY -= 20;

  // Saturday
  currentY = drawTable(page, font, boldFont, 'DESIGNAÇÃO SÁBADO', data.saturdaySchedule, currentY, false);
  currentY -= 20;

  // Sunday Lontras
  currentY = drawTable(page, font, boldFont, 'DESIGNAÇÃO DOMINGO > Lontras - Macaco', data.sundayLontras, currentY, false);
  currentY -= 20;

  // Sunday Praia
  currentY = drawTable(page, font, boldFont, 'DESIGNAÇÃO DOMINGO > Praia - Raposa', data.sundayPraia, currentY, false);

  return pdfDoc.save();
}

export function openPDFForPrint(bytes: Uint8Array) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    });
  }
}

export function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
