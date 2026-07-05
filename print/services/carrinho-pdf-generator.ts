import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface DayRow {
  date: string;
  diaSemana: string;
  manha: { designado1: string; designado2: string };
  tarde: { designado1: string; designado2: string };
  noite: { designado1: string; designado2: string };
}

interface CarrinhoPrintData {
  month: string;
  carrinhoMacaco: DayRow[];
  carrinhoRetao: DayRow[];
  orientacoes?: string;
}

const formatValue = (value: string): string => {
  if (!value || value.trim() === '') return '';
  return value;
};

const drawTable = (
  page: ReturnType<PDFDocument['addPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  boldFont: Awaited<ReturnType<PDFDocument['embedFont']>>,
  rows: DayRow[],
  startY: number,
  maxRows: number,
  labels: string[] = ['12:00-14:00', '14:00-16:00', '16:00-18:00']
): { endY: number; remaining: DayRow[] } => {
  const leftMargin = 23;
  const colDia = 35;
  const colData = 35;
  const colHorario = 160;
  const rowHeight = 22;
  const headerHeight = 22;

  const tableWidth = colDia + colData + colHorario * 3;

  let currentY = startY;

  const drawVerticalLines = (topY: number, bottomY: number) => {
    const lineColor = rgb(0.7, 0.72, 0.78);
    const lineWidth = 0.5;
    const xPositions = [
      leftMargin + colDia,
      leftMargin + colDia + colData,
      leftMargin + colDia + colData + colHorario,
      leftMargin + colDia + colData + colHorario * 2,
      leftMargin + colDia + colData + colHorario * 3,
    ];
    xPositions.forEach(x => {
      page.drawLine({
        start: { x, y: bottomY },
        end: { x, y: topY },
        thickness: lineWidth,
        color: lineColor,
      });
    });
  };

  const headerTop = currentY + 18;
  page.drawRectangle({
    x: leftMargin,
    y: currentY - 2,
    width: tableWidth,
    height: headerHeight,
    color: rgb(0.88, 0.92, 0.98),
    borderColor: rgb(0.2, 0.3, 0.5),
    borderWidth: 0.5,
  });

  page.drawText('Dia', { x: leftMargin + 4, y: currentY + 4, size: 10, font: boldFont, color: rgb(0.1, 0.15, 0.4) });
  page.drawText('Data', { x: leftMargin + colDia + 4, y: currentY + 4, size: 10, font: boldFont, color: rgb(0.1, 0.15, 0.4) });

  let hx = leftMargin + colDia + colData;
  labels.forEach(label => {
    page.drawText(label, { x: hx + 2, y: currentY + 4, size: 10, font: boldFont, color: rgb(0.1, 0.15, 0.4) });
    hx += colHorario;
  });

  const headerBottomY = currentY - 2;
  drawVerticalLines(headerTop, headerBottomY);

  currentY -= headerHeight;

  const visibleRows = rows.slice(0, maxRows);
  const remaining = rows.slice(maxRows);

  visibleRows.forEach((row, index) => {
    const bgColor = index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.96, 0.97, 1);
    page.drawRectangle({
      x: leftMargin,
      y: currentY - 2,
      width: tableWidth,
      height: rowHeight,
      color: bgColor,
      borderColor: rgb(0.85, 0.88, 0.95),
      borderWidth: 0.3,
    });

    const cellTop = currentY + 18;
    const cellBottom = currentY - 2;
    drawVerticalLines(cellTop, cellBottom);

    const diaAbrev = row.diaSemana.substring(0, 3) + '.';
    page.drawText(diaAbrev, { x: leftMargin + 4, y: currentY + 5, size: 10, font, color: rgb(0.1, 0.1, 0.1) });

    let cx = leftMargin + colDia;
    page.drawText(formatValue(row.date), { x: cx + 4, y: currentY + 5, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    cx += colData;

    [row.manha, row.tarde, row.noite].forEach(horario => {
      const d1 = formatValue(horario.designado1);
      const d2 = formatValue(horario.designado2);
      const text = d1 && d2 ? `${d1} -/- ${d2}` : (d1 || d2);
      page.drawText(text, { x: cx + 4, y: currentY + 6, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
      cx += colHorario;
    });

    currentY -= rowHeight;
  });

  return { endY: currentY, remaining };
};

export async function generateCarrinhoPDF(data: CarrinhoPrintData): Promise<Uint8Array> {
  const templateBytes = await fetch('/carrinho.pdf').then(res => res.arrayBuffer());
  const templatePdf = await PDFDocument.load(templateBytes);
  const [templatePage] = templatePdf.getPages();
  const { width, height } = templatePage.getSize();

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const maxRowsPerPage = Math.floor((height - 300) / 22);

  const rowsByCart = [
    { title: 'Carrinho Macaco', rows: data.carrinhoMacaco, labels: ['12:00-14:00', '14:00-16:00', '16:00-18:00'] },
    { title: 'Carrinho Retão', rows: data.carrinhoRetao, labels: ['12:00-14:00', '14:00-16:00', '16:00-18:00'] },
  ];

  for (const cart of rowsByCart) {
    let remaining = cart.rows;

    while (remaining.length > 0) {
      const page = pdfDoc.addPage([width, height]);

      // Draw template background
      const [bg] = await pdfDoc.embedPdf(templateBytes, [0]);
      page.drawPage(bg);

      page.drawText(cart.title, {
        x: 35,
        y: height - 91,
        size: 14,
        font: boldFont,
        color: rgb(0.12, 0.23, 0.55),
      });

      page.drawText(`Mês: ${data.month}`, {
        x: 35,
        y: height - 111,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });

      const result = drawTable(page, font, boldFont, remaining, height - 151, maxRowsPerPage, cart.labels);
      remaining = result.remaining;

      if (remaining.length > 0) {
        page.drawText('Continua na próxima página...', {
          x: 35,
          y: result.endY - 10,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      if (remaining.length === 0 && data.orientacoes) {
        let oy = result.endY - 5;
        page.drawText('Orientações', {
          x: 30, y: oy + 5, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.55),
        });
        const boxH = 100;
        page.drawRectangle({
          x: 30, y: oy - boxH, width: 540, height: boxH,
          color: rgb(1, 1, 1), borderColor: rgb(0.2, 0.3, 0.5), borderWidth: 1,
        });
        const maxChars = 50;
        let text = data.orientacoes;
        let ty = oy - 20;
        while (text.length > 0 && ty > oy - boxH + 10) {
          page.drawText(text.substring(0, maxChars), { x: 40, y: ty, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
          text = text.substring(maxChars);
          ty -= 22;
        }
      }
    }
  }

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
