// Posições no template campo-semana.pdf (coordenadas em pontos, 1pt = 1/72 inch)
// Template A4: 595 x 842 pt
// Após o timbre (header ~120pt), iniciamos as tabelas

export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;
export const MARGIN_LEFT = 50;
export const MARGIN_RIGHT = 50;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Posições Y (de cima para baixo, após o timbre)
export const POSITIONS = {
  header: {
    month: { x: 150, y: 740, fontSize: 12 },
    title: { x: 150, y: 760, fontSize: 14 },
  },
  week: {
    headerY: 700,
    startY: 680,
    rowHeight: 22,
    columns: {
      day: { x: MARGIN_LEFT, width: 80 },
      time: { x: MARGIN_LEFT + 90, width: 60 },
      location: { x: MARGIN_LEFT + 160, width: 160 },
      leader: { x: MARGIN_LEFT + 330, width: 160 },
    },
  },
  saturday: {
    headerY: 540,
    startY: 520,
    rowHeight: 24,
    columns: {
      date: { x: MARGIN_LEFT, width: 50 },
      time: { x: MARGIN_LEFT + 90, width: 60 },
      location: { x: MARGIN_LEFT + 160, width: 160 },
      leader: { x: MARGIN_LEFT + 330, width: 160 },
    },
  },
  sundayLontras: {
    headerY: 380,
    startY: 360,
    rowHeight: 24,
    columns: {
      date: { x: MARGIN_LEFT, width: 50 },
      time: { x: MARGIN_LEFT + 90, width: 60 },
      location: { x: MARGIN_LEFT + 160, width: 160 },
      leader: { x: MARGIN_LEFT + 330, width: 160 },
    },
  },
  sundayPraia: {
    headerY: 220,
    startY: 200,
    rowHeight: 24,
    columns: {
      date: { x: MARGIN_LEFT, width: 50 },
      time: { x: MARGIN_LEFT + 90, width: 60 },
      location: { x: MARGIN_LEFT + 160, width: 160 },
      leader: { x: MARGIN_LEFT + 330, width: 160 },
    },
  },
};
