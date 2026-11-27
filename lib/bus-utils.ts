import type {
  BusArrangement,
  BusDeposit,
  BusParticipant,
} from '@/lib/types';

// ===== Formatação =====

export const formatBRL = (value: number): string =>
  (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

/**
 * `new Date('YYYY-MM-DD')` é interpretado como UTC e, no Brasil, mostra o dia
 * anterior. Datas de formulário (`type="date"`) são locais: montar com as partes
 * evita o deslocamento de fuso. Meio-dia também protege contra DST.
 */
export const parseDateOnly = (iso: string): Date => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!parts) return new Date(iso);
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), 12);
};

export const formatDateBR = (iso?: string): string => {
  if (!iso) return '—';
  const d = parseDateOnly(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};

export const formatDateTimeBR = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

/** Nome da congregação em uma linha só (usado nos recibos) */
export const shortDate = (iso?: string): string => formatDateBR(iso);

// ===== Identificadores e códigos =====

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

const AUTH_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código de autenticação impresso no recibo (sem letras/números ambíguos) */
export const generateAuthCode = (): string => {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const chars = Array.from(bytes).map((b) => AUTH_ALPHABET[b % AUTH_ALPHABET.length]);
  return `${chars.slice(0, 3).join('')}-${chars.slice(3).join('')}`;
};

export type ReceiptPrefix = 'PAG' | 'DON' | 'REP' | 'DEP' | 'DEV';

/** Sequencial por arranjo e por série: PAG-26-0001 */
export const nextReceiptNo = (
  counters: Record<string, number> | undefined,
  prefix: ReceiptPrefix,
  date: Date = new Date(),
): { receiptNo: string; counters: Record<string, number> } => {
  const current = counters?.[prefix] ?? 0;
  const seq = current + 1;
  const year = String(date.getFullYear()).slice(-2);
  return {
    receiptNo: `${prefix}-${year}-${String(seq).padStart(4, '0')}`,
    counters: { ...(counters ?? {}), [prefix]: seq },
  };
};

// ===== Contas por participante =====

export const participantDue = (participant: BusParticipant, seatPrice: number): number =>
  round2(participant.customShare ?? seatPrice);

/** Total recebido do participante (pagamentos não cancelados) */
export const participantPaid = (participant: BusParticipant): number =>
  round2(
    (participant.payments ?? [])
      .filter((p) => !p.canceled)
      .reduce((sum, p) => sum + (p.amount || 0), 0),
  );

export const participantRefunded = (participant: BusParticipant): number =>
  round2((participant.refunds ?? []).reduce((sum, r) => sum + (r.amount || 0), 0));

/** Saldo do participante: devido - (pago - devolvido). Negativo = crédito. */
export const participantBalance = (participant: BusParticipant, seatPrice: number): number =>
  round2(participantDue(participant, seatPrice) - (participantPaid(participant) - participantRefunded(participant)));

export type ParticipantStatus = 'quitado' | 'parcial' | 'aberto' | 'credito';

export const participantStatus = (participant: BusParticipant, seatPrice: number): ParticipantStatus => {
  const balance = participantBalance(participant, seatPrice);
  if (balance <= -0.005) return 'credito';
  if (balance <= 0.005) return 'quitado';
  if (participantPaid(participant) > 0) return 'parcial';
  return 'aberto';
};

// ===== Dinheiro em mãos / caixa =====

export interface HandsEntry {
  id: string;
  name: string;
  amount: number;
}

/**
 * Quanto cada pessoa está segurando agora.
 * entra: pagamentos recebidos + repasses recebidos
 * sai: repasses entregues + depósitos + devoluções
 */
export const computeHands = (
  arrangement: BusArrangement,
  deposits: BusDeposit[],
  resolveName?: (uid: string) => string,
): HandsEntry[] => {
  const map = new Map<string, HandsEntry>();
  const placeholders = ['Sem nome', 'Depositante', 'Responsável'];
  const cleanName = (value?: string): string => {
    const name = (value || '').trim();
    return name && !placeholders.includes(name) ? name : '';
  };

  const ensure = (id?: string, name?: string): HandsEntry | null => {
    if (!id) return null;
    const validName = cleanName(name);
    const existing = map.get(id);
    if (existing) {
      if (validName && !existing.name) existing.name = validName;
      return existing;
    }
    // Nunca gravar "Sem nome" aqui: isso impedia o nome real de preencher depois.
    const entry: HandsEntry = { id, name: validName, amount: 0 };
    map.set(id, entry);
    return entry;
  };

  // Responsáveis sempre aparecem (mesmo com zero)
  (arrangement.managers ?? []).forEach((uid) => ensure(uid, ''));
  ensure(arrangement.collectorId, arrangement.collectorName);
  ensure(arrangement.depositorId, arrangement.depositorName);

  (arrangement.participants ?? []).forEach((participant) => {
    (participant.payments ?? []).forEach((payment) => {
      if (payment.canceled) return;
      const entry = ensure(payment.receivedById, payment.receivedByName);
      if (entry) entry.amount = round2(entry.amount + (payment.amount || 0));
    });
    (participant.refunds ?? []).forEach((refund) => {
      const entry = ensure(refund.fromId, refund.fromName);
      if (entry) entry.amount = round2(entry.amount - (refund.amount || 0));
    });
  });

  // Donativo entra no caixa de quem recebeu, mas não é dívida de passageiro.
  (arrangement.donations ?? []).forEach((donation) => {
    if (donation.canceled) return;
    const entry = ensure(donation.receivedById, donation.receivedByName);
    if (entry) entry.amount = round2(entry.amount + (donation.amount || 0));
  });

  (arrangement.transfers ?? []).forEach((transfer) => {
    const from = ensure(transfer.fromId, transfer.fromName);
    const to = ensure(transfer.toId, transfer.toName);
    if (from) from.amount = round2(from.amount - (transfer.amount || 0));
    if (to) to.amount = round2(to.amount + (transfer.amount || 0));
  });

  deposits.forEach((deposit) => {
    const entry = ensure(deposit.byId, deposit.byName);
    if (entry) entry.amount = round2(entry.amount - (deposit.amount || 0));
  });

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      name: entry.name || resolveName?.(entry.id) || 'Responsável',
    }))
    .sort((a, b) => b.amount - a.amount);
};

export interface BusSummary {
  seats: number;
  soldSeats: number;
  activeParticipants: number;
  busTotal: number;
  seatPrice: number;
  dueTotal: number;
  paidTotal: number;
  /** Parte de paidTotal que veio de donativos (sem assento vinculado). */
  donatedTotal: number;
  refundedTotal: number;
  netCashed: number;
  depositedTotal: number;
  toDeposit: number;
  missingFromParticipants: number;
  creditTotal: number;
  retainedTotal: number;
  expectedRevenue: number;
  gapToCost: number;
  complementPerPerson: number;
}

export const summarize = (arrangement: BusArrangement, deposits: BusDeposit[]): BusSummary => {
  const participants = arrangement.participants ?? [];
  const active = participants.filter((p) => p.status !== 'desistente');
  const seatPrice = arrangement.seatPrice || 0;

  const dueTotal = active.reduce((sum, p) => sum + participantDue(p, seatPrice), 0);
  const donatedTotal = round2(
    (arrangement.donations ?? [])
      .filter((d) => !d.canceled)
      .reduce((sum, d) => sum + (d.amount || 0), 0),
  );
  // Arrecadado inclui donativo para abater o custo do ônibus. A dívida e o
  // crédito dos participantes continuam calculados só com os pagamentos deles.
  const paidTotal = round2(
    participants.reduce((sum, p) => sum + participantPaid(p), 0) + donatedTotal,
  );
  const refundedTotal = participants.reduce((sum, p) => sum + participantRefunded(p), 0);
  const missingFromParticipants = active.reduce(
    (sum, p) => sum + Math.max(0, participantBalance(p, seatPrice)),
    0,
  );
  const creditTotal = participants.reduce(
    (sum, p) => sum + Math.max(0, -participantBalance(p, seatPrice)),
    0,
  );
  const retainedTotal = participants
    .filter((p) => p.status === 'desistente' && p.retained)
    .reduce((sum, p) => sum + (participantPaid(p) - participantRefunded(p)), 0);

  const depositedTotal = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const netCashed = round2(paidTotal - refundedTotal);
  const expectedRevenue = round2(active.length * seatPrice);
  const gapToCost = round2((arrangement.busTotal || 0) - netCashed);
  const uncovered = round2((arrangement.busTotal || 0) - expectedRevenue);

  return {
    seats: arrangement.seats || 0,
    soldSeats: active.length,
    activeParticipants: active.length,
    busTotal: arrangement.busTotal || 0,
    seatPrice,
    dueTotal: round2(dueTotal),
    paidTotal,
    donatedTotal,
    refundedTotal: round2(refundedTotal),
    netCashed,
    depositedTotal: round2(depositedTotal),
    toDeposit: round2(netCashed - depositedTotal),
    missingFromParticipants: round2(missingFromParticipants),
    creditTotal: round2(creditTotal),
    retainedTotal: round2(retainedTotal),
    expectedRevenue,
    gapToCost,
    complementPerPerson:
      active.length > 0 && uncovered > 0 ? round2(uncovered / active.length) : 0,
  };
};

/** Sugestão de valor por assento: sempre para cima, para sobrar e não faltar */
export const suggestSeatPrice = (busTotal: number, seats: number): number => {
  if (!seats || seats <= 0) return 0;
  return Math.ceil((busTotal || 0) / seats);
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  transferencia: 'Transferência',
  cartao: 'Cartão',
};
