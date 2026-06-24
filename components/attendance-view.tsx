'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Printer, 
  Save, 
  Loader2, 
  TrendingUp,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import { 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';
import { toast } from 'sonner';

// Configuração de meses em português
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" }
];

interface AttendanceRow {
  w1: string;
  w2: string;
  w3: string;
  w4: string;
  w5: string;
}

interface AttendanceMonthData {
  midweek: {
    presencial: AttendanceRow;
    conectados: AttendanceRow;
  };
  weekend: {
    presencial: AttendanceRow;
    conectados: AttendanceRow;
  };
  midweekDay: number;
  weekendDay: number;
}

const defaultRowData: AttendanceRow = {
  w1: "",
  w2: "",
  w3: "",
  w4: "",
  w5: ""
};

const defaultAttendanceData: AttendanceMonthData = {
  midweek: {
    presencial: { ...defaultRowData },
    conectados: { ...defaultRowData }
  },
  weekend: {
    presencial: { ...defaultRowData },
    conectados: { ...defaultRowData }
  },
  midweekDay: 2, // Terça-feira padrão
  weekendDay: 6  // Sábado padrão
};

export function AttendanceView() {
  const { user } = useAuth();
  
  // Estados para data selecionada
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  
  // Configuração dos dias de reunião
  const [midweekDay, setMidweekDay] = useState<number>(2); // Terça-feira
  const [weekendDay, setWeekendDay] = useState<number>(6); // Sábado
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Dados de assistência
  const [attendance, setAttendance] = useState<AttendanceMonthData>(defaultAttendanceData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Document ID no formato YYYY-MM
  const documentId = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Helper para obter os dias correspondentes no mês
  const getDaysInMonth = (year: number, month: number, targetDayOfWeek: number): string[] => {
    const dates: string[] = [];
    const date = new Date(year, month, 1);
    
    while (date.getMonth() === month) {
      if (date.getDay() === targetDayOfWeek) {
        const day = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        dates.push(`${day}/${m}`);
      }
      date.setDate(date.getDate() + 1);
    }
    return dates;
  };

  const midweekDates = getDaysInMonth(selectedYear, selectedMonth, midweekDay);
  const weekendDates = getDaysInMonth(selectedYear, selectedMonth, weekendDay);

  // Monitorar carregamento do banco de dados
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const docRef = doc(db, 'attendance', documentId);
    const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAttendance({
          midweek: {
            presencial: { ...defaultRowData, ...(data.midweek?.presencial || {}) },
            conectados: { ...defaultRowData, ...(data.midweek?.conectados || {}) }
          },
          weekend: {
            presencial: { ...defaultRowData, ...(data.weekend?.presencial || {}) },
            conectados: { ...defaultRowData, ...(data.weekend?.conectados || {}) }
          },
          midweekDay: data.midweekDay !== undefined ? data.midweekDay : 2,
          weekendDay: data.weekendDay !== undefined ? data.weekendDay : 6
        });
        
        // Sincronizar os dias de reunião salvos
        if (data.midweekDay !== undefined) setMidweekDay(data.midweekDay);
        if (data.weekendDay !== undefined) setWeekendDay(data.weekendDay);
      } else {
        setAttendance({
          ...defaultAttendanceData,
          midweekDay,
          weekendDay
        });
      }
      setIsLoading(false);
    }, (error: unknown) => {
      console.error("Error fetching attendance data:", error);
      setIsLoading(false);
      handleFirestoreError(error, OperationType.GET, `attendance/${documentId}`);
    });

    return () => unsubscribe();
  }, [user, documentId]);

  // Atualizar dia de reunião e salvar no estado local
  const handleMidweekDayChange = (day: number) => {
    setMidweekDay(day);
    setAttendance(prev => ({ ...prev, midweekDay: day }));
  };

  const handleWeekendDayChange = (day: number) => {
    setWeekendDay(day);
    setAttendance(prev => ({ ...prev, weekendDay: day }));
  };

  // Salvar assistência no Firestore
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const toastId = toast.loading("Salvando dados de assistência...");
    try {
      await setDoc(doc(db, 'attendance', documentId), {
        ...attendance,
        midweekDay,
        weekendDay,
        month: selectedMonth,
        year: selectedYear,
        updatedAt: new Date().toISOString()
      });
      toast.success("Dados salvos com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Save attendance error:", error);
      toast.error("Erro ao salvar dados de assistência.", { id: toastId });
      handleFirestoreError(error, OperationType.WRITE, `attendance/${documentId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    section: 'midweek' | 'weekend',
    row: 'presencial' | 'conectados',
    weekKey: keyof AttendanceRow,
    value: string
  ) => {
    // Apenas permitir números ou vazio
    const cleanValue = value.replace(/\D/g, '');
    setAttendance(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [row]: {
          ...prev[section][row],
          [weekKey]: cleanValue
        }
      }
    }));
  };

  // Helper para computar totais e médias
  const calculateRowStats = (row: AttendanceRow, activeWeeksCount: number) => {
    const w1Val = parseInt(row.w1) || 0;
    const w2Val = parseInt(row.w2) || 0;
    const w3Val = parseInt(row.w3) || 0;
    const w4Val = parseInt(row.w4) || 0;
    const w5Val = activeWeeksCount >= 5 ? (parseInt(row.w5) || 0) : 0;

    const total = w1Val + w2Val + w3Val + w4Val + w5Val;
    
    // Contar apenas semanas que possuem data válida no mês
    const average = activeWeeksCount > 0 ? Math.round(total / activeWeeksCount) : 0;
    
    return { total, average };
  };

  const getWeekSum = (pres: string, con: string) => {
    const p = parseInt(pres) || 0;
    const c = parseInt(con) || 0;
    return p + c;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#050B14]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  // Estatísticas do Meio de Semana
  const mwPresStats = calculateRowStats(attendance.midweek.presencial, midweekDates.length);
  const mwConStats = calculateRowStats(attendance.midweek.conectados, midweekDates.length);
  const mwTotalW1 = getWeekSum(attendance.midweek.presencial.w1, attendance.midweek.conectados.w1);
  const mwTotalW2 = getWeekSum(attendance.midweek.presencial.w2, attendance.midweek.conectados.w2);
  const mwTotalW3 = getWeekSum(attendance.midweek.presencial.w3, attendance.midweek.conectados.w3);
  const mwTotalW4 = getWeekSum(attendance.midweek.presencial.w4, attendance.midweek.conectados.w4);
  const mwTotalW5 = midweekDates.length >= 5 ? getWeekSum(attendance.midweek.presencial.w5, attendance.midweek.conectados.w5) : 0;
  const mwGrandTotal = mwPresStats.total + mwConStats.total;
  const mwGrandAverage = midweekDates.length > 0 ? Math.round(mwGrandTotal / midweekDates.length) : 0;

  // Estatísticas do Fim de Semana
  const wePresStats = calculateRowStats(attendance.weekend.presencial, weekendDates.length);
  const weConStats = calculateRowStats(attendance.weekend.conectados, weekendDates.length);
  const weTotalW1 = getWeekSum(attendance.weekend.presencial.w1, attendance.weekend.conectados.w1);
  const weTotalW2 = getWeekSum(attendance.weekend.presencial.w2, attendance.weekend.conectados.w2);
  const weTotalW3 = getWeekSum(attendance.weekend.presencial.w3, attendance.weekend.conectados.w3);
  const weTotalW4 = getWeekSum(attendance.weekend.presencial.w4, attendance.weekend.conectados.w4);
  const weTotalW5 = weekendDates.length >= 5 ? getWeekSum(attendance.weekend.presencial.w5, attendance.weekend.conectados.w5) : 0;
  const weGrandTotal = wePresStats.total + weConStats.total;
  const weGrandAverage = weekendDates.length > 0 ? Math.round(weGrandTotal / weekendDates.length) : 0;

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      
      {/* Cabeçalho da página */}
      <div className="flex justify-between items-end shrink-0 no-print">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Assistência às reuniões</h1>
          <div className="flex items-center gap-3 mt-1.5">
            {/* Seletor de Mês */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:border-[#0EA5E9]"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx} className="bg-[#0F172A]">{m}</option>
              ))}
            </select>

            {/* Seletor de Ano */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:border-[#0EA5E9]"
            >
              {Array.from({ length: 7 }, (_, i) => 2024 + i).map(year => (
                <option key={year} value={year} className="bg-[#0F172A]">{year}</option>
              ))}
            </select>

            {/* Botão de Configuração de Dias */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowConfig(!showConfig)}
              className={`h-8 w-8 rounded-lg border border-[#1E293B]/60 hover:text-white ${showConfig ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'text-[#94A3B8]'}`}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handlePrint}
            variant="outline" 
            className="h-10 border-[#1E293B] text-[#94A3B8] font-bold rounded-xl gap-2 px-5 text-xs"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 px-6 text-xs gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Dados"}
          </Button>
        </div>
      </div>

      {/* Painel de Configurações de Dias da Reunião (Expansível) */}
      {showConfig && (
        <div className="bg-[#0B1220]/90 border border-[#0EA5E9]/20 rounded-2xl p-4 space-y-4 no-print transition-all">
          <h4 className="text-[11.5px] font-black text-[#0EA5E9] uppercase tracking-widest flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Dias de Reunião da Congregação
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold text-[#94A3B8] uppercase">Dia de Meio de Semana</label>
              <select
                value={midweekDay}
                onChange={(e) => handleMidweekDayChange(parseInt(e.target.value))}
                className="w-full bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0EA5E9]"
              >
                {WEEKDAYS.map(day => (
                  <option key={day.value} value={day.value} className="bg-[#0F172A]">{day.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold text-[#94A3B8] uppercase">Dia de Fim de Semana</label>
              <select
                value={weekendDay}
                onChange={(e) => handleWeekendDayChange(parseInt(e.target.value))}
                className="w-full bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0EA5E9]"
              >
                {WEEKDAYS.map(day => (
                  <option key={day.value} value={day.value} className="bg-[#0F172A]">{day.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Header somente para Impressão */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide text-black">Relatório de Assistência às Reuniões</h1>
        <h2 className="text-md font-bold text-gray-700 mt-1 capitalize">
          {MONTHS[selectedMonth]} {selectedYear}
        </h2>
      </div>

      {/* Grid das Tabelas */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-6">
        
        {/* TABELA 1: MEIO DE SEMANA */}
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-6 print-card">
          <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
            <TrendingUp className="h-4 w-4 text-[#0EA5E9] no-print" />
            <h3 className="text-xs text-white uppercase tracking-wider">Meio de Semana</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B]/60">
                  <th className="text-[11.5px] font-black text-[#64748B] uppercase py-3 px-0.5 print:text-black">Tipo</th>
                  
                  {/* Semana 1 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 1</span>
                    <span className="text-[12px] text-[#0EA5E9] block mt-0.5">{midweekDates[0] || "—"}</span>
                  </th>
                  
                  {/* Semana 2 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 2</span>
                    <span className="text-[12px] text-[#0EA5E9] block mt-0.5">{midweekDates[1] || "—"}</span>
                  </th>
                  
                  {/* Semana 3 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 3</span>
                    <span className="text-[12px] text-[#0EA5E9] block mt-0.5">{midweekDates[2] || "—"}</span>
                  </th>
                  
                  {/* Semana 4 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 4</span>
                    <span className="text-[12px] text-[#0EA5E9] block mt-0.5">{midweekDates[3] || "—"}</span>
                  </th>
                  
                  {/* Semana 5 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 5</span>
                    <span className="text-[12px] text-[#0EA5E9] block mt-0.5">{midweekDates[4] || "—"}</span>
                  </th>
                  
                  <th className="text-center text-[11.5px] font-black text-[#64748B] uppercase py-3 px-0.5 print:text-black">Total</th>
                  <th className="text-center text-[11.5px] font-black text-[#64748B] uppercase py-3 px-0.5 print:text-black">Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/30">
                {/* Presencial */}
                <tr className="hover:bg-[#1E293B]/10 transition-colors">
                  <td className="text-xs font-bold text-[#94A3B8] py-3 px-0.5 print:text-black">Presencial</td>
                  {['w1', 'w2', 'w3', 'w4', 'w5'].map((week, idx) => {
                    const isActive = idx < midweekDates.length;
                    return (
                      <td key={week} className="py-2 px-0.5 text-center">
                        <div className="hidden print:block text-xs text-black font-semibold">
                          {isActive ? (attendance.midweek.presencial[week as keyof AttendanceRow] || "—") : "—"}
                        </div>
                        <input
                          type="text"
                          disabled={!isActive}
                          value={isActive ? attendance.midweek.presencial[week as keyof AttendanceRow] : ""}
                          onChange={(e) => handleInputChange('midweek', 'presencial', week as keyof AttendanceRow, e.target.value)}
                          className={`print:hidden mx-auto h-9 w-14 text-center bg-[#1E293B]/10 border text-xs text-white rounded-lg focus:outline-none transition-all ${
                            isActive 
                              ? 'border-[#1E293B]/50 hover:border-[#1E293B] focus:border-[#0EA5E9]' 
                              : 'border-transparent opacity-30 cursor-not-allowed placeholder-[#64748B]'
                          }`}
                          placeholder={isActive ? "0" : "—"}
                        />
                      </td>
                    );
                  })}
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{mwPresStats.total}</td>
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{mwPresStats.average}</td>
                </tr>

                {/* Conectados */}
                <tr className="hover:bg-[#1E293B]/10 transition-colors">
                  <td className="text-xs font-bold text-[#94A3B8] py-3 px-0.5 print:text-black">Conectados</td>
                  {['w1', 'w2', 'w3', 'w4', 'w5'].map((week, idx) => {
                    const isActive = idx < midweekDates.length;
                    return (
                      <td key={week} className="py-2 px-0.5 text-center">
                        <div className="hidden print:block text-xs text-black font-semibold">
                          {isActive ? (attendance.midweek.conectados[week as keyof AttendanceRow] || "—") : "—"}
                        </div>
                        <input
                          type="text"
                          disabled={!isActive}
                          value={isActive ? attendance.midweek.conectados[week as keyof AttendanceRow] : ""}
                          onChange={(e) => handleInputChange('midweek', 'conectados', week as keyof AttendanceRow, e.target.value)}
                          className={`print:hidden mx-auto h-9 w-14 text-center bg-[#1E293B]/10 border text-xs text-white rounded-lg focus:outline-none transition-all ${
                            isActive 
                              ? 'border-[#1E293B]/50 hover:border-[#1E293B] focus:border-[#0EA5E9]' 
                              : 'border-transparent opacity-30 cursor-not-allowed placeholder-[#64748B]'
                          }`}
                          placeholder={isActive ? "0" : "—"}
                        />
                      </td>
                    );
                  })}
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{mwConStats.total}</td>
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{mwConStats.average}</td>
                </tr>

                {/* Total Row */}
                <tr className="bg-[#1E293B]/10">
                  <td className="text-xs text-white py-3 px-0.5 print:text-black">Total</td>
                  <td className="text-xs text-center text-[#0EA5E9] py-3 px-0.5 print:text-black">
                    {midweekDates.length >= 1 ? mwTotalW1 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#0EA5E9] py-3 px-0.5 print:text-black">
                    {midweekDates.length >= 2 ? mwTotalW2 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#0EA5E9] py-3 px-0.5 print:text-black">
                    {midweekDates.length >= 3 ? mwTotalW3 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#0EA5E9] py-3 px-0.5 print:text-black">
                    {midweekDates.length >= 4 ? mwTotalW4 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#0EA5E9] py-3 px-0.5 print:text-black">
                    {midweekDates.length >= 5 ? mwTotalW5 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#0EA5E9] py-3 px-0.5 print:text-black">{mwGrandTotal}</td>
                  <td className="text-xs text-center text-[#0EA5E9] py-3 px-0.5 print:text-black">{mwGrandAverage}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABELA 2: FIM DE SEMANA */}
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-6 print-card">
          <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
            <TrendingUp className="h-4 w-4 text-[#34D399] no-print" />
            <h3 className="text-xs text-white uppercase tracking-wider">Fim de Semana</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B]/60">
                  <th className="text-[11.5px] font-black text-[#64748B] uppercase py-3 px-0.5 print:text-black">Tipo</th>
                  
                  {/* Semana 1 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 1</span>
                    <span className="text-[12px] text-[#34D399] block mt-0.5">{weekendDates[0] || "—"}</span>
                  </th>
                  
                  {/* Semana 2 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 2</span>
                    <span className="text-[12px] text-[#34D399] block mt-0.5">{weekendDates[1] || "—"}</span>
                  </th>
                  
                  {/* Semana 3 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 3</span>
                    <span className="text-[12px] text-[#34D399] block mt-0.5">{weekendDates[2] || "—"}</span>
                  </th>
                  
                  {/* Semana 4 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 4</span>
                    <span className="text-[12px] text-[#34D399] block mt-0.5">{weekendDates[3] || "—"}</span>
                  </th>
                  
                  {/* Semana 5 */}
                  <th className="text-center py-3 px-0.5">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block print:text-black">Semana 5</span>
                    <span className="text-[12px] text-[#34D399] block mt-0.5">{weekendDates[4] || "—"}</span>
                  </th>
                  
                  <th className="text-center text-[11.5px] font-black text-[#64748B] uppercase py-3 px-0.5 print:text-black">Total</th>
                  <th className="text-center text-[11.5px] font-black text-[#64748B] uppercase py-3 px-0.5 print:text-black">Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/30">
                {/* Presencial */}
                <tr className="hover:bg-[#1E293B]/10 transition-colors">
                  <td className="text-xs font-bold text-[#94A3B8] py-3 px-0.5 print:text-black">Presencial</td>
                  {['w1', 'w2', 'w3', 'w4', 'w5'].map((week, idx) => {
                    const isActive = idx < weekendDates.length;
                    return (
                      <td key={week} className="py-2 px-0.5 text-center">
                        <div className="hidden print:block text-xs text-black font-semibold">
                          {isActive ? (attendance.weekend.presencial[week as keyof AttendanceRow] || "—") : "—"}
                        </div>
                        <input
                          type="text"
                          disabled={!isActive}
                          value={isActive ? attendance.weekend.presencial[week as keyof AttendanceRow] : ""}
                          onChange={(e) => handleInputChange('weekend', 'presencial', week as keyof AttendanceRow, e.target.value)}
                          className={`print:hidden mx-auto h-9 w-14 text-center bg-[#1E293B]/10 border text-xs text-white rounded-lg focus:outline-none transition-all ${
                            isActive 
                              ? 'border-[#1E293B]/50 hover:border-[#1E293B] focus:border-[#0EA5E9]' 
                              : 'border-transparent opacity-30 cursor-not-allowed placeholder-[#64748B]'
                          }`}
                          placeholder={isActive ? "0" : "—"}
                        />
                      </td>
                    );
                  })}
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{wePresStats.total}</td>
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{wePresStats.average}</td>
                </tr>

                {/* Conectados */}
                <tr className="hover:bg-[#1E293B]/10 transition-colors">
                  <td className="text-xs font-bold text-[#94A3B8] py-3 px-0.5 print:text-black">Conectados</td>
                  {['w1', 'w2', 'w3', 'w4', 'w5'].map((week, idx) => {
                    const isActive = idx < weekendDates.length;
                    return (
                      <td key={week} className="py-2 px-0.5 text-center">
                        <div className="hidden print:block text-xs text-black font-semibold">
                          {isActive ? (attendance.weekend.conectados[week as keyof AttendanceRow] || "—") : "—"}
                        </div>
                        <input
                          type="text"
                          disabled={!isActive}
                          value={isActive ? attendance.weekend.conectados[week as keyof AttendanceRow] : ""}
                          onChange={(e) => handleInputChange('weekend', 'conectados', week as keyof AttendanceRow, e.target.value)}
                          className={`print:hidden mx-auto h-9 w-14 text-center bg-[#1E293B]/10 border text-xs text-white rounded-lg focus:outline-none transition-all ${
                            isActive 
                              ? 'border-[#1E293B]/50 hover:border-[#1E293B] focus:border-[#0EA5E9]' 
                              : 'border-transparent opacity-30 cursor-not-allowed placeholder-[#64748B]'
                          }`}
                          placeholder={isActive ? "0" : "—"}
                        />
                      </td>
                    );
                  })}
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{weConStats.total}</td>
                  <td className="text-xs text-center text-white py-3 px-0.5 print:text-black">{weConStats.average}</td>
                </tr>

                {/* Total Row */}
                <tr className="bg-[#1E293B]/10">
                  <td className="text-xs text-white py-3 px-0.5 print:text-black">Total</td>
                  <td className="text-xs text-center text-[#34D399] py-3 px-0.5 print:text-black">
                    {weekendDates.length >= 1 ? weTotalW1 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#34D399] py-3 px-0.5 print:text-black">
                    {weekendDates.length >= 2 ? weTotalW2 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#34D399] py-3 px-0.5 print:text-black">
                    {weekendDates.length >= 3 ? weTotalW3 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#34D399] py-3 px-0.5 print:text-black">
                    {weekendDates.length >= 4 ? weTotalW4 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#34D399] py-3 px-0.5 print:text-black">
                    {weekendDates.length >= 5 ? weTotalW5 : "—"}
                  </td>
                  <td className="text-xs text-center text-[#34D399] py-3 px-0.5 print:text-black">{weGrandTotal}</td>
                  <td className="text-xs text-center text-[#34D399] py-3 px-0.5 print:text-black">{weGrandAverage}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
