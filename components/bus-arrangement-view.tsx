'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Bus,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  Search,
  Settings2,
  Upload,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { toast } from 'sonner';
import type {
  BusArrangement,
  BusDeposit,
  BusParticipant,
  BusPayment,
  BusPaymentMethod,
  BusRefund,
  BusTransfer,
  CongregationSettings,
  Group,
  Publisher,
  UserData,
} from '@/lib/types';
import {
  computeHands,
  createId,
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  generateAuthCode,
  nextReceiptNo,
  participantBalance,
  participantDue,
  participantPaid,
  participantStatus,
  PAYMENT_METHOD_LABEL,
  type ReceiptPrefix,
  suggestSeatPrice,
  summarize,
  type HandsEntry,
} from '@/lib/bus-utils';
import {
  busReceiptFileName,
  generateBusReceiptPDF,
  type BusReceiptData,
  type BusReceiptKind,
} from '@/print/services/bus-receipt-pdf-generator';
import {
  busPassengerListFileName,
  generateBusPassengerListPDF,
  type BusPassengerListData,
} from '@/print/services/bus-passenger-list-pdf-generator';
import { downloadPDF, openPDFForPrint } from '@/print/utils/pdf-print';

// ===== Helpers locais =====

const fullName = (p: Publisher): string =>
  [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim();

/** Compara nomes ignorando acento, caixa e pontuação. */
const normalizeName = (value?: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

const KIND_LABEL: Record<BusReceiptKind, string> = {
  PAG: 'Pagamento',
  REP: 'Repasse',
  DEP: 'Depósito',
  DEV: 'Devolução',
};

/** Chaves usadas na aba Designação de Publicadores (formato "<Título>::<Item>") */
const BUS_TEAM_ROLES = [
  { key: 'Arranjo de ônibus::Super. de ônibus', label: 'Super. de ônibus' },
  { key: 'Arranjo de ônibus::Assistente', label: 'Assistente' },
  { key: 'Arranjo de ônibus::Capitão', label: 'Capitão' },
] as const;

type BusEventType = 'assembleia' | 'congresso';

const EVENT_TITLE: Record<BusEventType, string> = {
  assembleia: 'Assembleia de Circuito',
  congresso: 'Congresso',
};

/** new Date('YYYY-MM-DD') é interpretado como UTC e pode mostrar o dia anterior no Brasil. */
const parseLocalDate = (iso: string): Date => {
  const [year, month, day] = (iso || '').slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
};

const formatDayBR = (iso: string): string => {
  const date = parseLocalDate(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
};

/** Arranjos antigos sem eventType são inferidos pelo título. */
const eventTypeOf = (arrangement?: BusArrangement | null): BusEventType =>
  arrangement?.eventType === 'congresso' ||
  (!arrangement?.eventType && arrangement?.title?.toLowerCase().includes('congresso'))
    ? 'congresso'
    : 'assembleia';

/** Uma lista por dia; no congresso a data informada no arranjo é a sexta-feira. */
const passengerListDays = (arrangement: BusArrangement) => {
  if (eventTypeOf(arrangement) === 'assembleia') {
    return [{ label: EVENT_TITLE.assembleia, date: formatDayBR(arrangement.date) }];
  }
  const friday = parseLocalDate(arrangement.date);
  if (Number.isNaN(friday.getTime())) {
    return [{ label: EVENT_TITLE.congresso, date: formatDayBR(arrangement.date) }];
  }
  return ['Sexta-feira', 'Sábado', 'Domingo'].map((label, index) => {
    const day = new Date(friday);
    day.setDate(day.getDate() + index);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return { label, date: formatDayBR(iso) };
  });
};

const STATUS_STYLE: Record<string, string> = {
  quitado: 'bg-emerald-500/10 text-emerald-400',
  parcial: 'bg-amber-500/10 text-amber-400',
  aberto: 'bg-slate-500/10 text-[#94A3B8]',
  credito: 'bg-sky-500/10 text-sky-400',
};

const STATUS_LABEL: Record<string, string> = {
  quitado: 'Quitado',
  parcial: 'Parcial',
  aberto: 'Em aberto',
  credito: 'Crédito',
};

const compressImage = (file: File, maxSize = 1200, quality = 0.7): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsDataURL(file);
  });

interface LedgerEntry {
  kind: BusReceiptKind;
  receiptNo: string;
  authCode: string;
  date: string;
  amount: number;
  person: string;
  participantId?: string;
  paymentId?: string;
  refundId?: string;
  transferId?: string;
  depositId?: string;
  canceled?: boolean;
}

export function BusArrangementView() {
  const { user, isAdmin } = useAuth();

  const [arrangements, setArrangements] = useState<BusArrangement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<BusDeposit[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [appUsers, setAppUsers] = useState<UserData[]>([]);
  const [settings, setSettings] = useState<Partial<CongregationSettings>>({});

  const [tab, setTab] = useState<'participants' | 'payments' | 'cash'>('participants');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const [saving, setSaving] = useState(false);

  // Diálogos
  const [arrangementDialog, setArrangementDialog] = useState<{ open: boolean; edit: BusArrangement | null }>({
    open: false,
    edit: null,
  });
  const [form, setForm] = useState({
    eventType: 'assembleia' as BusEventType,
    date: '',
    seats: 44,
    busTotal: 0,
    seatPrice: 0,
    collectorId: '',
    depositorId: '',
  });

  const [avulsoOpen, setAvulsoOpen] = useState(false);
  const [avulsoForm, setAvulsoForm] = useState({ name: '', phone: '' });

  const [paymentTarget, setPaymentTarget] = useState<BusParticipant | null>(null);
  const [payForm, setPayForm] = useState<{ amount: string; method: BusPaymentMethod; receivedById: string }>({
    amount: '',
    method: 'dinheiro',
    receivedById: '',
  });

  const [desistTarget, setDesistTarget] = useState<BusParticipant | null>(null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [depForm, setDepForm] = useState<{ bankRef: string; photo: string; processing: boolean }>({
    bankRef: '',
    photo: '',
    processing: false,
  });

  const [receipt, setReceipt] = useState<BusReceiptData | null>(null);
  const [photoView, setPhotoView] = useState<string | null>(null);

  // ===== Carregamentos =====

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'bus_arrangements'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as BusArrangement))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setArrangements(list);
        setSelectedId((current) => current ?? list[0]?.id ?? null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bus_arrangements');
        toast.error('Não foi possível ler os arranjos. Verifique as regras do Firestore.', { duration: 8000 });
      },
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedId) {
      setDeposits([]);
      return;
    }
    const q = query(collection(db, 'bus_deposits'), where('arrangementId', '==', selectedId));
    const unsub = onSnapshot(
      q,
      (snap) => setDeposits(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BusDeposit))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'bus_deposits'),
    );
    return () => unsub();
  }, [user, selectedId]);

  useEffect(() => {
    if (!user) return;
    const unsubP = onSnapshot(collection(db, 'publishers'), (snap) =>
      setPublishers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Publisher))),
    );
    const unsubG = onSnapshot(collection(db, 'groups'), (snap) =>
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group))),
    );
    const unsubU = onSnapshot(collection(db, 'users'), (snap) =>
      setAppUsers(snap.docs.map((d) => ({ ...(d.data() as UserData), uid: d.id }))),
    );
    return () => {
      unsubP();
      unsubG();
      unsubU();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', `congregation_${user.uid}`));
        if (snap.exists()) setSettings(snap.data() as Partial<CongregationSettings>);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings');
      }
    })();
  }, [user]);

  const selected = useMemo(
    () => arrangements.find((a) => a.id === selectedId) ?? null,
    [arrangements, selectedId],
  );

  const summary = useMemo(() => (selected ? summarize(selected, deposits) : null), [selected, deposits]);

  const groupName = useCallback(
    (groupId?: string) => groups.find((g) => g.id === groupId)?.name ?? '',
    [groups],
  );

  const userName = useCallback(
    (uid?: string) => {
      const found = appUsers.find((u) => u.uid === uid);
      return found?.displayName || found?.email || '';
    },
    [appUsers],
  );

  // Nome de quem está com o dinheiro: usa a coleção users e, enquanto ela carrega,
  // o próprio usuário logado (evita gravar "Sem nome" ou "Depositante").
  const nameOf = useCallback(
    (uid?: string) => {
      if (!uid) return '';
      return userName(uid) || (uid === user?.uid ? user?.displayName || user?.email || '' : '');
    },
    [userName, user],
  );

  /** Nome salvo pode vir de versão antiga com "Sem nome"/"Depositante" */
  const displayPerson = useCallback(
    (saved: string | undefined, uid: string | undefined) => {
      const fallback = ['', 'Sem nome', 'Depositante', 'Responsável'];
      return saved && !fallback.includes(saved) ? saved : nameOf(uid) || saved || '—';
    },
    [nameOf],
  );

  const hands = useMemo(
    () => (selected ? computeHands(selected, deposits, nameOf) : []),
    [selected, deposits, nameOf],
  );

  /** Equipe lida das designações de Publicadores, sem gravar no arranjo. */
  const busTeam = useMemo(
    () =>
      BUS_TEAM_ROLES.map((role) => ({
        ...role,
        names: publishers
          .filter((p) => p.designations?.includes(role.key))
          .map((p) => fullName(p))
          .filter(Boolean),
      })),
    [publishers],
  );

  /** Quem recebe = Assistente; quem deposita = Super. de ônibus. */
  const responsibleOptions = useMemo(() => {
    const optionsFor = (key: string) =>
      publishers
        .filter((p) => p.designations?.includes(key))
        .map((p) => {
          const name = fullName(p);
          const normalized = normalizeName(name);
          // Se houver login com o mesmo nome, usar o uid para manter a permissão de edição.
          const match = appUsers.find(
            (u) =>
              (u.displayName && normalizeName(u.displayName) === normalized) ||
              (u.email && normalizeName(u.email.split('@')[0]) === normalized),
          );
          return { id: match?.uid || p.id, name: name || match?.displayName || '' };
        })
        .filter((option) => option.name);

    return {
      collector: optionsFor('Arranjo de ônibus::Assistente'),
      depositor: optionsFor('Arranjo de ônibus::Super. de ônibus'),
    };
  }, [publishers, appUsers]);

  const responsibleName = useCallback(
    (id?: string) =>
      [...responsibleOptions.collector, ...responsibleOptions.depositor].find(
        (option) => option.id === id,
      )?.name || '',
    [responsibleOptions],
  );

  const canEdit = Boolean(
    selected && user && (isAdmin || (selected.managers ?? []).includes(user.uid)),
  );

  // ===== Persistência =====

  const saveArrangement = useCallback(
    async (patch: Partial<BusArrangement>) => {
      if (!selected) return;
      setSaving(true);
      try {
        await updateDoc(doc(db, 'bus_arrangements', selected.id), {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'bus_arrangements');
        toast.error('Não foi possível salvar. Você é um dos responsáveis deste arranjo?', { duration: 8000 });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [selected],
  );

  /**
   * Reserva o sequencial do recibo dentro de uma transação: lê os contadores
   * atuais e grava o próximo número antes de qualquer outra escrita. Sem isso,
   * duas operações simultâneas poderiam emitir o mesmo recibo.
   */
  const reserveReceiptNo = useCallback(
    async (prefix: ReceiptPrefix): Promise<string> => {
      if (!selected) throw new Error('Nenhum arranjo selecionado.');
      const ref = doc(db, 'bus_arrangements', selected.id);
      return runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Arranjo não encontrado.');
        const { receiptNo, counters } = nextReceiptNo(
          (snap.data() as BusArrangement).counters,
          prefix,
        );
        transaction.update(ref, { counters, updatedAt: new Date().toISOString() });
        return receiptNo;
      });
    },
    [selected],
  );

  const openNewArrangement = () => {
    setForm({
      eventType: 'assembleia',
      date: new Date().toISOString().slice(0, 10),
      seats: 44,
      busTotal: 0,
      seatPrice: 0,
      collectorId: '',
      depositorId: '',
    });
    setArrangementDialog({ open: true, edit: null });
  };

  const openEditArrangement = () => {
    if (!selected) return;
    setForm({
      eventType: eventTypeOf(selected),
      date: selected.date?.slice(0, 10) ?? '',
      seats: selected.seats,
      busTotal: selected.busTotal,
      seatPrice: selected.seatPrice,
      collectorId: responsibleOptions.collector.some((o) => o.id === selected.collectorId)
        ? (selected.collectorId as string)
        : '',
      depositorId: responsibleOptions.depositor.some((o) => o.id === selected.depositorId)
        ? (selected.depositorId as string)
        : '',
    });
    setArrangementDialog({ open: true, edit: selected });
  };

  const submitArrangement = async () => {
    if (!form.date) {
      toast.error('Informe a data do arranjo.');
      return;
    }
    if (!form.seats || form.seats <= 0) {
      toast.error('Informe a quantidade de assentos.');
      return;
    }
    if (!responsibleOptions.collector.length) {
      toast.error('Designe um Assistente em Publicadores > Designação > Arranjo de ônibus.');
      return;
    }
    if (!responsibleOptions.depositor.length) {
      toast.error('Designe um Super. de ônibus em Publicadores > Designação > Arranjo de ônibus.');
      return;
    }
    if (!form.collectorId || !form.depositorId) {
      toast.error('Escolha quem recebe e quem deposita entre os designados.');
      return;
    }
    if (form.collectorId === form.depositorId) {
      toast.error('Quem recebe e quem deposita devem ser pessoas diferentes.');
      return;
    }
    const managers = [form.collectorId, form.depositorId];

    setSaving(true);
    try {
      const payload = {
        title: EVENT_TITLE[form.eventType],
        eventType: form.eventType,
        date: form.date || new Date().toISOString().slice(0, 10),
        seats: Number(form.seats),
        busTotal: Number(form.busTotal) || 0,
        seatPrice: Number(form.seatPrice) || 0,
        collectorId: form.collectorId,
        collectorName: responsibleName(form.collectorId),
        depositorId: form.depositorId,
        depositorName: responsibleName(form.depositorId),
        managers,
        status: 'aberto' as const,
        updatedAt: new Date().toISOString(),
      };

      if (arrangementDialog.edit) {
        await updateDoc(doc(db, 'bus_arrangements', arrangementDialog.edit.id), payload);
        toast.success('Arranjo atualizado.');
      } else {
        const ref = await addDoc(collection(db, 'bus_arrangements'), {
          ...payload,
          participants: [],
          transfers: [],
          counters: { PAG: 0, REP: 0, DEP: 0, DEV: 0 },
          createdAt: new Date().toISOString(),
        });
        setSelectedId(ref.id);
        toast.success('Arranjo criado.');
      }
      setArrangementDialog({ open: false, edit: null });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bus_arrangements');
      toast.error('Falha ao salvar o arranjo.', { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  // ===== Participantes =====

  const participants = selected?.participants ?? [];

  const inArrangement = useCallback(
    (publisherId?: string) => participants.some((p) => p.publisherId === publisherId),
    [participants],
  );

  const togglePublisher = async (publisher: Publisher) => {
    if (!selected || !canEdit) return;
    const existing = participants.find((p) => p.publisherId === publisher.id);
    let next: BusParticipant[];
    if (existing) {
      if (existing.payments?.some((pay) => !pay.canceled) || (existing.refunds?.length ?? 0) > 0) {
        toast.error('Este participante já tem valores registrados. Use "Desistiu" na aba Recebimentos.', {
          duration: 7000,
        });
        return;
      }
      next = participants.filter((p) => p.id !== existing.id);
    } else {
      next = [
        ...participants,
        {
          id: createId(),
          publisherId: publisher.id,
          name: fullName(publisher),
          groupName: groupName(publisher.groupId),
          phone: publisher.phone || publisher.secondaryPhone || '',
          status: 'ativo',
          joinedAt: new Date().toISOString(),
          payments: [],
        },
      ];
    }
    await saveArrangement({ participants: next });
  };

  const addAvulso = async () => {
    if (!selected || !canEdit) return;
    if (!avulsoForm.name.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    await saveArrangement({
      participants: [
        ...participants,
        {
          id: createId(),
          name: avulsoForm.name.trim(),
          phone: avulsoForm.phone.trim(),
          status: 'ativo',
          joinedAt: new Date().toISOString(),
          payments: [],
        },
      ],
    });
    setAvulsoOpen(false);
    setAvulsoForm({ name: '', phone: '' });
    toast.success('Participante avulso adicionado.');
  };

  const selectWholeGroup = async (groupId: string) => {
    if (!selected || !canEdit || !groupId) return;
    const missing = publishers.filter((p) => p.groupId === groupId && !inArrangement(p.id));
    if (!missing.length) {
      toast.info('Todos deste grupo já estão no arranjo.');
      return;
    }
    const additions: BusParticipant[] = missing.map((publisher) => ({
      id: createId(),
      publisherId: publisher.id,
      name: fullName(publisher),
      groupName: groupName(publisher.groupId),
      phone: publisher.phone || publisher.secondaryPhone || '',
      status: 'ativo',
      joinedAt: new Date().toISOString(),
      payments: [],
    }));
    await saveArrangement({ participants: [...participants, ...additions] });
    toast.success(`${additions.length} participante(s) adicionado(s).`);
  };

  const filteredPublishers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return publishers
      .filter((p) => p.status !== 'removido')
      .filter((p) => (groupFilter ? p.groupId === groupFilter : true))
      .filter((p) => (term ? fullName(p).toLowerCase().includes(term) : true))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [publishers, search, groupFilter]);

  // ===== Recibos =====

  const buildReceipt = useCallback(
    (
      kind: BusReceiptKind,
      payload: {
        receiptNo: string;
        authCode: string;
        amount: number;
        issuedAt: string;
        participant?: BusParticipant;
        participantName?: string;
        receivedByName?: string;
        methodLabel?: string;
        totalPaid?: number;
        balance?: number;
        fromName?: string;
        toName?: string;
        coveredCount?: number;
        depositedByName?: string;
        bankRef?: string;
        hasPhoto?: boolean;
        note?: string;
      },
    ): BusReceiptData => ({
      kind,
      congregationName: settings.congregationName || 'Congregação Jardim Califórnia',
      congregationAddress: settings.address,
      congregationNumber: settings.congregationNumber,
      arrangementTitle: selected?.title ?? '',
      arrangementDate: formatDateBR(selected?.date),
      receiptNo: payload.receiptNo,
      authCode: payload.authCode,
      issuedAt: payload.issuedAt,
      amount: payload.amount,
      participantName: payload.participant?.name ?? payload.participantName,
      participantPhone: payload.participant?.phone,
      receivedByName: payload.receivedByName,
      methodLabel: payload.methodLabel,
      totalPaid: payload.totalPaid,
      balance: payload.balance,
      fromName: payload.fromName,
      toName: payload.toName,
      coveredCount: payload.coveredCount,
      depositedByName: payload.depositedByName,
      bankRef: payload.bankRef,
      hasPhoto: payload.hasPhoto,
      note: payload.note,
    }),
    [selected, settings],
  );

  const runReceipt = async (data: BusReceiptData, mode: 'print' | 'download' | 'whatsapp') => {
    try {
      const bytes = await generateBusReceiptPDF(data);
      if (mode === 'print') {
        openPDFForPrint(bytes);
      } else if (mode === 'download') {
        downloadPDF(bytes, busReceiptFileName(data));
      } else {
        downloadPDF(bytes, busReceiptFileName(data));
        const phone = (data.participantPhone || '').replace(/\D/g, '');
        const text = [
          `${data.congregationName}`,
          `Arranjo de Ônibus - ${data.arrangementTitle}`,
          `${KIND_LABEL[data.kind]}: ${data.receiptNo}`,
          `Valor: ${formatBRL(data.amount)}`,
          `Código de autenticação: ${data.authCode}`,
          data.balance !== undefined ? `Saldo restante: ${formatBRL(data.balance)}` : '',
          '',
          'O PDF foi baixado. Anexe no WhatsApp para enviar.',
        ]
          .filter(Boolean)
          .join('\n');
        const url = phone
          ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
          : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error(error);
      toast.error('Falha ao gerar o PDF do recibo.');
    }
  };

  const downloadPassengerList = async (mode: 'download' | 'print') => {
    if (!selected) return;
    const payers = participants.filter(
      (p) => p.status !== 'desistente' && participantPaid(p) > 0,
    );
    if (!payers.length) {
      toast.info('Nenhum participante pagou ainda.');
      return;
    }
    const data: BusPassengerListData = {
      congregationName: settings.congregationName || 'Congregação Jardim Califórnia',
      congregationAddress: settings.address,
      congregationNumber: settings.congregationNumber,
      arrangementTitle: selected.title,
      sheets: passengerListDays(selected),
      generatedAt: new Date().toISOString(),
      passengers: payers.map((p) => ({ name: p.name, phone: p.phone, groupName: p.groupName })),
    };
    try {
      const bytes = await generateBusPassengerListPDF(data);
      if (mode === 'print') openPDFForPrint(bytes);
      else downloadPDF(bytes, busPassengerListFileName(data));
      toast.success(
        `Lista com ${payers.length} passageiro(s) em ${data.sheets.length} dia(s) gerada.`,
      );
    } catch (error) {
      console.error(error);
      toast.error('Falha ao gerar a lista de passageiros.');
    }
  };

  // ===== Recebimentos =====

  const openPayment = (participant: BusParticipant) => {
    if (!canEdit) return;
    const balance = participantBalance(participant, selected?.seatPrice ?? 0);
    setPaymentTarget(participant);
    setPayForm({
      amount: Math.max(0, balance).toFixed(2),
      method: 'dinheiro',
      receivedById: selected?.collectorId || user?.uid || '',
    });
  };

  const registerPayment = async () => {
    if (!selected || !paymentTarget) return;
    const amount = Number(String(payForm.amount).replace(',', '.'));
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    const receivedById = payForm.receivedById || selected.collectorId || user?.uid || '';
    const receivedByName = nameOf(receivedById) || selected.collectorName || 'Responsável';

    const authCode = generateAuthCode();
    const issuedAt = new Date().toISOString();

    setSaving(true);
    try {
      const receiptNo = await reserveReceiptNo('PAG');
      const payment: BusPayment = {
        id: createId(),
        date: issuedAt,
        amount,
        method: payForm.method,
        receiptNo,
        authCode,
        receivedById,
        receivedByName,
      };

      const nextParticipants = participants.map((p) =>
        p.id === paymentTarget.id ? { ...p, payments: [...(p.payments ?? []), payment] } : p,
      );

      await saveArrangement({ participants: nextParticipants });
      const updated = nextParticipants.find((p) => p.id === paymentTarget.id)!;
      const totalPaid = participantPaid(updated);
      const balance = participantBalance(updated, selected.seatPrice);
      setReceipt(
        buildReceipt('PAG', {
          receiptNo,
          authCode,
          amount,
          issuedAt,
          participant: updated,
          receivedByName,
          methodLabel: PAYMENT_METHOD_LABEL[payForm.method],
          totalPaid,
          balance,
        }),
      );
      setPaymentTarget(null);
      toast.success(`Pagamento registrado — ${receiptNo}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bus_arrangements');
      toast.error('Não foi possível registrar o pagamento.', { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  const markDesistente = async (mode: 'refund' | 'retain' | 'remove') => {
    if (!selected || !desistTarget) return;
    const participant = desistTarget;
    const paid = participantPaid(participant);

    try {
      if (mode === 'remove') {
        await saveArrangement({ participants: participants.filter((p) => p.id !== participant.id) });
        setDesistTarget(null);
        return;
      }

      if (mode === 'retain') {
        await saveArrangement({
          participants: participants.map((p) =>
            p.id === participant.id ? { ...p, status: 'desistente', retained: true } : p,
          ),
        });
        setDesistTarget(null);
        toast.success('Desistência registrada. Valor permanece no caixa do arranjo.');
        return;
      }

      // Devolução: o dinheiro sai de quem está com ele — e só se houver saldo.
      // Antes havia um fallback para `hands[0]`, que podia devolver um valor
      // maior do que a pessoa tinha e gerar saldo negativo.
      const holder = hands.find((h) => h.id !== participant.id && h.amount >= paid - 0.005);
      if (!holder) {
        toast.error(
          `Ninguém está com ${formatBRL(paid)} disponível para devolver. Confira o quadro "Em mãos".`,
        );
        return;
      }

      const authCode = generateAuthCode();
      const issuedAt = new Date().toISOString();
      const receiptNo = await reserveReceiptNo('DEV');
      const refund: BusRefund = {
        id: createId(),
        date: issuedAt,
        amount: paid,
        fromId: holder.id,
        fromName: holder.name,
        receiptNo,
        authCode,
        note: 'Desistência do arranjo',
      };

      const nextParticipants = participants.map((p) =>
        p.id === participant.id
          ? { ...p, status: 'desistente' as const, refunds: [...(p.refunds ?? []), refund] }
          : p,
      );

      await saveArrangement({ participants: nextParticipants });
      setReceipt(
        buildReceipt('DEV', {
          receiptNo,
          authCode,
          amount: paid,
          issuedAt,
          participant,
          fromName: holder.name,
          note: 'Desistência do arranjo',
        }),
      );
      setDesistTarget(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bus_arrangements');
      toast.error('Não foi possível registrar a desistência.', { duration: 8000 });
    }
  };

  // ===== Repasses e depósitos =====

  const registerTransfer = async (entry: HandsEntry) => {
    if (!selected) return;
    const amount = entry.amount;
    if (amount <= 0.005) {
      toast.info('Não há saldo em mãos para repassar.');
      return;
    }
    const toId = selected.depositorId;
    if (!toId || toId === entry.id) {
      toast.error('Defina quem deposita, diferente de quem está com o dinheiro.');
      return;
    }
    const toName = nameOf(toId) || selected.depositorName || 'Depositante';

    const alreadyCovered = new Set((selected.transfers ?? []).flatMap((t) => t.coveredPayments ?? []));
    const coveredPayments = participants
      .flatMap((p) => p.payments ?? [])
      .filter((pay) => !pay.canceled && pay.receivedById === entry.id && !alreadyCovered.has(pay.receiptNo))
      .map((pay) => pay.receiptNo);

    const authCode = generateAuthCode();
    const issuedAt = new Date().toISOString();

    setSaving(true);
    try {
      const receiptNo = await reserveReceiptNo('REP');
      const transfer: BusTransfer = {
        id: createId(),
        date: issuedAt,
        amount,
        fromId: entry.id,
        fromName: entry.name,
        toId,
        toName,
        receiptNo,
        authCode,
        coveredPayments,
      };

      await saveArrangement({ transfers: [...(selected.transfers ?? []), transfer] });

      setReceipt(
        buildReceipt('REP', {
          receiptNo,
          authCode,
          amount,
          issuedAt,
          fromName: entry.name,
          toName,
          coveredCount: coveredPayments.length,
        }),
      );
      toast.success(`Repasse registrado — ${receiptNo}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bus_arrangements');
      toast.error('Não foi possível registrar o repasse.', { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  const openDeposit = () => {
    if (!selected || !canEdit) return;
    const depositorHands = hands.find((h) => h.id === selected.depositorId);
    if (!depositorHands || depositorHands.amount <= 0.005) {
      toast.info('Não há valor em mãos de quem deposita.');
      return;
    }
    setDepForm({ bankRef: '', photo: '', processing: false });
    setDepositOpen(true);
  };

  const handlePhoto = async (file?: File | null) => {
    if (!file) return;
    setDepForm((prev) => ({ ...prev, processing: true }));
    try {
      const dataUrl = await compressImage(file);
      setDepForm((prev) => ({ ...prev, photo: dataUrl, processing: false }));
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível processar a foto do comprovante.');
      setDepForm((prev) => ({ ...prev, processing: false }));
    }
  };

  const registerDeposit = async () => {
    if (!selected) return;
    const depositor = hands.find((h) => h.id === selected.depositorId);
    const amount = depositor?.amount ?? 0;
    if (amount <= 0.005) {
      toast.info('Nada a depositar.');
      return;
    }
    if (!depForm.photo) {
      toast.error('Anexe a foto do comprovante do banco.');
      return;
    }

    const authCode = generateAuthCode();
    const issuedAt = new Date().toISOString();
    const byName =
      depositor?.name || nameOf(selected.depositorId) || selected.depositorName || 'Depositante';

    setSaving(true);
    try {
      const receiptNo = await reserveReceiptNo('DEP');
      const depositRef = await addDoc(collection(db, 'bus_deposits'), {
        arrangementId: selected.id,
        date: issuedAt,
        amount,
        byId: selected.depositorId ?? '',
        byName,
        bankRef: depForm.bankRef.trim(),
        receiptNo,
        authCode,
        hasPhoto: true,
        createdAt: issuedAt,
      });

      await setDoc(doc(db, 'bus_deposits', depositRef.id, 'photo', 'receipt'), {
        dataUrl: depForm.photo,
        createdAt: issuedAt,
      });

      setReceipt(
        buildReceipt('DEP', {
          receiptNo,
          authCode,
          amount,
          issuedAt,
          depositedByName: byName,
          bankRef: depForm.bankRef.trim(),
          hasPhoto: true,
        }),
      );
      setDepositOpen(false);
      toast.success(`Depósito registrado — ${receiptNo}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bus_deposits');
      toast.error('Falha ao registrar o depósito.', { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  const viewPhoto = async (depositId: string) => {
    try {
      const snap = await getDoc(doc(db, 'bus_deposits', depositId, 'photo', 'receipt'));
      if (!snap.exists()) {
        toast.info('Este depósito não tem comprovante anexado.');
        return;
      }
      setPhotoView((snap.data() as { dataUrl: string }).dataUrl);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'bus_deposits/photo');
      toast.error('Não foi possível abrir o comprovante.');
    }
  };

  // ===== Histórico unificado =====

  const ledger = useMemo<LedgerEntry[]>(() => {
    if (!selected) return [];
    const entries: LedgerEntry[] = [];

    participants.forEach((p) => {
      (p.payments ?? []).forEach((pay) => {
        entries.push({
          kind: 'PAG',
          receiptNo: pay.receiptNo,
          authCode: pay.authCode,
          date: pay.date,
          amount: pay.amount,
          person: p.name,
          participantId: p.id,
          paymentId: pay.id,
          canceled: Boolean(pay.canceled),
        });
      });
      (p.refunds ?? []).forEach((refund) => {
        entries.push({
          kind: 'DEV',
          receiptNo: refund.receiptNo,
          authCode: refund.authCode,
          date: refund.date,
          amount: refund.amount,
          person: p.name,
          participantId: p.id,
          refundId: refund.id,
        });
      });
    });

    (selected.transfers ?? []).forEach((transfer) => {
      entries.push({
        kind: 'REP',
        receiptNo: transfer.receiptNo,
        authCode: transfer.authCode,
        date: transfer.date,
        amount: transfer.amount,
        person: `${displayPerson(transfer.fromName, transfer.fromId)} → ${displayPerson(transfer.toName, transfer.toId)}`,
        transferId: transfer.id,
      });
    });

    deposits.forEach((deposit) => {
      entries.push({
        kind: 'DEP',
        receiptNo: deposit.receiptNo,
        authCode: deposit.authCode,
        date: deposit.date,
        amount: deposit.amount,
        person: displayPerson(deposit.byName, deposit.byId),
        depositId: deposit.id,
      });
    });

    return entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [participants, selected, deposits, displayPerson]);

  const reprint = (entry: LedgerEntry) => {
    if (!selected) return;
    if (entry.kind === 'PAG') {
      const participant = participants.find((p) => p.id === entry.participantId);
      const payment = participant?.payments?.find((p) => p.id === entry.paymentId);
      if (!participant || !payment) return;
      setReceipt(
        buildReceipt('PAG', {
          receiptNo: payment.receiptNo,
          authCode: payment.authCode,
          amount: payment.amount,
          issuedAt: payment.date,
          participant,
          receivedByName: payment.receivedByName,
          methodLabel: PAYMENT_METHOD_LABEL[payment.method],
          totalPaid: participantPaid(participant),
          balance: participantBalance(participant, selected.seatPrice),
        }),
      );
      return;
    }
    if (entry.kind === 'REP') {
      const transfer = (selected.transfers ?? []).find((t) => t.id === entry.transferId);
      if (!transfer) return;
      setReceipt(
        buildReceipt('REP', {
          receiptNo: transfer.receiptNo,
          authCode: transfer.authCode,
          amount: transfer.amount,
          issuedAt: transfer.date,
          fromName: transfer.fromName,
          toName: transfer.toName,
          coveredCount: (transfer.coveredPayments ?? []).length,
        }),
      );
      return;
    }
    if (entry.kind === 'DEP') {
      const deposit = deposits.find((d) => d.id === entry.depositId);
      if (!deposit) return;
      setReceipt(
        buildReceipt('DEP', {
          receiptNo: deposit.receiptNo,
          authCode: deposit.authCode,
          amount: deposit.amount,
          issuedAt: deposit.date,
          depositedByName: deposit.byName,
          bankRef: deposit.bankRef,
          hasPhoto: deposit.hasPhoto,
        }),
      );
      return;
    }
    const participant = participants.find((p) => p.id === entry.participantId);
    const refund = participant?.refunds?.find((r) => r.id === entry.refundId);
    if (!participant || !refund) return;
    setReceipt(
      buildReceipt('DEV', {
        receiptNo: refund.receiptNo,
        authCode: refund.authCode,
        amount: refund.amount,
        issuedAt: refund.date,
        participant,
        fromName: refund.fromName,
        note: refund.note,
      }),
    );
  };

  // ===== Render =====

  if (!user) return null;

  return (
    <>
      {!arrangements.length ? (
        <div className="space-y-6">
          <header>
            <h1 className="text-xl font-black text-white tracking-tight">Arranjo de Ônibus</h1>
            <p className="text-[11px] font-medium text-[#94A3B8]">
              Rateio de viagem, recebimentos, repasses e depósitos.
            </p>
          </header>
          <div className="rounded-xl border border-dashed border-[#1E293B] bg-[#0F172A] p-10 text-center">
            <Bus className="mx-auto h-8 w-8 text-[#0EA5E9]" />
            <p className="mt-3 text-sm font-bold text-white">Nenhum arranjo criado</p>
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              Comece informando o custo do ônibus, os assentos e o valor por assento.
            </p>
            <Button onClick={openNewArrangement} className="mt-5 h-10 gap-2 bg-[#0EA5E9] text-xs font-bold text-white hover:bg-[#0284C7]">
              <Plus className="h-4 w-4" /> Criar arranjo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Arranjo de Ônibus</h1>
          <p className="text-[11px] font-medium text-[#94A3B8]">
            Rateio de viagem, recebimentos, repasses e depósitos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 text-xs font-medium text-white"
          >
            {arrangements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} · {formatDateBR(a.date)}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => downloadPassengerList('download')}
            title="Lista dos passageiros que já pagou, com check de ida e volta"
            className="h-9 gap-2 border-[#1E293B] text-[11px] font-bold text-[#94A3B8] hover:text-white"
          >
            <FileText className="h-4 w-4" /> Lista PDF
          </Button>
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={openEditArrangement}
                className="h-9 gap-2 border-[#1E293B] text-[11px] font-bold text-[#94A3B8] hover:text-white"
              >
                <Settings2 className="h-4 w-4" /> Editar
              </Button>
              <Button
                onClick={openNewArrangement}
                className="h-9 gap-2 bg-[#0EA5E9] text-[11px] font-bold text-white hover:bg-[#0284C7]"
              >
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </>
          )}
        </div>
      </header>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] font-medium text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          Modo leitura: apenas os 2 responsáveis deste arranjo podem alterar.
        </div>
      )}

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Custo do ônibus" value={formatBRL(summary.busTotal)} hint={`${summary.soldSeats}/${summary.seats} assentos`} />
          <SummaryCard
            label="Arrecadado"
            value={formatBRL(summary.netCashed)}
            hint={`${summary.missingFromParticipants > 0 ? `a receber ${formatBRL(summary.missingFromParticipants)}` : 'tudo recebido'}`}
          />
          <SummaryCard
            label="Em mãos"
            value={formatBRL(hands.reduce((sum, h) => sum + Math.max(0, h.amount), 0))}
            hint={summary.toDeposit > 0 ? `falta depositar ${formatBRL(summary.toDeposit)}` : 'nada pendente'}
            tone={summary.toDeposit > 0 ? 'warn' : 'ok'}
          />
          <SummaryCard
            label="Depositado"
            value={formatBRL(summary.depositedTotal)}
            hint={
              summary.gapToCost > 0
                ? `faltam ${formatBRL(summary.gapToCost)} para o custo`
                : `sobra ${formatBRL(Math.abs(summary.gapToCost))}`
            }
            tone={summary.gapToCost > 0 ? 'warn' : 'ok'}
          />
        </div>
      )}

      {summary && summary.complementPerPerson > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] font-medium text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          Com {summary.soldSeats} de {summary.seats} assentos, a arrecadação prevista não cobre o ônibus:
          faltam {formatBRL(summary.busTotal - summary.expectedRevenue)}. Seria {formatBRL(summary.complementPerPerson)} por pessoa.
        </div>
      )}

      {/* Equipe do arranjo — lida das designações de Publicadores */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-[#0EA5E9]" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white">Equipe do arranjo</p>
          <span className="text-[10px] text-[#64748B]">designada em Publicadores › Designação</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {busTeam.map((role) => (
            <div key={role.key} className="rounded-lg border border-[#1E293B]/70 bg-[#0B1220] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{role.label}</p>
              <p
                className={`mt-1 text-xs font-bold ${role.names.length ? 'text-white' : 'text-[#475569]'}`}
              >
                {role.names.length ? role.names.join(', ') : 'Não designado'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-[#1E293B] bg-[#0F172A] p-1">
        <TabButton active={tab === 'participants'} onClick={() => setTab('participants')} icon={<Users className="h-4 w-4" />}>
          Participantes
        </TabButton>
        <TabButton active={tab === 'payments'} onClick={() => setTab('payments')} icon={<Receipt className="h-4 w-4" />}>
          Recebimentos
        </TabButton>
        <TabButton active={tab === 'cash'} onClick={() => setTab('cash')} icon={<Wallet className="h-4 w-4" />}>
          Repasses e depósito
        </TabButton>
      </div>

      {/* ===== Aba Participantes ===== */}
      {tab === 'participants' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar publicador..."
                className="h-9 border-[#1E293B] bg-[#0F172A] pl-9 text-xs text-white"
              />
            </div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 text-xs text-white"
            >
              <option value="">Todos os grupos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {canEdit && groupFilter && (
              <Button
                variant="outline"
                onClick={() => selectWholeGroup(groupFilter)}
                className="h-9 border-[#1E293B] text-[11px] font-bold text-[#94A3B8] hover:text-white"
              >
                Selecionar grupo inteiro
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setAvulsoOpen(true)}
                className="h-9 gap-2 border-[#1E293B] text-[11px] font-bold text-[#94A3B8] hover:text-white"
              >
                <UserPlus className="h-4 w-4" /> Não é publicador
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0F172A]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="w-12 px-3 py-3">Vai</th>
                  <th className="px-3 py-3">Publicador</th>
                  <th className="px-3 py-3">Grupo</th>
                  <th className="px-3 py-3">Valor</th>
                  <th className="px-3 py-3">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {filteredPublishers.map((publisher) => {
                  const participant = participants.find((p) => p.publisherId === publisher.id);
                  return (
                    <tr key={publisher.id} className="border-b border-[#1E293B]/60 last:border-0 hover:bg-[#1E293B]/20">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(participant)}
                          disabled={!canEdit}
                          onChange={() => togglePublisher(publisher)}
                          className="h-4 w-4 accent-[#0EA5E9]"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-white">{fullName(publisher)}</td>
                      <td className="px-3 py-2 text-[#94A3B8]">{groupName(publisher.groupId) || '—'}</td>
                      <td className="px-3 py-2">
                        {participant ? (
                          <span className="font-bold text-[#0EA5E9]">
                            {formatBRL(participantDue(participant, selected?.seatPrice ?? 0))}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[#94A3B8]">{publisher.phone || publisher.secondaryPhone || '—'}</td>
                    </tr>
                  );
                })}
                {participants
                  .filter((p) => !p.publisherId)
                  .map((participant) => (
                    <tr key={participant.id} className="border-b border-[#1E293B]/60 last:border-0 bg-[#0EA5E9]/5">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked
                          disabled={!canEdit}
                          onChange={() => {
                            if (!canEdit) return;
                            saveArrangement({ participants: participants.filter((p) => p.id !== participant.id) });
                          }}
                          className="h-4 w-4 accent-[#0EA5E9]"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-white">
                        {participant.name}
                        <span className="ml-2 rounded bg-[#0EA5E9]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#0EA5E9]">
                          avulso
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#94A3B8]">—</td>
                      <td className="px-3 py-2 font-bold text-[#0EA5E9]">
                        {formatBRL(participantDue(participant, selected?.seatPrice ?? 0))}
                      </td>
                      <td className="px-3 py-2 text-[#94A3B8]">{participant.phone || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!filteredPublishers.length && (
              <p className="px-4 py-8 text-center text-xs text-[#64748B]">Nenhum publicador encontrado.</p>
            )}
          </div>
        </div>
      )}

      {/* ===== Aba Recebimentos ===== */}
      {tab === 'payments' && (
        <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0F172A]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-[#64748B]">
              <tr>
                <th className="px-3 py-3">Participante</th>
                <th className="px-3 py-3">Devido</th>
                <th className="px-3 py-3">Pago</th>
                <th className="px-3 py-3">Saldo</th>
                <th className="px-3 py-3">Situação</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => {
                const seatPrice = selected?.seatPrice ?? 0;
                const due = participantDue(participant, seatPrice);
                const paid = participantPaid(participant);
                const balance = participantBalance(participant, seatPrice);
                const status = participantStatus(participant, seatPrice);
                const inactive = participant.status === 'desistente';
                return (
                  <tr key={participant.id} className="border-b border-[#1E293B]/60 last:border-0 hover:bg-[#1E293B]/20">
                    <td className="px-3 py-2">
                      <p className="font-medium text-white">{participant.name}</p>
                      {inactive && (
                        <span className="text-[9px] font-bold uppercase text-[#64748B]">
                          desistente{participant.retained ? ' · valor retido' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#94A3B8]">{formatBRL(due)}</td>
                    <td className="px-3 py-2 text-white">{formatBRL(paid)}</td>
                    <td className={`px-3 py-2 font-bold ${balance > 0.005 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatBRL(balance)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {canEdit && !inactive && (
                          <Button
                            size="sm"
                            onClick={() => openPayment(participant)}
                            className="h-7 bg-[#0EA5E9] text-[10px] font-bold text-white hover:bg-[#0284C7]"
                          >
                            Receber
                          </Button>
                        )}
                        {canEdit && !inactive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDesistTarget(participant)}
                            className="h-7 border-[#1E293B] text-[10px] font-bold text-[#94A3B8] hover:text-red-400"
                          >
                            Desistiu
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!participants.length && (
            <p className="px-4 py-8 text-center text-xs text-[#64748B]">
              Nenhum participante ainda. Selecione na aba Participantes.
            </p>
          )}
        </div>
      )}

      {/* ===== Aba Repasses e depósito ===== */}
      {tab === 'cash' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Em mãos</p>
              <div className="space-y-2">
                {hands.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0B1220] px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{entry.name || userName(entry.id) || 'Responsável'}</p>
                      <p className="text-[10px] text-[#64748B]">
                        {entry.id === selected?.depositorId ? 'deposita no banco' : 'recebe dos participantes'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${entry.amount > 0.005 ? 'text-amber-400' : 'text-[#64748B]'}`}>
                        {formatBRL(entry.amount)}
                      </span>
                      {canEdit && entry.amount > 0.005 && entry.id !== selected?.depositorId && (
                        <Button
                          size="sm"
                          onClick={() => registerTransfer(entry)}
                          className="h-7 gap-1 bg-[#0EA5E9] text-[10px] font-bold text-white hover:bg-[#0284C7]"
                        >
                          <ArrowRightLeft className="h-3 w-3" /> Repassar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {canEdit && (
                <Button
                  onClick={openDeposit}
                  variant="outline"
                  className="mt-3 h-9 w-full gap-2 border-[#1E293B] text-[11px] font-bold text-[#94A3B8] hover:text-white"
                >
                  <Upload className="h-4 w-4" /> Registrar depósito
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                Histórico de documentos
              </p>
              <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                {ledger.map((entry) => (
                  <button
                    key={`${entry.kind}-${entry.receiptNo}`}
                    onClick={() => reprint(entry)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#1E293B]/40"
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-[11px] font-medium ${entry.canceled ? 'text-[#64748B] line-through' : 'text-white'}`}>
                        {entry.receiptNo} · {KIND_LABEL[entry.kind]}
                      </p>
                      <p className="truncate text-[10px] text-[#64748B]">
                        {entry.person} · {formatDateTimeBR(entry.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#94A3B8]">{formatBRL(entry.amount)}</span>
                      {entry.kind === 'DEP' && entry.depositId && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            viewPhoto(entry.depositId!);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              viewPhoto(entry.depositId!);
                            }
                          }}
                          className="text-[#0EA5E9]"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <Printer className="h-3.5 w-3.5 text-[#64748B]" />
                    </div>
                  </button>
                ))}
                {!ledger.length && (
                  <p className="py-6 text-center text-[11px] text-[#64748B]">Nenhum documento emitido ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* ===== Diálogo: criar/editar arranjo ===== */}
      <Dialog
        open={arrangementDialog.open}
        onOpenChange={(open) => setArrangementDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="bg-[#0F172A] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {arrangementDialog.edit ? 'Editar arranjo' : 'Novo arranjo de ônibus'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                Tipo de evento
              </Label>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {(['assembleia', 'congresso'] as BusEventType[]).map((type) => (
                  <label key={type} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.eventType === type}
                      onChange={() => setForm((prev) => ({ ...prev, eventType: type }))}
                      className="h-4 w-4 accent-[#0EA5E9]"
                    />
                    <span className="text-xs font-bold text-[#F1F5F9]">
                      {EVENT_TITLE[type]}
                      <span className="ml-1 font-medium text-[#64748B]">
                        ({type === 'assembleia' ? '1 dia' : '3 dias'})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-[#64748B]">
                No congresso a lista de passageiros sai com sexta, sábado e domingo.
              </p>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Assentos</Label>
              <Input
                type="number"
                value={form.seats}
                onChange={(e) => setForm((prev) => ({ ...prev, seats: Number(e.target.value) }))}
                className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Custo do ônibus (R$)</Label>
              <Input
                type="number"
                value={form.busTotal}
                onChange={(e) => {
                  const busTotal = Number(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    busTotal,
                    seatPrice: prev.seatPrice || suggestSeatPrice(busTotal, prev.seats),
                  }));
                }}
                className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Valor por assento (R$)</Label>
              <Input
                type="number"
                value={form.seatPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, seatPrice: Number(e.target.value) }))}
                className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
              />
              <p className="mt-1 text-[10px] text-[#64748B]">
                Sugestão: {formatBRL(suggestSeatPrice(form.busTotal, form.seats))} (arredonda para cima, para sobrar)
              </p>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                Quem recebe (Assistente)
              </Label>
              <select
                value={form.collectorId}
                onChange={(e) => setForm((prev) => ({ ...prev, collectorId: e.target.value }))}
                className="mt-1 h-8 w-full rounded-lg border border-[#1E293B] bg-[#0B1220] px-2 text-xs text-white"
              >
                <option value="">Selecione...</option>
                {responsibleOptions.collector.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {!responsibleOptions.collector.length && (
                <p className="mt-1 text-[10px] font-bold text-amber-400">
                  Nenhum Assistente designado em Publicadores.
                </p>
              )}
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                Quem deposita (Super. de ônibus)
              </Label>
              <select
                value={form.depositorId}
                onChange={(e) => setForm((prev) => ({ ...prev, depositorId: e.target.value }))}
                className="mt-1 h-8 w-full rounded-lg border border-[#1E293B] bg-[#0B1220] px-2 text-xs text-white"
              >
                <option value="">Selecione...</option>
                {responsibleOptions.depositor
                  .filter((option) => option.id !== form.collectorId)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
              </select>
              {!responsibleOptions.depositor.length && (
                <p className="mt-1 text-[10px] font-bold text-amber-400">
                  Nenhum Super. de ônibus designado em Publicadores.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-[#1E293B] bg-transparent">
            <Button
              variant="outline"
              onClick={() => setArrangementDialog({ open: false, edit: null })}
              className="h-9 border-[#1E293B] text-xs font-bold text-[#94A3B8]"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitArrangement}
              disabled={
                saving ||
                !responsibleOptions.collector.length ||
                !responsibleOptions.depositor.length ||
                !form.collectorId ||
                !form.depositorId
              }
              title="É preciso ter Assistente e Super. de ônibus designados e escolher os dois responsáveis"
              className="h-9 gap-2 bg-[#0EA5E9] text-xs font-bold text-white hover:bg-[#0284C7] disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: participante avulso ===== */}
      <Dialog open={avulsoOpen} onOpenChange={setAvulsoOpen}>
        <DialogContent className="bg-[#0F172A] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Quem não é publicador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Nome</Label>
              <Input
                value={avulsoForm.name}
                onChange={(e) => setAvulsoForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Telefone (opcional)</Label>
              <Input
                value={avulsoForm.phone}
                onChange={(e) => setAvulsoForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
              />
            </div>
          </div>
          <DialogFooter className="border-[#1E293B] bg-transparent">
            <Button variant="outline" onClick={() => setAvulsoOpen(false)} className="h-9 border-[#1E293B] text-xs font-bold text-[#94A3B8]">
              Cancelar
            </Button>
            <Button onClick={addAvulso} className="h-9 bg-[#0EA5E9] text-xs font-bold text-white hover:bg-[#0284C7]">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: receber pagamento ===== */}
      <Dialog open={Boolean(paymentTarget)} onOpenChange={(open) => !open && setPaymentTarget(null)}>
        <DialogContent className="bg-[#0F172A] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Receber de {paymentTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Valor recebido (R$)</Label>
              <Input
                value={payForm.amount}
                onChange={(e) => setPayForm((prev) => ({ ...prev, amount: e.target.value }))}
                inputMode="decimal"
                className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
              />
              {paymentTarget && (
                <p className="mt-1 text-[10px] text-[#64748B]">
                  Saldo atual: {formatBRL(participantBalance(paymentTarget, selected?.seatPrice ?? 0))}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Forma</Label>
              <select
                value={payForm.method}
                onChange={(e) => setPayForm((prev) => ({ ...prev, method: e.target.value as BusPaymentMethod }))}
                className="mt-1 h-8 w-full rounded-lg border border-[#1E293B] bg-[#0B1220] px-2 text-xs text-white"
              >
                {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Quem recebeu</Label>
              <select
                value={payForm.receivedById}
                onChange={(e) => setPayForm((prev) => ({ ...prev, receivedById: e.target.value }))}
                className="mt-1 h-8 w-full rounded-lg border border-[#1E293B] bg-[#0B1220] px-2 text-xs text-white"
              >
                {selected?.collectorId && (
                  <option value={selected.collectorId}>{selected.collectorName || userName(selected.collectorId)}</option>
                )}
                {(selected?.managers ?? [])
                  .filter((uid) => uid !== selected?.collectorId)
                  .map((uid) => (
                    <option key={uid} value={uid}>
                      {responsibleName(uid) || displayPerson(undefined, uid)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter className="border-[#1E293B] bg-transparent">
            <Button variant="outline" onClick={() => setPaymentTarget(null)} className="h-9 border-[#1E293B] text-xs font-bold text-[#94A3B8]">
              Cancelar
            </Button>
            <Button onClick={registerPayment} disabled={saving} className="h-9 bg-[#0EA5E9] text-xs font-bold text-white hover:bg-[#0284C7]">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: desistência ===== */}
      <Dialog open={Boolean(desistTarget)} onOpenChange={(open) => !open && setDesistTarget(null)}>
        <DialogContent className="bg-[#0F172A] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{desistTarget?.name} desistiu</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#94A3B8]">
            {desistTarget && participantPaid(desistTarget) > 0
              ? `Já pagou ${formatBRL(participantPaid(desistTarget))}. O que fazer com esse valor?`
              : 'Nenhum valor pago. O assento será liberado.'}
          </p>
          <DialogFooter className="flex-col gap-2 border-[#1E293B] bg-transparent sm:flex-col">
            {desistTarget && participantPaid(desistTarget) > 0 ? (
              <>
                <Button
                  onClick={() => markDesistente('refund')}
                  className="h-9 w-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                >
                  Devolver {formatBRL(participantPaid(desistTarget))} (gera comprovante)
                </Button>
                <Button
                  onClick={() => markDesistente('retain')}
                  variant="outline"
                  className="h-9 w-full border-[#1E293B] text-xs font-bold text-[#94A3B8]"
                >
                  Não devolver (valor fica no caixa)
                </Button>
              </>
            ) : (
              <Button
                onClick={() => markDesistente('remove')}
                className="h-9 w-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
              >
                Remover do arranjo
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDesistTarget(null)} className="h-9 w-full text-xs text-[#64748B]">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: depósito ===== */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="bg-[#0F172A] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar depósito</DialogTitle>
          </DialogHeader>
          {(() => {
            const depositor = hands.find((h) => h.id === selected?.depositorId);
            return (
              <div className="space-y-3">
                <div className="rounded-lg bg-[#0B1220] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#64748B]">Valor a depositar</p>
                  <p className="text-lg font-black text-[#0EA5E9]">{formatBRL(depositor?.amount ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-[#94A3B8]">
                    Depositante:{' '}
                    <span className="font-bold text-white">
                      {depositor?.name || nameOf(selected?.depositorId) || '—'}
                    </span>
                  </p>
                  <p className="text-[10px] text-[#64748B]">Nome de quem está com o valor em mãos.</p>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Referência / banco</Label>
                  <Input
                    value={depForm.bankRef}
                    onChange={(e) => setDepForm((prev) => ({ ...prev, bankRef: e.target.value }))}
                    placeholder="Comprovante, agência, data..."
                    className="mt-1 border-[#1E293B] bg-[#0B1220] text-xs text-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                    Foto do comprovante (obrigatória)
                  </Label>
                  <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#1E293B] bg-[#0B1220] px-3 py-4 text-[11px] text-[#94A3B8] hover:border-[#0EA5E9]">
                    {depForm.processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Processando foto...
                      </>
                    ) : depForm.photo ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Foto anexada — toque para trocar
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Anexar foto do comprovante
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhoto(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="border-[#1E293B] bg-transparent">
            <Button variant="outline" onClick={() => setDepositOpen(false)} className="h-9 border-[#1E293B] text-xs font-bold text-[#94A3B8]">
              Cancelar
            </Button>
            <Button onClick={registerDeposit} disabled={saving} className="h-9 bg-[#0EA5E9] text-xs font-bold text-white hover:bg-[#0284C7]">
              Confirmar depósito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: recibo emitido ===== */}
      <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="bg-[#0F172A] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {receipt ? `${KIND_LABEL[receipt.kind]} registrado` : ''}
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-1 rounded-lg bg-[#0B1220] px-3 py-3 text-xs">
              <p className="font-bold text-white">{receipt.receiptNo}</p>
              <p className="text-[#94A3B8]">Valor: {formatBRL(receipt.amount)}</p>
              <p className="text-[#64748B]">
                Código de autenticação: <span className="font-bold text-[#0EA5E9]">{receipt.authCode}</span>
              </p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 border-[#1E293B] bg-transparent sm:flex-col">
            <Button
              onClick={() => receipt && runReceipt(receipt, 'whatsapp')}
              className="h-9 w-full gap-2 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
            </Button>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => receipt && runReceipt(receipt, 'download')}
                className="h-9 flex-1 gap-2 border-[#1E293B] text-xs font-bold text-[#94A3B8]"
              >
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => receipt && runReceipt(receipt, 'print')}
                className="h-9 flex-1 gap-2 border-[#1E293B] text-xs font-bold text-[#94A3B8]"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: foto do comprovante ===== */}
      <Dialog open={Boolean(photoView)} onOpenChange={(open) => !open && setPhotoView(null)}>
        <DialogContent className="bg-[#0F172A] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Comprovante do depósito</DialogTitle>
          </DialogHeader>
          {photoView && <img src={photoView} alt="Comprovante" className="max-h-[60vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
      {hint && (
        <p className={`mt-0.5 text-[10px] font-medium ${tone === 'warn' ? 'text-amber-400' : tone === 'ok' ? 'text-emerald-400' : 'text-[#64748B]'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
        active ? 'bg-[#0EA5E9]/10 text-[#0EA5E9]' : 'text-[#64748B] hover:text-[#F1F5F9]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
