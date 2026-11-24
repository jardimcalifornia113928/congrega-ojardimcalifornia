export interface Publisher {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  secondaryPhone?: string;
  profession?: string;
  address?: string;
  birthDate?: string;
  gender: 'masculino' | 'feminino';
  status: 'ativo' | 'inativo' | 'removido' | 'mudou';
  groupId?: string;
  responsibility: 'publicador' | 'servo' | 'anciao' | 'estudante';
  pioneerType: 'nao' | 'auxiliar' | 'regular' | 'especial';
  baptismDate?: string;
  tags?: string[];
  designations?: string[];
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  count?: number;
  members?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldReportEntry {
  participou: boolean;
  estudos: string;
  auxiliar: boolean;
  horas: string;
  observacao: string;
}

export interface FieldReport {
  reports: Record<string, FieldReportEntry>;
  month: number;
  year: number;
  updatedAt: string;
}

export interface MidweekMeetingData {
  president: string;
  openingPrayer: string;
  talkSpeaker: string;
  talkTheme: string;
  talkDuration: number;
  gemsSpeaker: string;
  gemsTheme: string;
  gemsDuration: number;
  bibleReadingReader: string;
  bibleReadingRef: string;
  part1Type: string;
  part1Speaker: string;
  part1Theme: string;
  part1Duration: number;
  part1Assistant: string;
  part1SecondHelper: string;
  part2Type: string;
  part2Speaker: string;
  part2Theme: string;
  part2Duration: number;
  part2Assistant: string;
  part2SecondHelper: string;
  part3Type: string;
  part3Speaker: string;
  part3Theme: string;
  part3Duration: number;
  part3Assistant: string;
  part3SecondHelper: string;
  part4Type: string;
  part4Speaker: string;
  part4Theme: string;
  part4Duration: number;
  part4Assistant: string;
  part4SecondHelper: string;
  lifePart1Speaker: string;
  lifePart1Theme: string;
  lifePart1Duration: number;
  lifePart2Speaker: string;
  lifePart2Theme: string;
  lifePart2Duration: number;
  lifePart3Speaker: string;
  lifePart3Theme: string;
  lifePart3Duration: number;
  cbsConductor: string;
  cbsTheme: string;
  cbsDuration: number;
  cbsReader: string;
  closingPrayer: string;
  songOpening: string;
  songMiddle: string;
  songClosing: string;
  mechanicalIndicador1: string;
  mechanicalIndicador2: string;
  mechanicalMicrofone1: string;
  mechanicalMicrofone2: string;
  mechanicalPalco: string;
  mechanicalAudioVideo: string;
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  permissions?: Record<string, { cadastrar: boolean; limpar: boolean; excluir: boolean; backup: boolean; imprimir: boolean }>;
  createdAt?: string;
  lastAccess?: string;
}

export interface Territory {
  id: string;
  number: string;
  publicadorId?: string;
  publicadorName?: string;
  dirigenteId?: string;
  dirigenteName?: string;
  dirigentePhone?: string;
  saidaId?: string;
  saidaName?: string;
  dataDesignacao?: string;
  horario?: string;
  month?: string;
  dataConclusao?: string;
  ultimaDataConcluida?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ===== Arranjo de Ônibus =====

export type BusPaymentMethod = 'dinheiro' | 'pix' | 'transferencia' | 'cartao';

/** Marca de cancelamento (recibo não é apagado, é cancelado) */
export interface BusCancelMark {
  at: string;
  reason: string;
  byName: string;
}

/** Recebimento de um participante (série PAG) */
export interface BusPayment {
  id: string;
  date: string;
  amount: number;
  method: BusPaymentMethod;
  receiptNo: string;
  authCode: string;
  receivedById: string;
  receivedByName: string;
  canceled?: BusCancelMark;
}

/** Devolução de valor a um participante que desistiu (série DEV) */
export interface BusRefund {
  id: string;
  date: string;
  amount: number;
  fromId: string;
  fromName: string;
  receiptNo: string;
  authCode: string;
  note?: string;
}

export interface BusParticipant {
  id: string;
  publisherId?: string;
  name: string;
  groupName?: string;
  phone?: string;
  /** Valor próprio (criança, casal, irmão com desconto). Sem isso, usa o valor do assento. */
  customShare?: number;
  status: 'ativo' | 'desistente';
  /** Desistiu e deixou o valor no caixa (não pediu devolução) */
  retained?: boolean;
  joinedAt: string;
  payments: BusPayment[];
  refunds?: BusRefund[];
}

/** Repasse integral do dinheiro em mãos (série REP) — a "sangria" */
export interface BusTransfer {
  id: string;
  date: string;
  amount: number;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  receiptNo: string;
  authCode: string;
  coveredPayments: string[];
}

export interface BusArrangement {
  id: string;
  title: string;
  /** Tipo do evento: assembleia = 1 dia de lista, congresso = 3 dias */
  eventType?: 'assembleia' | 'congresso';
  date: string;
  seats: number;
  busTotal: number;
  seatPrice: number;
  status: 'aberto' | 'fechado' | 'concluido';
  /** Os 2 responsáveis (uids) que podem alterar */
  managers: string[];
  /** Uids dos designados com login, sincronizados pelo admin (regras do Firestore) */
  managerUids?: string[];
  collectorId?: string;
  collectorName?: string;
  depositorId?: string;
  depositorName?: string;
  participants: BusParticipant[];
  transfers: BusTransfer[];
  /** Sequenciais por série: PAG, REP, DEP, DEV */
  counters?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

/** Depósito no banco (série DEP). A foto do comprovante fica em subcoleção. */
export interface BusDeposit {
  id: string;
  arrangementId: string;
  date: string;
  amount: number;
  byId: string;
  byName: string;
  bankRef: string;
  receiptNo: string;
  authCode: string;
  hasPhoto?: boolean;
  createdAt?: string;
}

export interface CongregationSettings {
  congregationName: string;
  address: string;
  congregationNumber: string;
  circuit: string;
  midweekDay: number;
  midweekTime: string;
  weekendDay: number;
  weekendTime: string;
  circuitSuperintendent: string;
  circuitSuperintendentWife: string;
  circuitSuperintendentPhone: string;
}
