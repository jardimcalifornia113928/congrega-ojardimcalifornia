'use client';

import React, { useState, useEffect } from 'react';
import { Printer, FileText, Save, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { generateCleaningPDF, openPDFForPrint, downloadPDF as downloadPDFBlob } from '@/print/services/cleaning-pdf-generator';

const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function getDaysInMonth(year: number, month: number, weekday: number) {
  const days: number[] = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let d = new Date(first);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  while (d <= last) {
    days.push(d.getDate());
    d.setDate(d.getDate() + 7);
  }
  return days;
}

export function CleaningView() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [cleaning, setCleaning] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [midweekDay, setMidweekDay] = useState(2);
  const [weekendDay, setWeekendDay] = useState(6);

  const monthLabel = MONTHS[month];
  const midweekDates = getDaysInMonth(year, month, midweekDay);
  const weekendDates = getDaysInMonth(year, month, weekendDay);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'groups'), snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, name: d.data().name || '' })));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'settings', `congregation_${user.uid}`));
      if (snap.exists()) {
        const data = snap.data();
        if (data.midweekDay !== undefined) setMidweekDay(data.midweekDay);
        if (data.weekendDay !== undefined) setWeekendDay(data.weekendDay);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'cleaning', `cleaning-${monthLabel}-${year}`), snap => {
      if (snap.exists()) setCleaning(snap.data().cleaning || {});
      else setCleaning({});
    });
    return () => unsub();
  }, [user, month, year]);

  const handleCleanChange = (key: string, value: string) => {
    setCleaning(prev => ({ ...prev, [key]: value }));
  };

  const handlePrint = async () => {
    try {
      const pdfBytes = await generateCleaningPDF({
        month: monthLabel,
        year,
        midweekDates,
        weekendDates,
        cleaning,
        groups: groups.map(g => g.name),
      });
      openPDFForPrint(pdfBytes);
    } catch { toast.error('Erro ao imprimir'); }
  };

  const handleDownload = async () => {
    try {
      const pdfBytes = await generateCleaningPDF({
        month: monthLabel,
        year,
        midweekDates,
        weekendDates,
        cleaning,
        groups: groups.map(g => g.name),
      });
      downloadPDFBlob(pdfBytes, `limpeza-${monthLabel}-${year}.pdf`);
      toast.success('PDF salvo!');
    } catch { toast.error('Erro ao gerar PDF'); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'cleaning', `cleaning-${monthLabel}-${year}`), { cleaning, month: monthLabel, year });
      toast.success('Salvo com sucesso!');
    } catch { toast.error('Erro ao salvar'); }
    setSaving(false);
  };

  const renderTable = (section: 'midweek' | 'weekend', dates: number[]) => {
    const prefix = section === 'midweek' ? 'mw' : 'we';
    return (
      <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
          <Calendar className="h-4 w-4 text-[#0EA5E9]" />
          <h3 className="text-xs text-white uppercase tracking-wider">
            {section === 'midweek' ? 'Meio de Semana' : 'Fim de Semana'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B]/60">
                <th className="text-[11.5px] font-black text-[#64748B] uppercase py-3 px-0.5">Grupo</th>
                {dates.map((day, i) => (
                  <th key={i} className="text-center py-3 px-2">
                    <span className="text-[11.5px] font-black text-[#64748B] uppercase block">Dia {day}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/30">
              <tr className="hover:bg-[#1E293B]/10 transition-colors">
                <td className="text-xs font-bold text-[#94A3B8] py-3 px-0.5">Grupo</td>
                {dates.map((_, wi) => (
                  <td key={wi} className="py-2 px-1 text-center">
                    <select
                      value={cleaning[`${prefix}_${wi}`] || ''}
                      onChange={e => handleCleanChange(`${prefix}_${wi}`, e.target.value)}
                      className="w-full text-xs bg-slate-800 border border-slate-600 rounded-md text-white px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">—</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-white uppercase tracking-wider">Limpeza</h1>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-1 text-xs font-bold focus:outline-none">
              {MONTHS.map((m, i) => (<option key={i} value={i}>{m}</option>))}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="bg-[#1E293B]/40 border border-[#1E293B]/60 text-white rounded-lg px-3 py-1 text-xs font-bold focus:outline-none">
              {Array.from({ length: 7 }, (_, i) => 2024 + i).map(y => (<option key={y} value={y}>{y}</option>))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button onClick={handlePrint}
              className="h-10 border border-[#334155] text-white font-bold rounded-xl gap-2 px-5 text-xs hover:bg-white/10">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={handleDownload}
              className="h-10 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl gap-2 px-5 text-xs">
              <FileText className="h-4 w-4" />
              Salvar PDF
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="h-10 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 px-6 text-xs gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-6">
          {renderTable('midweek', midweekDates)}
          {renderTable('weekend', weekendDates)}
        </div>
      </div>
    </div>
  );
}
