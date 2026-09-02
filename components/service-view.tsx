'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, User, X, Printer, Eye, FileText } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ServicePrintView } from './service-print-view';

interface Publisher {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  designations: string[];
  groupId: string;
}

interface ServiceViewProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const SAIDA_DESIGNATION = "Serviço de campo::Saída de campo";
const DIRIGENTE_DESIGNATION = "Serviço de campo::Dirigente de campo";

function fullName(p: Publisher) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
}

interface ScheduleRow {
  day?: string;
  date?: string;
  time: string;
  location: string;
  leader: string;
}

function PublisherInput({
  value,
  onChange,
  publishers,
  roleName,
  placeholder = "Selecionar..."
}: {
  value: string;
  onChange: (value: string) => void;
  publishers: Publisher[];
  roleName: string;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filteredPubs = publishers
    .filter(p => {
      if (!p || !p.firstName || !p.lastName) return false;
      const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = fullName.includes((search || "").toLowerCase());
      const hasDesignation = p.designations?.includes("Serviço de campo::Super. de Grupo");
      return matchesSearch && hasDesignation;
    })
    .sort((a, b) => {
      const nameA = [a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ').toLowerCase();
      const nameB = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(' ').toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const selectedPub = publishers.find(p => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-gray-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm ${selectedPub ? 'text-gray-900' : 'text-gray-400'}`}>
          {selectedPub ? [selectedPub.firstName, selectedPub.middleName, selectedPub.lastName].filter(Boolean).join(' ') : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Buscar publicador..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {value && (
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 text-gray-500"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <X className="h-3 w-3" />
                Limpar seleção
              </div>
            )}
            {filteredPubs.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">Nenhum publicador encontrado</div>
            ) : (
              filteredPubs.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
                  onClick={() => {
                    onChange([p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '));
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ServiceView({ onDirtyChange }: ServiceViewProps) {
  const { user } = useAuth();
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string; points: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrint, setShowPrint] = useState(false);

  const [weekDesignation, setWeekDesignation] = useState("");
  const [saturdayDesignation, setSaturdayDesignation] = useState("");
  const [sundayDesignation, setSundayDesignation] = useState("");
  const [superintendentName, setSuperintendentName] = useState("");
  const [superintendentDesignations, setSuperintendentDesignations] = useState<string[]>([]);
  const [visitStartDate, setVisitStartDate] = useState("");
  const [visitEndDate, setVisitEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonth]);

  // Check if superintendent visit is active for the selected month
  const isSuperVisitActive = React.useMemo(() => {
    if (!superintendentDesignations.includes("Dirigente de campo")) return false;
    if (!visitStartDate || !visitEndDate) return false;
    const monthIdx = months.indexOf(selectedMonth);
    if (monthIdx < 0) return false;
    const year = new Date().getFullYear();
    const monthStart = new Date(year, monthIdx, 1);
    const monthEnd = new Date(year, monthIdx + 1, 0);
    const visitStart = new Date(visitStartDate + 'T00:00:00');
    const visitEnd = new Date(visitEndDate + 'T23:59:59');
    return monthStart <= visitEnd && monthEnd >= visitStart;
  }, [selectedMonth, superintendentDesignations, visitStartDate, visitEndDate]);

  // All dirigentes (regular + superintendent when visit is active)
  const allDirigentes = React.useMemo(() => {
    const regular = publishers
      .filter(p => p.designations?.includes(DIRIGENTE_DESIGNATION))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
    if (isSuperVisitActive && superintendentName) {
      return [...regular, { id: '__superintendent__', firstName: superintendentName, middleName: '', lastName: '', designations: [], groupId: '' }];
    }
    return regular;
  }, [publishers, isSuperVisitActive, superintendentName]);

  const weekDaysList = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
  const [weekSchedule, setWeekSchedule] = useState(
    weekDaysList.map(day => ({ day, time: "", location: "", leader: "" }))
  );

  const updateWeekSchedule = (index: number, field: "time" | "location" | "leader", value: string) => {
    setWeekSchedule(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getDaysOfMonth = (monthName: string, dayOfWeek: number): string[] => {
    const monthIndex = months.indexOf(monthName);
    const currentYear = new Date().getFullYear();
    const days: string[] = [];
    const date = new Date(currentYear, monthIndex, 1);
    while (date.getMonth() === monthIndex) {
      if (date.getDay() === dayOfWeek) {
        days.push(`${date.getDate().toString().padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')}`);
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const getSaturdaysOfMonth = (monthName: string): string[] => getDaysOfMonth(monthName, 6);
  const getSundaysOfMonth = (monthName: string): string[] => getDaysOfMonth(monthName, 0);

  const [saturdaySchedule, setSaturdaySchedule] = useState<{ date: string; time: string; location: string; leader: string }[]>([]);
  const [sundayLontras, setSundayLontras] = useState<{ date: string; time: string; location: string; leader: string }[]>([]);
  const [sundayPraia, setSundayPraia] = useState<{ date: string; time: string; location: string; leader: string }[]>([]);

  useEffect(() => {
    const saturdays = getSaturdaysOfMonth(selectedMonth);
    setSaturdaySchedule(prev => {
      if (prev.length === saturdays.length) return prev;
      return saturdays.map(date => ({ date, time: "", location: "", leader: "" }));
    });
  }, [selectedMonth]);

  useEffect(() => {
    const sundays = getSundaysOfMonth(selectedMonth);
    setSundayLontras(prev => {
      if (prev.length === sundays.length) return prev;
      return sundays.map(date => ({ date, time: "", location: "", leader: "" }));
    });
    setSundayPraia(prev => {
      if (prev.length === sundays.length) return prev;
      return sundays.map(date => ({ date, time: "", location: "", leader: "" }));
    });
  }, [selectedMonth]);

  const updateSaturdaySchedule = (index: number, field: "time" | "location" | "leader", value: string) => {
    setSaturdaySchedule(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateSundayLontras = (index: number, field: "time" | "location" | "leader", value: string) => {
    setSundayLontras(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateSundayPraia = (index: number, field: "time" | "location" | "leader", value: string) => {
    setSundayPraia(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  useEffect(() => {
    const unsubPubs = onSnapshot(collection(db, 'publishers'), (snapshot) => {
      const pubs: Publisher[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        pubs.push({
          id: doc.id,
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          lastName: data.lastName || '',
          designations: data.designations || [],
          groupId: data.groupId || '',
        });
      });
      setPublishers(pubs);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar publicadores:', error);
      setLoading(false);
    });

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const groupsData: { id: string; name: string; points: string }[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        groupsData.push({
          id: doc.id,
          name: data.name || '',
          points: data.points || '',
        });
      });
      groupsData.sort((a, b) => a.name.localeCompare(b.name));
      setGroups(groupsData);
    }, (error) => {
      console.error('Erro ao carregar grupos:', error);
    });

    return () => {
      unsubPubs();
      unsubGroups();
    };
  }, []);

  // Fetch superintendent settings
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'settings', `congregation_${user.uid}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSuperintendentName(data.circuitSuperintendent || "");
        setSuperintendentDesignations(data.superintendentDesignations || []);
        setVisitStartDate(data.visitStartDate || "");
        setVisitEndDate(data.visitEndDate || "");
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadServiceData = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const serviceDoc = await getDoc(doc(db, 'service_designations', 'current'));
        if (cancelled) return;
        if (serviceDoc.exists()) {
          const data = serviceDoc.data();
          if (data.month) setSelectedMonth(data.month);
          if (Array.isArray(data.week)) setWeekSchedule(data.week);
          if (Array.isArray(data.saturday)) setSaturdaySchedule(data.saturday);
          if (data.sunday) {
            if (Array.isArray(data.sunday.lontras)) setSundayLontras(data.sunday.lontras);
            if (Array.isArray(data.sunday.praia)) setSundayPraia(data.sunday.praia);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar designações:', error);
      }
    };
    loadServiceData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const hasChanges = weekSchedule.some(r => r.time || r.location || r.leader)
      || saturdaySchedule.some(r => r.time || r.location || r.leader)
      || sundayLontras.some(r => r.time || r.location || r.leader)
      || sundayPraia.some(r => r.time || r.location || r.leader);
    onDirtyChange?.(hasChanges);
  }, [weekSchedule, saturdaySchedule, sundayLontras, sundayPraia, onDirtyChange]);

  const hasAnyData = (arr: ScheduleRow[]) => arr.some(row => row.time || row.location || row.leader);

  const handleSave = async () => {
    if (!hasAnyData(weekSchedule) && !hasAnyData(saturdaySchedule) && !hasAnyData(sundayLontras) && !hasAnyData(sundayPraia)) {
      toast.error('Preencha pelo menos uma designação');
      return;
    }

    setSaving(true);
    try {
      const serviceData = {
        month: selectedMonth,
        week: weekSchedule,
        saturday: saturdaySchedule,
        sunday: {
          lontras: sundayLontras,
          praia: sundayPraia,
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || '',
      };

      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'service_designations', 'current'), serviceData);

      toast.success('Designações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar designações');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setWeekDesignation("");
    setSaturdayDesignation("");
    setSundayDesignation("");
    setWeekSchedule(weekDaysList.map(day => ({ day, time: "", location: "", leader: "" })));
  };

  const generatePDF = async () => {
    try {
      const { generateServicePDF, downloadPDF } = await import('@/print/services/pdf-generator');
      const pdfBytes = await generateServicePDF({
        month: selectedMonth,
        weekSchedule,
        saturdaySchedule,
        sundayLontras,
        sundayPraia,
      });
      downloadPDF(pdfBytes, `servico-campo-${selectedMonth}-2026.pdf`);
      toast.success('PDF salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handlePrint = async () => {
    try {
      const { generateServicePDF, openPDFForPrint } = await import('@/print/services/pdf-generator');
      const pdfBytes = await generateServicePDF({
        month: selectedMonth,
        weekSchedule,
        saturdaySchedule,
        sundayLontras,
        sundayPraia,
      });
      openPDFForPrint(pdfBytes);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showPrint) {
    return (
      <div className="fixed inset-0 bg-gray-100 z-50 overflow-auto">
        <div className="print:hidden sticky top-0 bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg z-10">
          <h2 className="text-lg font-bold">Visualização de Impressão</h2>
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button
              onClick={generatePDF}
              className="bg-red-600 hover:bg-red-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Salvar PDF
            </Button>
            <Button
              onClick={() => setShowPrint(false)}
              variant="outline"
              className="border-white text-white hover:bg-white/20"
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
        <div id="print-content" className="bg-white">
          <ServicePrintView
            month={selectedMonth}
            weekSchedule={weekSchedule}
            saturdaySchedule={saturdaySchedule}
            sundayLontras={sundayLontras}
            sundayPraia={sundayPraia}
          />
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectClass = "w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  const saidas = publishers
    .filter(p => p.designations?.includes(SAIDA_DESIGNATION))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return (
    <div className="h-full overflow-auto pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Serviço de Campo</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPrint(true)} className="border-blue-600 text-blue-600 hover:bg-blue-50 text-xs">
            <Eye className="h-4 w-4 mr-1" /> Visualização
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={saving} className="text-xs">
            Limpar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-xs">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Seletor de Mês */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-300">Mês:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {months.map((month) => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>

      {/* Mobile: scroll horizontal */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:hidden">
        <Card className="bg-slate-900 border-slate-700/50 shadow-sm rounded-3xl overflow-hidden min-w-[85vw] sm:min-w-[480px] flex-shrink-0 snap-start">
          <CardHeader className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Designação Semana</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weekSchedule.map((row, index) => (
                <div key={row.day} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-white uppercase">{row.day}</p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Horário</label>
                    <input type="time" value={row.time} onChange={(e) => updateWeekSchedule(index, "time", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Local</label>
                    <select value={row.location} onChange={(e) => updateWeekSchedule(index, "location", e.target.value)} className={selectClass}>
                      <option value="">Selecionar...</option>
                      {saidas.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Dirigente</label>
                    <select value={row.leader} onChange={(e) => updateWeekSchedule(index, "leader", e.target.value)} className={selectClass}>
                      <option value="">Selecionar...</option>
                      {allDirigentes.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700/50 shadow-sm rounded-3xl overflow-hidden min-w-[85vw] sm:min-w-[480px] flex-shrink-0 snap-start">
          <CardHeader className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Designação Sábado</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {saturdaySchedule.map((row, index) => (
                <div key={row.date} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-white uppercase">{row.date}</p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Horário</label>
                    <input type="time" value={row.time} onChange={(e) => updateSaturdaySchedule(index, "time", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Local</label>
                    <select value={row.location} onChange={(e) => updateSaturdaySchedule(index, "location", e.target.value)} className={selectClass}>
                      <option value="">Selecionar...</option>
                      {saidas.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Dirigente</label>
                    <select value={row.leader} onChange={(e) => updateSaturdaySchedule(index, "leader", e.target.value)} className={selectClass}>
                      <option value="">Selecionar...</option>
                      {allDirigentes.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700/50 shadow-sm rounded-3xl overflow-hidden min-w-[85vw] sm:min-w-[480px] flex-shrink-0 snap-start">
          <CardHeader className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Designação Domingo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {[{ name: "Lontras", subtitle: "Macaco", schedule: sundayLontras, update: updateSundayLontras }, { name: "Praia", subtitle: "Raposa", schedule: sundayPraia, update: updateSundayPraia }].map(groupInfo => (
              <div key={groupInfo.name} className="space-y-3">
                <h3 className="text-sm font-bold text-[#0EA5E9] uppercase tracking-wider">{groupInfo.name} - {groupInfo.subtitle}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groupInfo.schedule.map((row, index) => (
                    <div key={`${groupInfo.name}-${row.date}`} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-white uppercase">{row.date}</p>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Horário</label>
                        <input type="time" value={row.time} onChange={(e) => groupInfo.update(index, "time", e.target.value)} className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Local</label>
                        <select value={row.location} onChange={(e) => groupInfo.update(index, "location", e.target.value)} className={selectClass}>
                          <option value="">Selecionar...</option>
                          {saidas.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Dirigente</label>
                        <select value={row.leader} onChange={(e) => groupInfo.update(index, "leader", e.target.value)} className={selectClass}>
                          <option value="">Selecionar...</option>
                          {allDirigentes.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Desktop: empilhado */}
      <div className="hidden md:flex md:flex-col md:gap-4">
        <Card className="bg-slate-900 border-slate-700/50 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Designação Semana</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <table className="w-full text-sm table-fixed">
              <colgroup><col className="w-28" /><col className="w-24" /><col className="w-1/3" /><col className="w-1/3" /></colgroup>
              <thead><tr className="border-b border-slate-700">
                <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Dia</th>
                <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Horário</th>
                <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Local</th>
                <th className="text-left text-xs font-medium text-slate-400 pb-2">Dirigente</th>
              </tr></thead>
              <tbody>
                {weekSchedule.map((row, index) => (
                  <tr key={row.day} className="border-b border-slate-800">
                    <td className="py-2 pr-2 text-white font-medium">{row.day}</td>
                    <td className="py-2 pr-2"><input type="time" value={row.time} onChange={(e) => updateWeekSchedule(index, "time", e.target.value)} className={inputClass} /></td>
                    <td className="py-2 pr-2"><select value={row.location} onChange={(e) => updateWeekSchedule(index, "location", e.target.value)} className={selectClass}><option value="">Selecionar...</option>{saidas.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}</select></td>
                    <td className="py-2"><select value={row.leader} onChange={(e) => updateWeekSchedule(index, "leader", e.target.value)} className={selectClass}><option value="">Selecionar...</option>{allDirigentes.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}</select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700/50 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Designação Sábado</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <table className="w-full text-sm table-fixed">
              <colgroup><col className="w-28" /><col className="w-24" /><col className="w-1/3" /><col className="w-1/3" /></colgroup>
              <thead><tr className="border-b border-slate-700">
                <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Data</th>
                <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Horário</th>
                <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Local</th>
                <th className="text-left text-xs font-medium text-slate-400 pb-2">Dirigente</th>
              </tr></thead>
              <tbody>
                {saturdaySchedule.map((row, index) => (
                  <tr key={row.date} className="border-b border-slate-800">
                    <td className="py-2 pr-2 text-white font-medium">{row.date}</td>
                    <td className="py-2 pr-2"><input type="time" value={row.time} onChange={(e) => updateSaturdaySchedule(index, "time", e.target.value)} className={inputClass} /></td>
                    <td className="py-2 pr-2"><select value={row.location} onChange={(e) => updateSaturdaySchedule(index, "location", e.target.value)} className={selectClass}><option value="">Selecionar...</option>{saidas.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}</select></td>
                    <td className="py-2"><select value={row.leader} onChange={(e) => updateSaturdaySchedule(index, "leader", e.target.value)} className={selectClass}><option value="">Selecionar...</option>{allDirigentes.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}</select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700/50 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Designação Domingo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {[{ name: "Lontras", subtitle: "Macaco", schedule: sundayLontras, update: updateSundayLontras }, { name: "Praia", subtitle: "Raposa", schedule: sundayPraia, update: updateSundayPraia }].map(groupInfo => (
              <div key={groupInfo.name} className="space-y-3">
                <h3 className="text-sm font-bold text-[#0EA5E9] uppercase tracking-wider">{groupInfo.name} - {groupInfo.subtitle}</h3>
                <table className="w-full text-sm table-fixed">
                  <colgroup><col className="w-28" /><col className="w-24" /><col className="w-1/3" /><col className="w-1/3" /></colgroup>
                  <thead><tr className="border-b border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Data</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Horário</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-2">Local</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-2">Dirigente</th>
                  </tr></thead>
                  <tbody>
                    {groupInfo.schedule.map((row, index) => (
                      <tr key={`${groupInfo.name}-${row.date}`} className="border-b border-slate-800">
                        <td className="py-2 pr-2 text-white font-medium">{row.date}</td>
                        <td className="py-2 pr-2"><input type="time" value={row.time} onChange={(e) => groupInfo.update(index, "time", e.target.value)} className={inputClass} /></td>
                        <td className="py-2 pr-2"><select value={row.location} onChange={(e) => groupInfo.update(index, "location", e.target.value)} className={selectClass}><option value="">Selecionar...</option>{saidas.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}</select></td>
                        <td className="py-2"><select value={row.leader} onChange={(e) => groupInfo.update(index, "leader", e.target.value)} className={selectClass}><option value="">Selecionar...</option>{allDirigentes.map(p => (<option key={p.id} value={fullName(p)}>{fullName(p)}</option>))}</select></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
