import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import qrcode from 'qrcode-generator';

export type BusReceiptKind = 'PAG' | 'DON' | 'REP' | 'DEP' | 'DEV';

export interface BusReceiptData {
  kind: BusReceiptKind;
  congregationName: string;
  congregationAddress?: string;
  congregationNumber?: string;
  arrangementTitle: string;
  arrangementDate: string;
  receiptNo: string;
  authCode: string;
  issuedAt: string;
  amount: number;
  /** PAG */
  participantName?: string;
  participantPhone?: string;
  receivedByName?: string;
  methodLabel?: string;
  totalPaid?: number;
  balance?: number;
  /** REP */
  fromName?: string;
  toName?: string;
  coveredCount?: number;
  /** DEP */
  depositedByName?: string;
  bankRef?: string;
  hasPhoto?: boolean;
  /** DEV */
  note?: string;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;

const INK = rgb(0.07, 0.1, 0.16);
const MUTED = rgb(0.42, 0.47, 0.55);
const ACCENT = rgb(0.04, 0.45, 0.76);
const ACCENT_SOFT = rgb(0.93, 0.96, 1);
const LINE = rgb(0.85, 0.88, 0.92);

const TITLES: Record<BusReceiptKind, string> = {
  PAG: 'RECIBO DE PAGAMENTO',
  DON: 'RECIBO DE DONATIVO',
  REP: 'RECIBO DE REPASSE',
  DEP: 'COMPROVANTE DE DEPÓSITO',
  DEV: 'COMPROVANTE DE DEVOLUÇÃO',
};

/** pdf-lib com fonte padrão só aceita Latin-1: remove emoji e troca tipografia "inteligente" */
const sanitize = (value: string | undefined): string =>
  (value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\xFF]/g, '');

const formatBRL = (value: number): string =>
  (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

/** QR desenhado vetorial (sem imagem): quadrados pretos do módulo */
const drawQR = (page: PDFPage, content: string, x: number, y: number, size: number) => {
  const qr = qrcode(0, 'M');
  qr.addData(content);
  qr.make();
  const modules = qr.getModuleCount();
  const quiet = 2;
  const cell = size / (modules + quiet * 2);

  page.drawRectangle({
    x,
    y,
    width: size,
    height: size,
    color: rgb(1, 1, 1),
    borderColor: LINE,
    borderWidth: 0.6,
  });

  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (!qr.isDark(row, col)) continue;
      page.drawRectangle({
        x: x + (col + quiet) * cell,
        y: y + size - (row + quiet + 1) * cell,
        width: cell,
        height: cell,
        color: rgb(0, 0, 0),
      });
    }
  }
};

const row = (
  page: PDFPage,
  label: string,
  value: string,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
) => {
  page.drawText(sanitize(label).toUpperCase(), {
    x: MARGIN,
    y,
    size: 7.5,
    font: bold,
    color: MUTED,
  });
  page.drawText(sanitize(value), {
    x: MARGIN + 150,
    y,
    size: 10.5,
    font: regular,
    color: INK,
  });
  page.drawLine({
    start: { x: MARGIN, y: y - 9 },
    end: { x: PAGE_W - MARGIN, y: y - 9 },
    thickness: 0.5,
    color: LINE,
  });
};

export async function generateBusReceiptPDF(data: BusReceiptData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // ===== Cabeçalho =====
  let y = PAGE_H - MARGIN;
  page.drawText(sanitize(data.congregationName || 'Congregação'), {
    x: MARGIN,
    y,
    size: 15,
    font: bold,
    color: INK,
  });

  const headerInfo = [
    data.congregationNumber ? `Nº ${data.congregationNumber}` : '',
    data.congregationAddress || '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  if (headerInfo) {
    page.drawText(sanitize(headerInfo), {
      x: MARGIN,
      y: y - 15,
      size: 8.5,
      font: regular,
      color: MUTED,
    });
  }

  page.drawLine({
    start: { x: MARGIN, y: y - 26 },
    end: { x: PAGE_W - MARGIN, y: y - 26 },
    thickness: 1,
    color: ACCENT,
  });

  // ===== Caixa do número e código =====
  const boxW = 168;
  const boxH = 58;
  const boxX = PAGE_W - MARGIN - boxW;
  const boxY = y - 26 - boxH - 10;

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    color: ACCENT_SOFT,
    borderColor: ACCENT,
    borderWidth: 0.8,
  });
  page.drawText('Nº DO DOCUMENTO', { x: boxX + 10, y: boxY + boxH - 14, size: 6.5, font: bold, color: MUTED });
  page.drawText(sanitize(data.receiptNo), { x: boxX + 10, y: boxY + boxH - 28, size: 12, font: bold, color: INK });
  page.drawText('CÓDIGO DE AUTENTICAÇÃO', { x: boxX + 10, y: boxY + 24, size: 6.5, font: bold, color: MUTED });
  page.drawText(sanitize(data.authCode), { x: boxX + 10, y: boxY + 10, size: 12, font: bold, color: ACCENT });

  // ===== Título =====
  y = boxY - 32;
  page.drawText(TITLES[data.kind], { x: MARGIN, y, size: 17, font: bold, color: INK });
  page.drawText(
    sanitize(`Arranjo de Ônibus - ${data.arrangementTitle} (${data.arrangementDate})`),
    { x: MARGIN, y: y - 16, size: 9.5, font: regular, color: MUTED },
  );

  // ===== Bloco do valor =====
  y = y - 46;
  page.drawRectangle({ x: MARGIN, y: y - 46, width: PAGE_W - MARGIN * 2, height: 62, color: ACCENT_SOFT });
  page.drawText('VALOR', { x: MARGIN + 14, y: y + 4, size: 7.5, font: bold, color: MUTED });
  page.drawText(sanitize(formatBRL(data.amount)), {
    x: MARGIN + 14,
    y: y - 26,
    size: 24,
    font: bold,
    color: ACCENT,
  });

  // ===== Corpo =====
  y = y - 78;

  const paragraph = (() => {
    switch (data.kind) {
      case 'PAG':
        return `Recebemos de ${data.participantName || '-'} a importância de ${formatBRL(
          data.amount,
        )} referente ao arranjo de ônibus ${data.arrangementTitle}.`;
      case 'DON':
        return `Recebemos de ${data.participantName || 'Doador anônimo'} a importância de ${formatBRL(
          data.amount,
        )} a título de donativo para o arranjo de ônibus ${data.arrangementTitle}, sem vínculo com assento ou passageiro.`;
      case 'REP':
        return `Repasse integral dos valores recebidos no arranjo ${data.arrangementTitle}, entregues por ${
          data.fromName || '-'
        } a ${data.toName || '-'}, sem retenção de saldo em mãos.`;
      case 'DEP':
        return `Depósito bancário de ${formatBRL(data.amount)} referente ao arranjo ${
          data.arrangementTitle
        }, efetuado por ${data.depositedByName || '-'}.`;
      case 'DEV':
      default:
        return `Devolução de ${formatBRL(data.amount)} ao participante ${
          data.participantName || '-'
        } referente ao arranjo ${data.arrangementTitle}.`;
    }
  })();

  wrapText(paragraph, regular, 10.5, PAGE_W - MARGIN * 2).forEach((line) => {
    page.drawText(line, { x: MARGIN, y, size: 10.5, font: regular, color: INK });
    y -= 15;
  });

  y -= 18;

  const details: [string, string][] = [];
  if (data.kind === 'PAG') {
    details.push(['Recebido por', data.receivedByName || '-']);
    details.push(['Forma de pagamento', data.methodLabel || '-']);
    details.push(['Total pago até agora', formatBRL(data.totalPaid ?? data.amount)]);
    details.push(['Saldo restante', formatBRL(data.balance ?? 0)]);
    if (data.participantPhone) details.push(['Contato', data.participantPhone]);
  } else if (data.kind === 'DON') {
    details.push(['Recebido por', data.receivedByName || '-']);
    details.push(['Forma de pagamento', data.methodLabel || '-']);
    details.push(['Doador', data.participantName || 'Doador anônimo']);
    details.push(['Observação', data.note || 'Donativo para o custo do ônibus']);
  } else if (data.kind === 'REP') {
    details.push(['Entregue por', data.fromName || '-']);
    details.push(['Recebido por', data.toName || '-']);
    details.push(['Valor repassado', formatBRL(data.amount)]);
    details.push(['Recibos cobertos', String(data.coveredCount ?? 0)]);
    details.push(['Saldo em mãos do entregador', formatBRL(0)]);
  } else if (data.kind === 'DEP') {
    details.push(['Depositado por', data.depositedByName || '-']);
    details.push(['Valor', formatBRL(data.amount)]);
    details.push(['Referência bancária', data.bankRef || '-']);
    details.push(['Comprovante anexado', data.hasPhoto ? 'Sim' : 'Não']);
  } else {
    details.push(['Devolvido a', data.participantName || '-']);
    details.push(['Devolvido por', data.fromName || '-']);
    details.push(['Valor', formatBRL(data.amount)]);
    details.push(['Observação', data.note || '-']);
  }

  details.forEach(([label, value]) => {
    row(page, label, value, y, regular, bold);
    y -= 26;
  });

  // ===== Rodapé: QR + texto de autenticidade =====
  const footerY = 96;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 62 },
    end: { x: PAGE_W - MARGIN, y: footerY + 62 },
    thickness: 0.8,
    color: LINE,
  });

  const qrContent = [
    data.receiptNo,
    data.authCode,
    data.kind,
    formatBRL(data.amount),
    data.arrangementTitle,
    data.arrangementDate,
  ].join(' | ');

  drawQR(page, qrContent, MARGIN, footerY - 20, 84);

  const textX = MARGIN + 100;
  const textWidth = PAGE_W - MARGIN - textX;
  const footerLines = wrapText(
    `Documento gerado eletronicamente em ${formatDateTime(data.issuedAt)}. Autenticidade: confira o código ${data.authCode} no sistema de gestão da congregação. Este documento não exige assinatura.`,
    regular,
    9,
    textWidth,
  );

  let footerTextY = footerY + 34;
  footerLines.forEach((line) => {
    page.drawText(line, { x: textX, y: footerTextY, size: 9, font: regular, color: MUTED });
    footerTextY -= 12;
  });

  page.drawText(sanitize('Escaneie o código ao lado para conferir os dados do recibo.'), {
    x: textX,
    y: footerTextY - 4,
    size: 8,
    font: bold,
    color: ACCENT,
  });

  return pdfDoc.save();
}

export function busReceiptFileName(data: BusReceiptData): string {
  const owner = (data.kind === 'DON' ? 'donativo' : data.participantName || data.toName || 'recibo')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${data.receiptNo}-${owner}.pdf`;
}
