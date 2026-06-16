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
  responsibility: 'publicador' | 'servo' | 'anciao';
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
  gemsDuration: number;
  bibleReadingReader: string;
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
