/**
 * Gerador de PDF - Layout padrão "Nossa Vida e Ministério Cristão"
 * Replica exatamente o visual do arquivo impressão/layout-meio-fim-semana.jpg
 */

export interface MidweekPdfData {
  weekRange: string;
  president: string;
  openingPrayer: string;
  closingPrayer: string;
  talkSpeaker: string;
  talkTheme: string;
  gemsSpeaker: string;
  bibleReadingReader: string;
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
  cbsConductor: string;
  cbsReader: string;
  mechanicalIndicador1: string;
  mechanicalIndicador2: string;
  mechanicalMicrofone1: string;
  mechanicalMicrofone2: string;
  mechanicalPalco: string;
  mechanicalAudioVideo: string;
  songOpening?: string;
  songMiddle?: string;
  songClosing?: string;
}

export interface WeekendPdfData {
  president: string;
  openingPrayer: string;
  closingPrayer: string;
  localSpeaker: string;
  visitingSpeaker: string;
  talkTheme: string;
  watchtowerConductor: string;
  watchtowerReader: string;
  mechanicalIndicador1: string;
  mechanicalIndicador2: string;
  mechanicalMicrofone1: string;
  mechanicalMicrofone2: string;
  mechanicalPalco: string;
  mechanicalAudioVideo: string;
}

const CONGREGATION = 'CONGREGAÇÃO JARDIM CALIFÓRNIA - 113928';

function val(v?: string): string {
  return (v && v.trim()) ? v.trim() : '';
}

export async function generateMeetingPdf(
  midweek: MidweekPdfData,
  weekend: WeekendPdfData
) {
  const jsPDF = (await import('jspdf')).default;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;         // A4 width mm
  const mL = 8;          // margin left
  const mR = 8;          // margin right
  const cW = W - mL - mR; // content width

  // ── Colors ──────────────────────────────────────────────────────────────
  const BLACK    : [number,number,number] = [0,   0,   0];
  const DARK     : [number,number,number] = [30,  30,  30];
  const GRAY_400 : [number,number,number] = [120, 120, 120];
  const WHITE    : [number,number,number] = [255, 255, 255];
  const AMBER    : [number,number,number] = [180, 120,  10]; // Tesouros
  const ORANGE   : [number,number,number] = [200,  90,  10]; // Ministério
  const ROSE     : [number,number,number] = [180,  30,  50]; // Vida cristã
  const TEAL     : [number,number,number] = [0,   110,  90]; // Fim de semana
  const MECH_BG  : [number,number,number] = [230, 230, 230];

  // ── Helpers ──────────────────────────────────────────────────────────────
  let y = 0;

  const setFont = (style: 'normal'|'bold', size: number, color: [number,number,number] = [30,30,30]) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  };

  const line = (x1: number, y1: number, x2: number, y2: number, color: [number,number,number] = BLACK, lw = 0.3) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(lw);
    pdf.line(x1, y1, x2, y2);
  };

  const rect = (x: number, ry: number, w: number, h: number, color: [number,number,number]) => {
    pdf.setFillColor(...color);
    pdf.rect(x, ry, w, h, 'F');
  };

  /** Caixa de campo: label à esquerda, valor à direita com linha pontilhada */
  const fieldRow = (label: string, value: string, fy: number, lw = 60) => {
    setFont('bold', 7, DARK);
    pdf.text(label, mL, fy);
    const xVal = mL + lw;
    const lineWidth = cW - lw;
    // underline for value
    line(xVal, fy + 0.5, xVal + lineWidth, fy + 0.5, [180,180,180], 0.2);
    setFont('normal', 7, DARK);
    if (value) {
      pdf.text(value, xVal + 1, fy);
    }
  };

  /** Duas colunas paralelas de label+valor */
  const doubleField = (
    l1: string, v1: string,
    l2: string, v2: string,
    fy: number,
    col1W = cW / 2
  ) => {
    const col2X = mL + col1W + 4;
    const col2W = cW - col1W - 4;

    setFont('bold', 7, DARK);
    pdf.text(l1, mL, fy);
    line(mL + 22, fy + 0.5, mL + col1W, fy + 0.5, [180,180,180], 0.2);
    setFont('normal', 7, DARK);
    if (v1) pdf.text(v1, mL + 23, fy);

    setFont('bold', 7, DARK);
    pdf.text(l2, col2X, fy);
    line(col2X + 22, fy + 0.5, col2X + col2W, fy + 0.5, [180,180,180], 0.2);
    setFont('normal', 7, DARK);
    if (v2) pdf.text(v2, col2X + 23, fy);
  };

  /** Cabeçalho de seção colorido */
  const sectionHeader = (text: string, color: [number,number,number], sy: number, h = 5.5): number => {
    rect(mL, sy, cW, h, color);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...WHITE);
    pdf.text(text.toUpperCase(), mL + 2, sy + 3.7);
    return sy + h;
  };

  /** Sub-cabeçalho cinza "PARTES MECÂNICAS" */
  const mechHeader = (sy: number): number => {
    rect(mL, sy, cW, 4.5, MECH_BG);
    setFont('bold', 7.5, DARK);
    pdf.text('PARTES MECÂNICAS DA REUNIÃO', mL + 2, sy + 3.2);
    return sy + 4.5;
  };

  const ROW = 5.2; // row height

  // ═══════════════════════════════════════════════════════════════════════
  // CABEÇALHO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════
  y = 10;
  setFont('bold', 14, BLACK);
  pdf.text('NOSSA VIDA E MINISTÉRIO CRISTÃO', mL, y);
  y += 1;
  line(mL, y + 1.5, W - mR, y + 1.5, BLACK, 0.4);
  y += 3;

  setFont('normal', 7, DARK);
  pdf.text('DESIGNAÇÕES DA REUNIÃO', mL, y);
  setFont('normal', 7, DARK);
  pdf.text(CONGREGATION, W - mR, y, { align: 'right' });
  y += 2;
  line(mL, y, W - mR, y, [180,180,180], 0.2);
  y += 4;

  // Data da semana – alinhado à direita com borda
  const weekUpper = midweek.weekRange.toUpperCase();
  setFont('bold', 9, BLACK);
  const ww = pdf.getTextWidth(weekUpper + '  ');
  pdf.text(weekUpper + '  |', W - mR - ww - 2, y, { align: 'left' });

  // ═══════════════════════════════════════════════════════════════════════
  // LINHA: Presidente / Oração inicial / Oração final  (Meio de semana)
  // ═══════════════════════════════════════════════════════════════════════
  y += 1.5;
  const thirdW = cW / 3;
  setFont('bold', 6.5, DARK);
  const presidente = val(midweek.president);
  const oracaoInicial = val(midweek.openingPrayer);
  const oracaoFinal = val(midweek.closingPrayer);

  setFont('bold', 7, DARK);
  pdf.text('/ PRESIDENTE-', mL, y);
  setFont('normal', 7, DARK);
  pdf.text(presidente, mL + 21, y);
  setFont('bold', 7, DARK);
  pdf.text('/ ORAÇÃO INICIAL-', mL + thirdW, y);
  setFont('normal', 7, DARK);
  pdf.text(oracaoInicial, mL + thirdW + 27, y);
  setFont('bold', 7, DARK);
  pdf.text('/ ORAÇÃO FINAL-', mL + thirdW * 2, y);
  setFont('normal', 7, DARK);
  pdf.text(oracaoFinal, mL + thirdW * 2 + 25, y);
  y += ROW;

  // ═══════════════════════════════════════════════════════════════════════
  // SEÇÃO: TESOUROS DA PALAVRA DE DEUS
  // ═══════════════════════════════════════════════════════════════════════
  y = sectionHeader('✦  Tesouros da Palavra de Deus', AMBER, y);
  y += 1;

  // Linhas 1, 2, 3: Discurso / Joias / Leitura
  const tesourosItems = [
    { label: '1- ' + (val(midweek.talkTheme)), person: val(midweek.talkSpeaker) },
    { label: '2- ' + 'Joias Espirituais',       person: val(midweek.gemsSpeaker) },
    { label: '3- Leitura da Bíblia',            person: val(midweek.bibleReadingReader) },
  ];

  for (const item of tesourosItems) {
    setFont('normal', 7, DARK);
    pdf.text(item.label, mL, y);
    setFont('bold', 7, DARK);
    pdf.text(item.person, W - mR, y, { align: 'right' });
    line(mL, y + 1, W - mR, y + 1, [200,200,200], 0.15);
    y += ROW;
  }
  y += 1;

  // ═══════════════════════════════════════════════════════════════════════
  // SEÇÃO: FAÇA SEU MELHOR NO MINISTÉRIO
  // ═══════════════════════════════════════════════════════════════════════
  y = sectionHeader('✦  Faça seu Melhor no Ministério', ORANGE, y);
  y += 1;

  const ministerioItems = [
    { num: 4, theme: midweek.part1Theme, speaker: midweek.part1Speaker, assistant: midweek.part1Assistant, helper2: midweek.part1SecondHelper },
    { num: 5, theme: midweek.part2Theme, speaker: midweek.part2Speaker, assistant: midweek.part2Assistant, helper2: midweek.part2SecondHelper },
    { num: 6, theme: midweek.part3Theme, speaker: midweek.part3Speaker, assistant: midweek.part3Assistant, helper2: midweek.part3SecondHelper },
    { num: 7, theme: midweek.part4Theme, speaker: midweek.part4Speaker, assistant: midweek.part4Assistant, helper2: midweek.part4SecondHelper },
  ];

  // Part 8 = "Discurso" style (sem ajudante)
  for (const item of ministerioItems) {
    const themeText = val(item.theme);
    const personText = val(item.speaker);
    const assistText = val(item.assistant);
    const helper2Text = val(item.helper2);

    setFont('normal', 7, DARK);
    pdf.text(`${item.num}- ${themeText}`, mL, y);

    // right side: designado / ajudante(s)
    let rightText = personText;
    if (assistText) rightText += ' / ' + assistText;
    if (helper2Text) rightText += ' / ' + helper2Text;

    setFont('bold', 7, DARK);
    pdf.text(rightText, W - mR, y, { align: 'right' });
    line(mL, y + 1, W - mR, y + 1, [200,200,200], 0.15);
    y += ROW;
  }
  y += 1;

  // ═══════════════════════════════════════════════════════════════════════
  // SEÇÃO: NOSSA VIDA CRISTÃ
  // ═══════════════════════════════════════════════════════════════════════
  y = sectionHeader('✦  Nossa Vida Cristã', ROSE, y);
  y += 1;

  const vidaCristaItems = [
    { label: '9- ' + (val(midweek.lifePart1Theme)),  person: val(midweek.lifePart1Speaker) },
    { label: '   ' + (val(midweek.lifePart2Theme)),  person: val(midweek.lifePart2Speaker) },
    { label: '   ' + (val(midweek.lifePart3Theme)),  person: val(midweek.lifePart3Speaker) },
  ];

  for (const item of vidaCristaItems) {
    setFont('normal', 7, DARK);
    pdf.text(item.label, mL, y);
    setFont('bold', 7, DARK);
    pdf.text(item.person, W - mR, y, { align: 'right' });
    line(mL, y + 1, W - mR, y + 1, [200,200,200], 0.15);
    y += ROW;
  }

  // Estudo Bíblico
  const cbs = '10- ESTUDO BÍBLICO';
  const cbsDir = val(midweek.cbsConductor);
  const cbsLei = val(midweek.cbsReader);
  setFont('normal', 7, DARK);
  pdf.text(cbs, mL, y);
  setFont('bold', 6.5, DARK);
  pdf.text('DIRIGENTE', mL + 50, y);
  setFont('normal', 7, DARK);
  pdf.text(cbsDir, mL + 65, y);
  setFont('bold', 6.5, DARK);
  pdf.text('LEITOR', mL + 100, y);
  setFont('normal', 7, DARK);
  pdf.text(cbsLei, mL + 112, y);
  line(mL, y + 1, W - mR, y + 1, [200,200,200], 0.15);
  y += ROW + 1;

  // ═══════════════════════════════════════════════════════════════════════
  // PARTES MECÂNICAS (MEIO DE SEMANA)
  // ═══════════════════════════════════════════════════════════════════════
  y = mechHeader(y);
  y += 1.5;

  const mechW = cW / 2 - 2;
  const mechColR = mL + mechW + 4;

  const mechRow = (l1: string, v1: string, l2: string, v2: string) => {
    setFont('bold', 7, DARK);
    pdf.text(l1, mL, y);
    line(mL + 22, y + 0.5, mL + mechW, y + 0.5, [180,180,180], 0.2);
    setFont('normal', 7, DARK);
    if (v1) pdf.text(v1, mL + 23, y);

    setFont('bold', 7, DARK);
    pdf.text(l2, mechColR, y);
    line(mechColR + 22, y + 0.5, mechColR + mechW, y + 0.5, [180,180,180], 0.2);
    setFont('normal', 7, DARK);
    if (v2) pdf.text(v2, mechColR + 23, y);
    y += ROW;
  };

  mechRow('INDICADOR - 1', val(midweek.mechanicalIndicador1), 'INDICADOR - 2', val(midweek.mechanicalIndicador2));
  mechRow('MICROFONE - 1', val(midweek.mechanicalMicrofone1), 'MICROFONE - 2', val(midweek.mechanicalMicrofone2));
  mechRow('AUDIO E VIDEO', val(midweek.mechanicalAudioVideo), 'PALCO', val(midweek.mechanicalPalco));
  y += 3;

  // Linha divisória entre reuniões
  line(mL, y, W - mR, y, BLACK, 0.8);
  y += 4;

  // ═══════════════════════════════════════════════════════════════════════
  // SEÇÃO: REUNIÃO DE FIM DE SEMANA
  // ═══════════════════════════════════════════════════════════════════════
  y = sectionHeader('✦  Reunião de Fim de Semana', TEAL, y, 6);
  y += 2;

  // Presidente / Orações
  const wPresident = val(weekend.president);
  const wOracaoI   = val(weekend.openingPrayer);
  const wOracaoF   = val(weekend.closingPrayer);
  setFont('bold', 7, DARK);
  pdf.text('PRESIDENTE -', mL, y);
  setFont('normal', 7, DARK);
  pdf.text(wPresident, mL + 21, y);
  setFont('bold', 7, DARK);
  pdf.text('/ ORAÇÃO INICIAL -', mL + thirdW, y);
  setFont('normal', 7, DARK);
  pdf.text(wOracaoI, mL + thirdW + 29, y);
  setFont('bold', 7, DARK);
  pdf.text('/ ORAÇÃO FINAL -', mL + thirdW * 2, y);
  setFont('normal', 7, DARK);
  pdf.text(wOracaoF, mL + thirdW * 2 + 27, y);
  line(mL, y + 1, W - mR, y + 1, [200,200,200], 0.15);
  y += ROW;

  // Tema do discurso / Orador
  const talkTheme = val(weekend.talkTheme);
  const speaker = val(weekend.localSpeaker) || val(weekend.visitingSpeaker);
  setFont('normal', 7, DARK);
  pdf.text(talkTheme, mL, y);
  setFont('bold', 7, DARK);
  pdf.text('ORADOR -', W - mR - 50, y);
  setFont('normal', 7, DARK);
  pdf.text(speaker, W - mR - 50 + 14, y);
  line(mL, y + 1, W - mR, y + 1, [200,200,200], 0.15);
  y += ROW;

  // Estudo A Sentinela
  const wCond = val(weekend.watchtowerConductor);
  const wRead = val(weekend.watchtowerReader);
  setFont('bold', 7, DARK);
  pdf.text('ESTUDO A SENTINELA', mL, y);
  setFont('bold', 6.5, DARK);
  pdf.text('DIRIGENTE', mL + 36, y);
  setFont('normal', 7, DARK);
  pdf.text(wCond, mL + 51, y);
  setFont('bold', 6.5, DARK);
  pdf.text('LEITOR', mL + 90, y);
  setFont('normal', 7, DARK);
  pdf.text(wRead, mL + 102, y);
  line(mL, y + 1, W - mR, y + 1, [200,200,200], 0.15);
  y += ROW + 1;

  // ═══════════════════════════════════════════════════════════════════════
  // PARTES MECÂNICAS (FIM DE SEMANA)
  // ═══════════════════════════════════════════════════════════════════════
  y = mechHeader(y);
  y += 1.5;

  mechRow('INDICADOR - 1', val(weekend.mechanicalIndicador1), 'INDICADOR - 2', val(weekend.mechanicalIndicador2));
  mechRow('MICROFONE - 1', val(weekend.mechanicalMicrofone1), 'MICROFONE - 2', val(weekend.mechanicalMicrofone2));
  mechRow('AUDIO E VIDEO', val(weekend.mechanicalAudioVideo), 'PALCO', val(weekend.mechanicalPalco));

  // Borda externa da página
  pdf.setDrawColor(...BLACK);
  pdf.setLineWidth(0.5);
  pdf.rect(mL - 2, 6, W - (mL - 2) * 2, y + 2, 'S');

  // Salvar
  const fileName = `programacao-${midweek.weekRange.replace(/\s/g, '-').toLowerCase()}.pdf`;
  pdf.save(fileName);
}
