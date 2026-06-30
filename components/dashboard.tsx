'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  FileText,
  Calendar,
  BookOpen,
  AlertCircle,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, getDoc, getDocs, setDoc, updateDoc, where } from 'firebase/firestore';
import { toast } from 'sonner';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

interface PublisherSummary {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  groupId: string;
  pioneerType: string;
  phone: string;
  designations: string[];
}

interface GroupSummary {
  id: string;
  name: string;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [publishers, setPublishers] = useState<PublisherSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [missingReports, setMissingReports] = useState<Set<string>>(new Set());
  const [statsCount, setStatsCount] = useState({ active: 0, totalStudies: 0, totalHours: 0, regularPioneers: 0, auxiliaryPioneers: 0 });
  const [reportStats, setReportStats] = useState({
    whoReported: 0,
    whoReported6Months: 0,
    pubStudies: 0,
    regPioneerReports: 0, regPioneerHours: 0, regPioneerStudies: 0,
    auxPioneerReports: 0, auxPioneerHours: 0, auxPioneerStudies: 0,
  });
  const [avgAttendance, setAvgAttendance] = useState<number | null>(null);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [closedMonths, setClosedMonths] = useState<string[]>([]);
  const [isClosingMonth, setIsClosingMonth] = useState(false);
  const hasAutoAdvanced = useRef(false);

  const MONTHS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentDocId = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = `${MONTHS[prevMonth.getMonth()]}/${prevMonth.getFullYear()}`;
  const serviceStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const serviceYear = `${serviceStartYear}/${serviceStartYear + 1}`;

  useEffect(() => {
    if (currentDocId && !selectedMonthId) {
      setSelectedMonthId(currentDocId);
    }
  }, [currentDocId, selectedMonthId]);

  useEffect(() => {
    if (!user) return;

    const unsubPubs = onSnapshot(
      query(collection(db, 'publishers')),
      (snapshot: any) => {
        const pubs = snapshot.docs.map((d: any) => ({
          id: d.id,
          firstName: d.data().firstName || '',
          lastName: d.data().lastName || '',
          status: d.data().status || 'ativo',
          groupId: d.data().groupId || '',
          pioneerType: d.data().pioneerType || 'nao',
          phone: d.data().phone || '',
          designations: d.data().designations || [],
        })).sort((a: any, b: any) => (a.firstName || '').localeCompare(b.firstName || ''));
        setPublishers(pubs);

        const active = pubs.filter(p => p.status === 'ativo');
        setStatsCount(prev => ({
          ...prev,
          active: active.length,
          regularPioneers: pubs.filter(p => p.pioneerType === 'regular').length,
          auxiliaryPioneers: active.filter(p => p.pioneerType === 'auxiliar').length,
        }));
      }
    );

    const unsubGroups = onSnapshot(
      query(collection(db, 'groups')),
      (snapshot: any) => {
        const gs = snapshot.docs.map((d: any) => ({ id: d.id, name: d.data().name || '' }));
        setGroups(gs);
      }
    );

    return () => { unsubPubs(); unsubGroups(); };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedMonthId) return;
    let active = true;

    // Reset data immediately when month changes
    setMissingReports(new Set());
    setAvgAttendance(null);
    setStatsCount({ active: 0, totalStudies: 0, totalHours: 0, regularPioneers: 0, auxiliaryPioneers: 0 });
    setReportStats({ whoReported: 0, whoReported6Months: 0, pubStudies: 0, regPioneerReports: 0, regPioneerHours: 0, regPioneerStudies: 0, auxPioneerReports: 0, auxPioneerHours: 0, auxPioneerStudies: 0 });

    const fetchCurrentReport = async () => {
      try {
        const docRef = doc(db, 'field_reports', selectedMonthId);
        const docSnap = await getDoc(docRef);
        if (!active) return;
        const reports: Record<string, any> = docSnap.exists() ? (docSnap.data().reports || {}) : {};

        const activePubs = publishers.filter(p => p.status === 'ativo');
        const missing = new Set<string>();
        let totalHours = 0;
        let totalStudies = 0;
        let whoReported = 0, pubStudies = 0;
        let regPioneerReports = 0, regPioneerHours = 0, regPioneerStudies = 0;
        let auxPioneerReports = 0, auxPioneerHours = 0, auxPioneerStudies = 0;

        for (const p of activePubs) {
          const entry = reports[p.id];
          if (!entry) {
            missing.add(p.id);
          } else {
            whoReported++;
            const horas = parseInt(entry.horas, 10) || 0;
            const estudos = parseInt(entry.estudos, 10) || 0;
            totalHours += horas;
            totalStudies += estudos;
            if (p.pioneerType === 'regular') {
              regPioneerReports++;
              regPioneerHours += horas;
              regPioneerStudies += estudos;
            } else if (p.pioneerType === 'auxiliar') {
              auxPioneerReports++;
              auxPioneerHours += horas;
              auxPioneerStudies += estudos;
            } else {
              pubStudies += estudos;
            }
          }
        }

        if (!active) return;
        setMissingReports(missing);
        setStatsCount({ active: activePubs.length, totalHours, totalStudies, regularPioneers: 0, auxiliaryPioneers: 0 });
        setReportStats({ whoReported, whoReported6Months: 0, pubStudies, regPioneerReports, regPioneerHours, regPioneerStudies, auxPioneerReports, auxPioneerHours, auxPioneerStudies });
      } catch (error) {
        if (!active) return;
        console.error("Error fetching current report:", error);
      }
    };
    fetchCurrentReport();

    // Fetch last 6 months to compute how many publishers reported at least once
    const fetchLast6Months = async () => {
      try {
        const activePubIds = new Set(publishers.filter(p => p.status === 'ativo').map(p => p.id));
        const reportedIds = new Set<string>();
        for (let i = 0; i < 6; i++) {
          const d = new Date(prevMonth.getFullYear(), prevMonth.getMonth() - i, 1);
          const docId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const snap = await getDoc(doc(db, 'field_reports', docId));
          if (!active) return;
          if (snap.exists()) {
            const reps = snap.data().reports || {};
            for (const pid of Object.keys(reps)) {
              if (activePubIds.has(pid)) reportedIds.add(pid);
            }
          }
        }
        if (!active) return;
        setReportStats(prev => ({ ...prev, whoReported6Months: reportedIds.size }));
      } catch (e) {
        if (!active) return;
        console.error("Error fetching 6 months:", e);
      }
    };
    fetchLast6Months();

    // Fetch weekend attendance
    const fetchAttendance = async () => {
      try {
        const attDoc = doc(db, 'attendance', selectedMonthId);
        const attSnap = await getDoc(attDoc);
        if (!active) return;
        if (attSnap.exists()) {
          const data = attSnap.data();
          const weekendDay = data.weekendDay !== undefined ? data.weekendDay : 6;
          const presencial = data.weekend?.presencial || {};
          const conectados = data.weekend?.conectados || {};

          const getDaysInMonth = (year: number, month: number, targetDayOfWeek: number): string[] => {
            const dates: string[] = [];
            const date = new Date(year, month, 1);
            while (date.getMonth() === month) {
              if (date.getDay() === targetDayOfWeek) {
                dates.push(`${date.getDate()}/${month}`);
              }
              date.setDate(date.getDate() + 1);
            }
            return dates;
          };

          const [year, month] = selectedMonthId.split('-').map(Number);
          const activeWeeks = getDaysInMonth(year, month - 1, weekendDay).length;
          const weekKeys = ['w1', 'w2', 'w3', 'w4', 'w5'];
          let total = 0;

          for (let i = 0; i < activeWeeks; i++) {
            const w = weekKeys[i];
            const p = parseInt(presencial[w]) || 0;
            const c = parseInt(conectados[w]) || 0;
            total += p + c;
          }

          if (!active) return;
          if (activeWeeks > 0) {
            setAvgAttendance(Math.round(total / activeWeeks));
          }
        }
      } catch (e) {
        if (!active) return;
        console.error("Error fetching attendance:", e);
      }
    };
    fetchAttendance();

    return () => { active = false; };
  }, [user, selectedMonthId, publishers]);

  // Fetch closed months list
  useEffect(() => {
    if (!user) return;
    const fetchClosed = async () => {
      try {
        const q = query(collection(db, 'field_reports'), where('closed', '==', true));
        const snap = await getDocs(q);
        const ids = snap.docs.map(d => d.id).sort();
        setClosedMonths(ids);
        // Auto-avança apenas uma vez na carga inicial se o mês padrão já estiver fechado
        if (!hasAutoAdvanced.current && selectedMonthId === currentDocId && ids.includes(selectedMonthId)) {
          hasAutoAdvanced.current = true;
          setSelectedMonthId(getNextMonthId(selectedMonthId));
        }
      } catch (e) {
        console.error("Error fetching closed months:", e);
      }
    };
    fetchClosed();
  }, [user, selectedMonthId]);

  const getMonthLabel = (docId: string) => {
    const [y, m] = docId.split('-').map(Number);
    return `${MONTHS[m - 1]}/${y}`;
  };

  const getNextMonthId = (docId: string) => {
    const [y, m] = docId.split('-').map(Number);
    const next = new Date(y, m - 1, 1);
    next.setMonth(next.getMonth() + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleCloseMonth = async () => {
    if (!user || !selectedMonthId || isClosingMonth) return;
    setIsClosingMonth(true);
    try {
      const docRef = doc(db, 'field_reports', selectedMonthId);
      await setDoc(docRef, { closed: true }, { merge: true });
      // Avança para o próximo mês
      const nextMonth = getNextMonthId(selectedMonthId);
      setSelectedMonthId(nextMonth);
      toast.success(`Mês ${getMonthLabel(selectedMonthId)} fechado com sucesso!`);
    } catch (e) {
      console.error("Error closing month:", e);
      toast.error("Erro ao fechar mês.");
    } finally {
      setIsClosingMonth(false);
    }
  };

  const activePublishers = publishers.filter(p => p.status === 'ativo');
  const ungroupedIds = groups.map(g => g.id);
  const publishersByGroup = groups.map(group => ({
    group,
    publishers: activePublishers.filter(p => p.groupId === group.id && missingReports.has(p.id)),
  }));
  const ungroupedMissing = activePublishers.filter(p => (!p.groupId || !ungroupedIds.includes(p.groupId)) && missingReports.has(p.id));
  const [checkingIn, setCheckingIn] = useState<Set<string>>(new Set());

  const handleQuickCheckin = useCallback(async (publisherId: string) => {
    if (!user) return;
    setCheckingIn(prev => new Set(prev).add(publisherId));
    try {
      const docRef = doc(db, 'field_reports', selectedMonthId);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};
      const reports = existingData.reports || {};
      reports[publisherId] = { participou: true, estudos: '', auxiliar: false, horas: '', observacao: '' };
      const [y, m] = selectedMonthId.split('-').map(Number);
      await setDoc(docRef, {
        ...existingData,
        reports,
        month: m - 1,
        year: y,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setMissingReports(prev => {
        const next = new Set(prev);
        next.delete(publisherId);
        return next;
      });
      const pub = publishers.find(p => p.id === publisherId);
      if (pub?.pioneerType === 'regular') {
        toast.info(`${pub.firstName} ${pub.lastName} é pioneiro regular — lembre-se de preencher horas e estudos no relatório completo!`, { duration: 5000 });
      } else {
        toast.success(`${pub?.firstName} ${pub?.lastName} lançado com participação!`);
      }
    } catch (error) {
      console.error("Quick checkin error:", error);
      toast.error("Erro ao lançar participação.");
    } finally {
      setCheckingIn(prev => {
        const next = new Set(prev);
        next.delete(publisherId);
        return next;
      });
    }
  }, [user, selectedMonthId, publishers, prevMonth]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-[#94A3B8] mt-0.5">Congregação Jardim Califórnia — Visão Geral</p>
        </div>
      </div>

      <Card className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#1E293B] px-5 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-semibold text-white">Relatório Mensal — {selectedMonthId ? getMonthLabel(selectedMonthId) : currentMonthLabel}</CardTitle>
          <div className="flex gap-2">
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="h-8 px-3 text-[11px] bg-[#1E293B] border border-[#334155] text-[#94A3B8] rounded-lg focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value={selectedMonthId}>{getMonthLabel(selectedMonthId)}{closedMonths.includes(selectedMonthId) ? ' (fechado)' : ''}</option>
              {[...new Set([...closedMonths, currentDocId])].filter(id => id !== selectedMonthId).map(id => (
                <option key={id} value={id}>{getMonthLabel(id)}{closedMonths.includes(id) ? ' (fechado)' : ''}</option>
              ))}
            </select>
            {!closedMonths.includes(selectedMonthId) && (
              <Button
                onClick={handleCloseMonth}
                disabled={isClosingMonth || !selectedMonthId}
                className="h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-medium rounded-lg text-[11px] px-4"
              >
                {isClosingMonth ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Fechar Mês'
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1.5 p-3 bg-[#1E293B]/30 rounded-xl">
              <p className="text-[12px] font-black text-[#64748B] uppercase tracking-wider">Publicadores</p>
              <p className="text-lg font-bold text-white">{statsCount.active}</p>
              <p className="text-[11.5px] text-[#94A3B8]">{reportStats.whoReported6Months} relataram (6 meses)</p>
            </div>
            <div className="space-y-1.5 p-3 bg-[#1E293B]/30 rounded-xl">
              <p className="text-[12px] font-black text-[#64748B] uppercase tracking-wider">Média Reunião</p>
              <p className="text-lg font-bold text-white">{avgAttendance ?? '—'}</p>
              <p className="text-[11.5px] text-[#94A3B8]">Fim de semana</p>
            </div>
            <div className="space-y-1.5 p-3 bg-[#1E293B]/30 rounded-xl">
              <p className="text-[12px] font-black text-[#64748B] uppercase tracking-wider">Publicadores</p>
              <p className="text-lg font-bold text-white">{reportStats.whoReported}</p>
              <p className="text-[11.5px] text-[#94A3B8]">{reportStats.pubStudies} estudos</p>
            </div>
            <div className="space-y-1.5 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <p className="text-[12px] font-black text-emerald-400 uppercase tracking-wider">Pion. Regulares</p>
              <p className="text-lg font-bold text-white">{reportStats.regPioneerReports}</p>
              <div className="flex gap-3 text-[11.5px] text-[#94A3B8]">
                <span>{reportStats.regPioneerHours}h</span>
                <span>{reportStats.regPioneerStudies} est.</span>
              </div>
            </div>
            <div className="space-y-1.5 p-3 bg-violet-500/5 rounded-xl border border-violet-500/10">
              <p className="text-[12px] font-black text-violet-400 uppercase tracking-wider">Pion. Auxiliares</p>
              <p className="text-lg font-bold text-white">{reportStats.auxPioneerReports}</p>
              <div className="flex gap-3 text-[11.5px] text-[#94A3B8]">
                <span>{reportStats.auxPioneerHours}h</span>
                <span>{reportStats.auxPioneerStudies} est.</span>
              </div>
            </div>
            <div className="space-y-1.5 p-3 bg-[#1E293B]/30 rounded-xl">
              <p className="text-[12px] font-black text-[#64748B] uppercase tracking-wider">Total Horas</p>
              <p className="text-lg font-bold text-white">{statsCount.totalHours}h</p>
              <p className="text-[11.5px] text-[#94A3B8]">Média {(statsCount.active > 0 ? (statsCount.totalHours / statsCount.active).toFixed(1) : '0')}h/pub</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[#1E293B] px-5 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-semibold text-white">Relatórios de Campo</CardTitle>
                <p className="text-[11px] text-[#64748B] mt-0.5">{missingReports.size} publicador(es) faltam lançar relatório de {selectedMonthId ? getMonthLabel(selectedMonthId) : currentMonthLabel}</p>
              </div>
            </div>
            <Button onClick={() => onNavigate('field')} className="h-8 bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-medium rounded-lg text-[11px] px-4">
              Lançar Agora
            </Button>
          </CardHeader>
          <div className="mx-5 mt-3 mb-1 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-[10px] font-bold text-amber-400">Prazo para lançamento dos relatórios de campo: <span className="text-white">dia 20 de cada mês</span></p>
          </div>
          <CardContent className="p-5">
            {missingReports.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-[13px] font-medium text-emerald-400">Todos os relatórios estão em dia!</p>
                <p className="text-[11px] text-[#64748B] mt-1">Nenhum publicador pendente neste mês.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {publishersByGroup
                  .filter(({ publishers: pubs }) => pubs.length > 0)
                  .map(({ group, publishers: pubs }) => {
                    const sup = publishers.find(p => p.groupId === group.id && p.designations?.includes("Serviço de campo::Super. de Grupo"));
                    const supPhone = sup?.phone?.replace(/\D/g, '') || '';
                    const message = encodeURIComponent(
                      `Olá, segue a lista de publicadores do grupo ${group.name} que ainda não lançaram o relatório de campo de ${selectedMonthId ? getMonthLabel(selectedMonthId) : currentMonthLabel}:\n\n` +
                      pubs.map(p => `• ${p.firstName} ${p.lastName}`).join('\n') +
                      `\n\nPor favor, nos ajudem a regularizar esses relatórios. Obrigado!`
                    );
                    const waLink = supPhone ? `https://wa.me/55${supPhone}?text=${message}` : '#';
                    return (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center justify-between border-b border-[#1E293B]/50 pb-1.5">
                          <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                            {group.name}
                            <span className="ml-2 text-[10px] text-amber-400 font-black">({pubs.length})</span>
                          </h4>
                          {supPhone && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 ml-2"
                              title={`Enviar WhatsApp para ${sup?.firstName} ${sup?.lastName}`}
                            >
                              <MessageSquare className="h-3 w-3" />
                              {sup?.firstName}
                            </a>
                          )}
                        </div>
                        <div className="space-y-1">
                          {pubs.map(p => (
                            <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1E293B]/30 rounded-lg text-[11px] font-medium text-[#94A3B8] group hover:bg-[#1E293B]/50 transition-colors">
                              <Checkbox
                                id={`checkin-${p.id}`}
                                checked={false}
                                disabled={checkingIn.has(p.id)}
                                onCheckedChange={() => handleQuickCheckin(p.id)}
                                className="h-4 w-4 border-[#475569] data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 shrink-0"
                              />
                              {checkingIn.has(p.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400 shrink-0" />
                              ) : (
                                <div className="h-5 w-5 rounded-md bg-amber-500/10 flex items-center justify-center text-[9px] font-bold text-amber-400 shrink-0">
                                  {p.firstName?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <span className="truncate flex-1">{p.firstName} {p.lastName}</span>
                              {p.pioneerType === 'regular' && (
                                <span className="text-[8px] font-bold text-emerald-500/70 uppercase tracking-wider shrink-0">P</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
