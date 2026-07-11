'use client';

import React, { useState, useEffect } from 'react';
import { Printer, FileText, Download, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { MeetingPreviewModal, MidweekPreviewData, WeekendPreviewData } from '@/components/meeting-preview-modal';
import { SchoolPreviewModal } from '@/components/school-preview-modal';
import { S21BatchPreviewModal } from '@/components/s21-batch-preview-modal';

const getMondayFromDate = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
};

const getMondayStr = (d: Date): string => {
  const monday = getMondayFromDate(d);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayNum = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
};

const weekRangeStr = (monday: string): string => {
  const d = new Date(monday + 'T12:00:00');
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' });
  return `${fmt(d)} – ${fmt(end)}`;
};

const weekRangeShort = (monday: string): string => {
  const d = new Date(monday + 'T12:00:00');
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' });
  return `${fmt(d)} - ${fmt(end)}`;
};

export function PrintsView() {
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [showSchool, setShowSchool] = useState(false);
  const [schoolCards, setSchoolCards] = useState<any[]>([]);
  const [midweekData, setMidweekData] = useState<MidweekPreviewData | null>(null);
  const [weekendData, setWeekendData] = useState<WeekendPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSchoolLoading, setIsSchoolLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSchoolDate, setSelectedSchoolDate] = useState('');
  const [showS21Batch, setShowS21Batch] = useState(false);
  const [s21BatchItems, setS21BatchItems] = useState<any[]>([]);
  const [s21BatchTitle, setS21BatchTitle] = useState('');
  const [s21PublisherList, setS21PublisherList] = useState<any[]>([]);
  const [s21GroupList, setS21GroupList] = useState<any[]>([]);
  const [selectedS21Publisher, setSelectedS21Publisher] = useState('');
  const [selectedS21Group, setSelectedS21Group] = useState('');
  const [isS21Loading, setIsS21Loading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubPubs = onSnapshot(collection(db, 'publishers'), (snap) => {
      setS21PublisherList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      setS21GroupList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubPubs(); unsubGroups(); };
  }, [user]);

  const loadSchoolData = async () => {
    if (!user || !selectedSchoolDate) return;
    setIsSchoolLoading(true);
    const mondayStr = getMondayStr(new Date(selectedSchoolDate + 'T12:00:00'));
    try {
      const midSnap = await getDoc(doc(db, 'midweek_meetings', mondayStr));
      const d = midSnap.data() || {};
      const f = (v?: string) => v || '';
      const weekData = weekRangeShort(mondayStr);

      const cards: any[] = [];

      // Card 1 - Leitor da Bíblia
      if (f(d.bibleReadingReader)) {
        cards.push({
          nome: f(d.bibleReadingReader),
          ajudante: '',
          data: weekData,
          numeroParte: '',
          salaoPrincipal: '',
          salaB: '',
          salaC: '',
        });
      }

      // Card 2 - Parte 1
      if (f(d.part1Speaker)) {
        cards.push({
          nome: f(d.part1Speaker),
          ajudante: [f(d.part1Assistant), f(d.part1SecondHelper)].filter(Boolean).join(' / '),
          data: weekData,
          numeroParte: f(d.part1Theme),
          salaoPrincipal: '',
          salaB: '',
          salaC: '',
        });
      }

      // Card 3 - Parte 2
      if (f(d.part2Speaker)) {
        cards.push({
          nome: f(d.part2Speaker),
          ajudante: [f(d.part2Assistant), f(d.part2SecondHelper)].filter(Boolean).join(' / '),
          data: weekData,
          numeroParte: f(d.part2Theme),
          salaoPrincipal: '',
          salaB: '',
          salaC: '',
        });
      }

      // Card 4 - Parte 3
      if (f(d.part3Speaker)) {
        cards.push({
          nome: f(d.part3Speaker),
          ajudante: [f(d.part3Assistant), f(d.part3SecondHelper)].filter(Boolean).join(' / '),
          data: weekData,
          numeroParte: f(d.part3Theme),
          salaoPrincipal: '',
          salaB: '',
          salaC: '',
        });
      }

      // Extra page - Parte 4 goes to Card 1 of a new page
      if (f(d.part4Speaker)) {
        cards.push({
          nome: f(d.part4Speaker),
          ajudante: [f(d.part4Assistant), f(d.part4SecondHelper)].filter(Boolean).join(' / '),
          data: weekData,
          numeroParte: f(d.part4Theme),
          salaoPrincipal: '',
          salaB: '',
          salaC: '',
        });
      }

      if (cards.length === 0) {
        toast.error('Nenhuma designação encontrada para esta semana.');
        return;
      }

      setSchoolCards(cards);
      setShowSchool(true);
    } catch (err) {
      console.error('Error loading school data:', err);
      toast.error('Erro ao carregar designações.');
    } finally {
      setIsSchoolLoading(false);
    }
  };

  const loadMeetingData = async () => {
    if (!user || !selectedDate) return;
    setIsLoading(true);
    const mondayStr = getMondayStr(new Date(selectedDate + 'T12:00:00'));

    try {
      const [midSnap, wendSnap] = await Promise.all([
        getDoc(doc(db, 'midweek_meetings', mondayStr)),
        getDoc(doc(db, 'weekend_meetings', mondayStr)),
      ]);

      const fallback = (val?: string) => val || '';

      const midData: MidweekPreviewData = {
        weekRange: weekRangeStr(mondayStr),
        president: fallback(midSnap.data()?.president),
        openingPrayer: fallback(midSnap.data()?.openingPrayer),
        closingPrayer: fallback(midSnap.data()?.closingPrayer),
        talkSpeaker: fallback(midSnap.data()?.talkSpeaker),
        talkTheme: fallback(midSnap.data()?.talkTheme),
        gemsSpeaker: fallback(midSnap.data()?.gemsSpeaker),
        bibleReadingReader: fallback(midSnap.data()?.bibleReadingReader),
        part1Theme: fallback(midSnap.data()?.part1Theme), part1Speaker: fallback(midSnap.data()?.part1Speaker),
        part1Assistant: fallback(midSnap.data()?.part1Assistant), part1SecondHelper: fallback(midSnap.data()?.part1SecondHelper),
        part2Theme: fallback(midSnap.data()?.part2Theme), part2Speaker: fallback(midSnap.data()?.part2Speaker),
        part2Assistant: fallback(midSnap.data()?.part2Assistant), part2SecondHelper: fallback(midSnap.data()?.part2SecondHelper),
        part3Theme: fallback(midSnap.data()?.part3Theme), part3Speaker: fallback(midSnap.data()?.part3Speaker),
        part3Assistant: fallback(midSnap.data()?.part3Assistant), part3SecondHelper: fallback(midSnap.data()?.part3SecondHelper),
        part4Theme: fallback(midSnap.data()?.part4Theme), part4Speaker: fallback(midSnap.data()?.part4Speaker),
        part4Assistant: fallback(midSnap.data()?.part4Assistant), part4SecondHelper: fallback(midSnap.data()?.part4SecondHelper),
        lifePart1Theme: fallback(midSnap.data()?.lifePart1Theme), lifePart1Speaker: fallback(midSnap.data()?.lifePart1Speaker),
        lifePart2Theme: fallback(midSnap.data()?.lifePart2Theme), lifePart2Speaker: fallback(midSnap.data()?.lifePart2Speaker),
        lifePart3Theme: fallback(midSnap.data()?.lifePart3Theme), lifePart3Speaker: fallback(midSnap.data()?.lifePart3Speaker),
        cbsConductor: fallback(midSnap.data()?.cbsConductor), cbsReader: fallback(midSnap.data()?.cbsReader),
        mechanicalIndicador1: fallback(midSnap.data()?.mechanicalIndicador1),
        mechanicalIndicador2: fallback(midSnap.data()?.mechanicalIndicador2),
        mechanicalMicrofone1: fallback(midSnap.data()?.mechanicalMicrofone1),
        mechanicalMicrofone2: fallback(midSnap.data()?.mechanicalMicrofone2),
        mechanicalPalco: fallback(midSnap.data()?.mechanicalPalco),
        mechanicalAudioVideo: fallback(midSnap.data()?.mechanicalAudioVideo),
      };

      const wendDoc = wendSnap.data() || {};
      const wendData: WeekendPreviewData = {
        president: fallback(wendDoc.president),
        openingPrayer: fallback(wendDoc.openingPrayer),
        closingPrayer: fallback(wendDoc.closingPrayer),
        localSpeaker: fallback(wendDoc.localSpeaker),
        visitingSpeaker: fallback(wendDoc.visitingSpeaker),
        talkTheme: fallback(wendDoc.talkTheme),
        watchtowerConductor: fallback(wendDoc.watchtowerConductor),
        watchtowerReader: fallback(wendDoc.watchtowerReader),
        mechanicalIndicador1: fallback(wendDoc.mechanicalIndicador1),
        mechanicalIndicador2: fallback(wendDoc.mechanicalIndicador2),
        mechanicalMicrofone1: fallback(wendDoc.mechanicalMicrofone1),
        mechanicalMicrofone2: fallback(wendDoc.mechanicalMicrofone2),
        mechanicalPalco: fallback(wendDoc.mechanicalPalco),
        mechanicalAudioVideo: fallback(wendDoc.mechanicalAudioVideo),
      };

      setMidweekData(midData);
      setWeekendData(wendData);
      setShowPreview(true);
    } catch (error) {
      console.error("Error loading meeting data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const serviceStartYear = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const serviceYearStr = `${serviceStartYear}/${serviceStartYear + 1}`;
  const serviceMonths = [
    { index: 0, name: "Setembro", year: serviceStartYear, month: 8 },
    { index: 1, name: "Outubro", year: serviceStartYear, month: 9 },
    { index: 2, name: "Novembro", year: serviceStartYear, month: 10 },
    { index: 3, name: "Dezembro", year: serviceStartYear, month: 11 },
    { index: 4, name: "Janeiro", year: serviceStartYear + 1, month: 0 },
    { index: 5, name: "Fevereiro", year: serviceStartYear + 1, month: 1 },
    { index: 6, name: "Março", year: serviceStartYear + 1, month: 2 },
    { index: 7, name: "Abril", year: serviceStartYear + 1, month: 3 },
    { index: 8, name: "Maio", year: serviceStartYear + 1, month: 4 },
    { index: 9, name: "Junho", year: serviceStartYear + 1, month: 5 },
    { index: 10, name: "Julho", year: serviceStartYear + 1, month: 6 },
    { index: 11, name: "Agosto", year: serviceStartYear + 1, month: 7 },
  ];

  const fetchPublisherS21 = async (publisher: any): Promise<{ publisher: any; s21Data: Record<string, any> }> => {
    const s21Data: Record<string, any> = {};
    await Promise.all(serviceMonths.map(async (sm) => {
      const docId = `${sm.year}-${String(sm.month + 1).padStart(2, '0')}`;
      const snap = await getDoc(doc(db, 'field_reports', publisher.id, 'months', docId));
      if (snap.exists()) {
        s21Data[docId] = snap.data();
      }
    }));
    return { publisher, s21Data };
  };

  const loadS21All = async () => {
    if (!user) return;
    setIsS21Loading(true);
    try {
      const q = query(collection(db, 'publishers'), where('status', '==', 'ativo'));
      const snap = await getDocs(q);
      const publishers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const items = await Promise.all(publishers.map(fetchPublisherS21));
      setS21BatchItems(items);
      setS21BatchTitle('Cartões S-21 — Todos os Publicadores');
      setShowS21Batch(true);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados dos publicadores.');
    } finally {
      setIsS21Loading(false);
    }
  };

  const loadS21Publisher = async () => {
    if (!user || !selectedS21Publisher) return;
    setIsS21Loading(true);
    try {
      const pub = s21PublisherList.find((p: any) => p.id === selectedS21Publisher);
      if (!pub) return;
      const item = await fetchPublisherS21(pub);
      setS21BatchItems([item]);
      setS21BatchTitle(`Cartão S-21 — ${pub.firstName} ${pub.lastName}`);
      setShowS21Batch(true);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do publicador.');
    } finally {
      setIsS21Loading(false);
    }
  };

  const loadS21Group = async () => {
    if (!user || !selectedS21Group) return;
    setIsS21Loading(true);
    try {
      const q = query(collection(db, 'publishers'), where('groupId', '==', selectedS21Group), where('status', '==', 'ativo'));
      const snap = await getDocs(q);
      const publishers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const items = await Promise.all(publishers.map(fetchPublisherS21));
      const groupName = s21GroupList.find((g: any) => g.id === selectedS21Group)?.name || selectedS21Group;
      setS21BatchItems(items);
      setS21BatchTitle(`Cartões S-21 — Grupo: ${groupName}`);
      setShowS21Batch(true);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do grupo.');
    } finally {
      setIsS21Loading(false);
    }
  };

  return (
    <div className="min-h-0">
      <div className="space-y-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">Impressões</h1>
            <p className="text-[#94A3B8] font-bold">Documentos e formulários oficiais da organização.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden group hover:border-[#0EA5E9]/30 transition-all">
            <CardContent className="p-8">
              <div className="flex items-center gap-8 mb-6">
                <div className="h-20 w-20 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center group-hover:bg-[#0EA5E9]/10 transition-colors shrink-0">
                  <Printer className="h-10 w-10 text-[#64748B] group-hover:text-[#0EA5E9] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-white">Quadro de Anúncios</h3>
                  <p className="text-[#94A3B8] font-bold text-sm">Designações da Semana</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-12 bg-[#1E293B]/50 border border-[#334155] rounded-xl text-white text-sm font-bold px-4 focus:outline-none focus:border-[#0EA5E9] [color-scheme:dark]"
                  />
                  {selectedDate && (
                    <p className="text-[10px] text-[#0EA5E9] font-bold mt-1.5 px-1">
                      Semana de {weekRangeShort(getMondayStr(new Date(selectedDate + 'T12:00:00')))}
                    </p>
                  )}
                </div>
                <Button
                  onClick={loadMeetingData}
                  disabled={!selectedDate || isLoading}
                  className="h-12 bg-[#0EA5E9] hover:bg-blue-600 text-white font-bold rounded-xl px-6 gap-2 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  Visualizar Impressão
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden group hover:border-[#0EA5E9]/30 transition-all">
            <CardContent className="p-8">
              <div className="flex items-center gap-8 mb-6">
                <div className="h-20 w-20 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center group-hover:bg-[#0EA5E9]/10 transition-colors shrink-0">
                  <FileText className="h-10 w-10 text-[#64748B] group-hover:text-[#0EA5E9] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-white">Designação Escola</h3>
                  <p className="text-[#94A3B8] font-bold text-sm">Leitor da Bíblia e Partes do Ministério</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={selectedSchoolDate}
                    onChange={(e) => setSelectedSchoolDate(e.target.value)}
                    className="w-full h-12 bg-[#1E293B]/50 border border-[#334155] rounded-xl text-white text-sm font-bold px-4 focus:outline-none focus:border-[#0EA5E9] [color-scheme:dark]"
                  />
                  {selectedSchoolDate && (
                    <p className="text-[10px] text-[#0EA5E9] font-bold mt-1.5 px-1">
                      Semana de {weekRangeShort(getMondayStr(new Date(selectedSchoolDate + 'T12:00:00')))}
                    </p>
                  )}
                </div>
                <Button
                  onClick={loadSchoolData}
                  disabled={!selectedSchoolDate || isSchoolLoading}
                  className="h-12 bg-[#0EA5E9] hover:bg-blue-600 text-white font-bold rounded-xl px-6 gap-2 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isSchoolLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  Visualizar Impressão
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden group hover:border-[#0EA5E9]/30 transition-all">
            <CardContent className="p-8">
              <div className="flex items-center gap-8 mb-6">
                <div className="h-20 w-20 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center group-hover:bg-[#0EA5E9]/10 transition-colors shrink-0">
                  <Download className="h-10 w-10 text-[#64748B] group-hover:text-[#0EA5E9] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-white">Lista de Grupos</h3>
                  <p className="text-[#94A3B8] font-bold text-sm">Arranjos de Serviço de Campo</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={selectedS21Group}
                      onChange={(e) => setSelectedS21Group(e.target.value)}
                      className="w-full h-12 bg-[#1E293B]/50 border border-[#334155] rounded-xl text-white text-sm font-bold px-4 focus:outline-none focus:border-[#0EA5E9]"
                    >
                      <option value="">Selecionar Grupo</option>
                      {s21GroupList.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name || g.id}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={loadS21Group}
                    disabled={!selectedS21Group || isS21Loading}
                    className="h-12 bg-[#0EA5E9] hover:bg-blue-600 text-white font-bold rounded-xl px-5 gap-2 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {isS21Loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Visualizar
                  </Button>
                </div>
                <Button
                  onClick={loadS21All}
                  disabled={isS21Loading}
                  className="w-full h-12 bg-[#1E293B]/80 hover:bg-[#334155] text-white font-bold rounded-xl px-5 gap-2 transition-all disabled:opacity-40"
                >
                  {isS21Loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  Visualizar Todos os Grupos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden group hover:border-[#0EA5E9]/30 transition-all">
            <CardContent className="p-8">
              <div className="flex items-center gap-8 mb-6">
                <div className="h-20 w-20 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center group-hover:bg-[#0EA5E9]/10 transition-colors shrink-0">
                  <Users className="h-10 w-10 text-[#64748B] group-hover:text-[#0EA5E9] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-white">Cartões S-21</h3>
                  <p className="text-[#94A3B8] font-bold text-sm">Cartão de Registro de Publicador</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={selectedS21Publisher}
                      onChange={(e) => { setSelectedS21Publisher(e.target.value); setSelectedS21Group(''); }}
                      className="w-full h-12 bg-[#1E293B]/50 border border-[#334155] rounded-xl text-white text-sm font-bold px-4 focus:outline-none focus:border-[#0EA5E9]"
                    >
                      <option value="">Selecionar Publicador</option>
                      {s21PublisherList
                        .filter((p: any) => p.status === 'ativo')
                        .sort((a: any, b: any) => (a.firstName || '').localeCompare(b.firstName || ''))
                        .map((p: any) => (
                          <option key={p.id} value={p.id}>{[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}</option>
                        ))}
                    </select>
                  </div>
                  <Button
                    onClick={loadS21Publisher}
                    disabled={!selectedS21Publisher || isS21Loading}
                    className="h-12 bg-[#0EA5E9] hover:bg-blue-600 text-white font-bold rounded-xl px-5 gap-2 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {isS21Loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Visualizar
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={selectedS21Group}
                      onChange={(e) => { setSelectedS21Group(e.target.value); setSelectedS21Publisher(''); }}
                      className="w-full h-12 bg-[#1E293B]/50 border border-[#334155] rounded-xl text-white text-sm font-bold px-4 focus:outline-none focus:border-[#0EA5E9]"
                    >
                      <option value="">Selecionar Grupo</option>
                      {s21GroupList.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name || g.id}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={loadS21Group}
                    disabled={!selectedS21Group || isS21Loading}
                    className="h-12 bg-[#0EA5E9] hover:bg-blue-600 text-white font-bold rounded-xl px-5 gap-2 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {isS21Loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Visualizar
                  </Button>
                </div>
                <Button
                  onClick={loadS21All}
                  disabled={isS21Loading}
                  className="w-full h-12 bg-[#1E293B]/80 hover:bg-[#334155] text-white font-bold rounded-xl px-5 gap-2 transition-all disabled:opacity-40"
                >
                  {isS21Loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
                  Visualizar Todos os Publicadores
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden group hover:border-[#0EA5E9]/30 transition-all opacity-50">
            <CardContent className="p-8 flex items-center gap-8">
              <div className="h-20 w-20 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center">
                <FileText className="h-10 w-10 text-[#64748B]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white">Formulário S-1</h3>
                <p className="text-[#94A3B8] font-bold text-sm">Relatório de Congregação</p>
              </div>
              <Button size="icon" variant="ghost" disabled className="h-12 w-12 rounded-2xl">
                <Printer className="h-6 w-6 text-[#475569]" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPreview && midweekData && weekendData && (
        <MeetingPreviewModal
          midweek={midweekData}
          weekend={weekendData}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showSchool && schoolCards.length > 0 && (
        <SchoolPreviewModal
          cards={schoolCards}
          onClose={() => setShowSchool(false)}
        />
      )}

      {showS21Batch && s21BatchItems.length > 0 && (
        <S21BatchPreviewModal
          items={s21BatchItems}
          serviceYear={serviceYearStr}
          title={s21BatchTitle}
          onClose={() => setShowS21Batch(false)}
        />
      )}
    </div>
  );
}
