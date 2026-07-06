import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface CleaningPrintData {
  month: string;
  year: number;
  midweekDates: number[];
  weekendDates: number[];
  cleaning: Record<string, string>;
  groups: string[];
}

export async function generateCleaningPDF(data: CleaningPrintData): Promise<Uint8Array> {
  const templateBytes = await fetch('/limpeza.pdf').then(res => res.arrayBuffer());
  const templatePdf = await PDFDocument.load(templateBytes);
  const [templatePage] = templatePdf.getPages();
  const { width, height } = templatePage.getSize();

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([width, height]);
  const [bg] = await pdfDoc.embedPdf(templateBytes, [0]);
  page.drawPage(bg);

  page.drawText(`${data.month.charAt(0).toUpperCase() + data.month.slice(1)} ${data.year}`, {
    x: 45, y: height - 91, size: 14, font: boldFont, color: rgb(0.12, 0.23, 0.55),
  });

  const drawSection = (title: string, dates: number[], prefix: string, startY: number) => {
    let y = startY;
    page.drawText(title, { x: 45, y, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.55) });
    y -= 22;
    const cols = dates.length;
    const colW = Math.min(90, (width - 130) / cols);
    dates.forEach((day, i) => {
      page.drawText(`Dia ${day}`, { x: 110 + i * colW, y, size: 11, font: boldFont, color: rgb(0.12, 0.23, 0.55) });
    });
    y -= 22;
    page.drawText('Grupo', { x: 45, y, size: 12, font, color: rgb(0.1, 0.1, 0.1) });
    dates.forEach((_, i) => {
      const val = data.cleaning[`${prefix}_${i}`] || '';
      page.drawText(val || '—', { x: 110 + i * colW, y, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
    });
  };

  drawSection('Meio de Semana', data.midweekDates, 'mw', height - 150);
  drawSection('Fim de Semana', data.weekendDates, 'we', height - 230);

  return pdfDoc.save();
}

export function openPDFForPrint(bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => printWindow.print(), 500);
    });
  }
}

export function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
