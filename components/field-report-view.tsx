'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Printer, Save, Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

interface PublisherSummary {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  status: string;
  groupId: string;
  pioneerType: string;
}

interface GroupSummary {
  id: string;
  name: string;
}

interface FieldReportEntry {
  participou: boolean;
  estudos: string;
  auxiliar: boolean;
  horas: string;
  observacao: string;
}

interface FieldReportViewProps {
  onDirtyChange?: (dirty: boolean) => void;
}

export function FieldReportView({ onDirtyChange }: FieldReportViewProps) {
  const { user } = useAuth();
  const [publishers, setPublishers] = useState<PublisherSummary[]>([]);
  const [reports, setReports] = useState<Record<string, FieldReportEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const [pendingYear, setPendingYear] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [selectedMonth, setSelectedMonth] = useState<number>(prevMonth.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(prevMonth.getFullYear());

  const documentId = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Notify parent about dirty state for navigation guard
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  // beforeunload handler for browser-level navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!user) return;

    const unsubPubs = onSnapshot(
      query(collection(db, 'publishers')),
      (snapshot: any) => {
        const pubs = snapshot.docs.map(d => ({
          id: d.id,
          firstName: d.data().firstName || '',
          middleName: d.data().middleName || '',
          lastName: d.data().lastName || '',
          status: d.data().status || 'ativo',
          groupId: d.data().groupId || '',
          pioneerType: d.data().pioneerType || 'nao',
        })).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        setPublishers(pubs);
        setIsLoading(false);
      },
      (error: unknown) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'publishers');
      }
    );

    const unsubGroups = onSnapshot(
      query(collection(db, 'groups')),
      (snapshot: any) => {
        const gs = snapshot.docs.map(d => ({ id: d.id, name: d.data().name || '' }));
        setGroups(gs);
      },
      (error: unknown) => handleFirestoreError(error, OperationType.LIST, 'groups')
    );

    return () => { unsubPubs(); unsubGroups(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'field_reports', documentId);
    const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
      if (docSnap.exists()) {
        setReports(docSnap.data()?.reports || {});
      } else {
        setReports({});
      }
    }, (error: unknown) => {
      console.error("Error fetching report:", error);
    });
    return () => unsubscribe();
  }, [user, documentId]);

  const updateReport = (publisherId: string, field: keyof FieldReportEntry, value: boolean | string) => {
    setIsDirty(true);
    setReports(prev => ({
      ...prev,
      [publisherId]: {
        ...(prev[publisherId] || { participou: false, estudos: '', auxiliar: false, horas: '', observacao: '' }),
        [field]: value,
      }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const toastId = toast.loading("Salvando relatório de campo...");
    try {
      await setDoc(doc(db, 'field_reports', documentId), {
        reports,
        month: selectedMonth,
        year: selectedYear,
        updatedAt: new Date().toISOString(),
      });
      setIsDirty(false);
      toast.success("Relatório salvo com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Save field report error:", error);
      toast.error("Erro ao salvar relatório.", { id: toastId });
      handleFirestoreError(error, OperationType.WRITE, `field_reports/${documentId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    if (isDirty) {
      setPendingMonth(newMonth);
      setPendingYear(null);
      setShowConfirmDialog(true);
    } else {
      setSelectedMonth(newMonth);
    }
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    if (isDirty) {
      setPendingYear(newYear);
      setPendingMonth(null);
      setShowConfirmDialog(true);
    } else {
      setSelectedYear(newYear);
    }
  };

  const confirmNavigation = () => {
    if (pendingMonth !== null) setSelectedMonth(pendingMonth);
    if (pendingYear !== null) setSelectedYear(pendingYear);
    setPendingMonth(null);
    setPendingYear(null);
    setShowConfirmDialog(false);
    setIsDirty(false);
  };

  const cancelNavigation = () => {
    setPendingMonth(null);
    setPendingYear(null);
    setShowConfirmDialog(false);
  };

  const filteredPublishers = publishers.filter(p => {
    if (selectedGroup !== 'all' && p.groupId !== selectedGroup) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const activePublishers = filteredPublishers.filter(p => p.status === 'ativo');
  const inactivePublishers = filteredPublishers.filter(p => p.status !== 'ativo');

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#050B14]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 gap-6">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Relatório de Campo</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:border-[#0EA5E9]"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx} className="bg-[#0F172A]">{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:border-[#0EA5E9]"
            >
              {Array.from({ length: 7 }, (_, i) => 2024 + i).map(year => (
                <option key={year} value={year} className="bg-[#0F172A]">{year}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="h-9 bg-[#1E293B]/50 border border-[#1E293B]/50 text-white rounded-lg px-3 text-[11px] font-bold focus:outline-none focus:border-[#0EA5E9]"
          >
            <option value="all">Todos os grupos</option>
            {groups.map(g => (
              <option key={g.id} value={g.id} className="bg-[#0F172A]">{g.name}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar publicador..."
              className="h-9 w-48 bg-[#1E293B]/50 border border-[#1E293B]/50 text-white rounded-lg pl-9 pr-3 text-[11px] font-medium focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20 px-5 gap-1.5 text-[10px]"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-2 scrollbar-thin min-h-0">
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl overflow-hidden min-w-[700px]">
          {/* Cabeçalho */}
          <div className="flex border-b border-[#1E293B]/60 bg-[#1E293B]/20">
            <div className="w-[260px] shrink-0 p-3">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Publicador</span>
            </div>
            <div className="w-16 shrink-0 border-l border-[#1E293B]/40 p-3 text-center">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Part.</span>
            </div>
            <div className="w-16 shrink-0 border-l border-[#1E293B]/40 p-3 text-center">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Est.</span>
            </div>
            <div className="w-16 shrink-0 border-l border-[#1E293B]/40 p-3 text-center">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Aux.</span>
            </div>
            <div className="w-20 shrink-0 border-l border-[#1E293B]/40 p-3 text-center">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Horas</span>
            </div>
            <div className="w-40 shrink-0 border-l border-[#1E293B]/40 p-3">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Obs</span>
            </div>
          </div>

          {/* Publicadores ativos */}
          {activePublishers.length === 0 && inactivePublishers.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <FileText className="h-10 w-10 text-[#64748B] mx-auto mb-3 opacity-40" />
                <p className="text-[13px] text-[#64748B] font-medium">Nenhum publicador cadastrado</p>
                <p className="text-[11px] text-[#64748B]/60 mt-1">Cadastre publicadores na tela Publicadores.</p>
              </div>
            </div>
          )}

          {activePublishers.map(p => {
            const report = reports[p.id] || { participou: false, estudos: '', auxiliar: false, horas: '', observacao: '' };
            return (
              <div key={p.id} className="flex border-b border-[#1E293B]/30 last:border-b-0 hover:bg-[#1E293B]/5 transition-colors">
                <div className="w-[260px] shrink-0 p-2.5 flex items-center">
                  <div className="h-7 w-7 rounded-lg bg-[#1E293B]/50 flex items-center justify-center text-xs font-bold text-[#94A3B8] shrink-0 mr-2.5">
                    {p.firstName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-[12px] font-bold text-white flex-1 min-w-0">{[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}</span>
                  {p.pioneerType === 'regular' && (
                    <span className="ml-1.5 text-[8px] font-bold text-emerald-500/70 uppercase tracking-wider shrink-0">P</span>
                  )}
                  {p.pioneerType === 'auxiliar' && (
                    <span className="ml-1.5 text-[8px] font-bold text-amber-500/70 uppercase tracking-wider shrink-0">A</span>
                  )}
                </div>

                <div className="w-16 shrink-0 border-l border-[#1E293B]/40 flex items-center justify-center">
                  <button
                    onClick={() => updateReport(p.id, 'participou', !report.participou)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      report.participou
                        ? 'bg-[#0EA5E9]/20 text-[#0EA5E9] border border-[#0EA5E9]/30'
                        : 'bg-[#1E293B]/30 text-[#475569] border border-[#1E293B]/40 hover:border-[#0EA5E9]/30'
                    }`}
                  >
                    {report.participou ? <Check className="h-4 w-4" /> : null}
                  </button>
                </div>

                <div className="w-16 shrink-0 border-l border-[#1E293B]/40 flex items-center justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={report.estudos}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                      updateReport(p.id, 'estudos', v);
                    }}
                    className="w-14 h-8 text-center bg-[#1E293B]/20 border border-[#1E293B]/40 text-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#0EA5E9]"
                    placeholder="00"
                  />
                </div>

                <div className="w-16 shrink-0 border-l border-[#1E293B]/40 flex items-center justify-center">
                  <button
                    onClick={() => updateReport(p.id, 'auxiliar', !report.auxiliar)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      report.auxiliar
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-[#1E293B]/30 text-[#475569] border border-[#1E293B]/40 hover:border-amber-500/30'
                    }`}
                  >
                    {report.auxiliar ? <Check className="h-4 w-4" /> : null}
                  </button>
                </div>

                <div className="w-20 shrink-0 border-l border-[#1E293B]/40 flex items-center justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={report.horas}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                      updateReport(p.id, 'horas', v);
                      if (v && p.pioneerType !== 'regular') {
                        updateReport(p.id, 'auxiliar', true);
                      }
                    }}
                    className="w-14 h-8 text-center bg-[#1E293B]/20 border border-[#1E293B]/40 text-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#0EA5E9]"
                    placeholder="00"
                  />
                </div>

                <div className="w-40 shrink-0 border-l border-[#1E293B]/40 flex items-center p-2.5">
                  <input
                    type="text"
                    maxLength={35}
                    value={report.observacao}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 35);
                      updateReport(p.id, 'observacao', v);
                    }}
                    placeholder="Obs..."
                    className="w-full h-8 bg-[#1E293B]/20 border border-[#1E293B]/40 text-white rounded-lg px-3 text-[11px] font-medium focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#475569]"
                  />
                </div>
              </div>
            );
          })}

          {/* Publicadores inativos */}
          {inactivePublishers.length > 0 && (
            <>
              <div className="flex border-b border-[#1E293B]/40 bg-[#1E293B]/10 px-3 py-2">
                <span className="text-[9px] font-black text-[#64748B]/50 uppercase tracking-widest">Publicadores inativos</span>
              </div>
              {inactivePublishers.map(p => (
                <div key={p.id} className="flex border-b border-[#1E293B]/20 last:border-b-0 opacity-50 hover:opacity-70 transition-opacity">
                  <div className="w-[260px] shrink-0 p-2.5 flex items-center">
                    <div className="h-7 w-7 rounded-lg bg-[#1E293B]/30 flex items-center justify-center text-xs font-bold text-[#64748B] shrink-0 mr-2.5">
                      {p.firstName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-[12px] font-bold text-[#64748B] truncate">{[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center border-l border-[#1E293B]/20">
                    <span className="text-[10px] text-[#64748B]/50 italic">Inativo</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Totais */}
        {activePublishers.length > 0 && (
          <div className="mt-4 bg-[#0B1220]/50 border border-[#1E293B]/40 rounded-xl p-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#64748B] uppercase">Total publicadores:</span>
              <span className="text-sm font-black text-white">{activePublishers.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#64748B] uppercase">Participaram:</span>
              <span className="text-sm font-black text-[#0EA5E9]">{Object.values(reports).filter(r => r.participou).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#64748B] uppercase">Auxiliares:</span>
              <span className="text-sm font-black text-amber-400">{Object.values(reports).filter(r => r.auxiliar).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#64748B] uppercase">Total horas:</span>
              <span className="text-sm font-black text-white">{Object.values(reports).reduce((sum, r) => sum + (parseInt(r.horas, 10) || 0), 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#64748B] uppercase">Total estudos:</span>
              <span className="text-sm font-black text-white">{Object.values(reports).reduce((sum, r) => sum + (parseInt(r.estudos, 10) || 0), 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmação de saída sem salvar */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-black text-white mb-2">Alterações não salvas</h3>
            <p className="text-[11px] text-[#94A3B8] font-medium mb-5">
              Você tem alterações não salvas no relatório de campo. Deseja sair sem salvar?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelNavigation}
                variant="outline"
                className="border-[#1E293B] text-[#94A3B8] font-bold h-10 rounded-lg px-5 text-[11px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmNavigation}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 rounded-lg px-5 text-[11px]"
              >
                Sair sem salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
