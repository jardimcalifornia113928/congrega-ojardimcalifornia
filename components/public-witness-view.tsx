'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Eye, Printer, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { doc, collection, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { CarrinhoPrintView } from './carrinho-print-view';

interface Publisher {
  id: string;
  firstName: string;
  lastName: string;
  designations: string[];
}

interface HorarioDesignacao {
  designado1: string;
  designado2: string;
}

interface DayRow {
  date: string;
  diaSemana: string;
  manha: HorarioDesignacao;
  tarde: HorarioDesignacao;
  noite: HorarioDesignacao;
}

interface CartData {
  carrinhoMacaco: DayRow[];
  carrinhoRetao: DayRow[];
}

const weekDayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function emptyHorario(): HorarioDesignacao {
  return { designado1: '', designado2: '' };
}

export function PublicWitnessView() {
  const { user } = useAuth();
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonth]);

  const [carrinhoMacaco, setCarrinhoMacaco] = useState<DayRow[]>([]);
  const [carrinhoRetao, setCarrinhoRetao] = useState<DayRow[]>([]);
  const [showPrint, setShowPrint] = useState(false);

  const getMonthDocId = (monthName: string) => {
    const index = months.indexOf(monthName);
    const year = new Date().getFullYear();
    const adjustedYear = index <= currentMonth ? year : year - 1;
    return `${adjustedYear}-${String(index + 1).padStart(2, '0')}`;
  };

  const getWeekDaysOfMonth = (monthName: string): DayRow[] => {
    const monthIndex = months.indexOf(monthName);
    const year = new Date().getFullYear();
    const adjustedYear = monthIndex <= currentMonth ? year : year - 1;
    const days: DayRow[] = [];
    const date = new Date(adjustedYear, monthIndex, 1);
    while (date.getMonth() === monthIndex) {
      const dow = date.getDay();
      if (dow >= 1 && dow <= 5) {
        days.push({
          date: `${String(date.getDate()).padStart(2, '0')}/${String(monthIndex + 1).padStart(2, '0')}`,
          diaSemana: weekDayNames[dow],
          manha: emptyHorario(),
          tarde: emptyHorario(),
          noite: emptyHorario(),
        });
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'publishers'), (snapshot) => {
      const pubs: Publisher[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        pubs.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          designations: data.designations || [],
        });
      });
      setPublishers(pubs);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar publicadores:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const days = getWeekDaysOfMonth(selectedMonth);
    const loadData = async () => {
      try {
        const docId = getMonthDocId(selectedMonth);
        const docRef = doc(db, 'public_witness', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as CartData;
          const mergeDays = (saved: DayRow[] | undefined, defaults: DayRow[]) =>
            saved?.length === defaults.length
              ? saved.map((row, i) => ({
                  ...defaults[i],
                  manha: { ...defaults[i].manha, ...row.manha },
                  tarde: { ...defaults[i].tarde, ...row.tarde },
                  noite: { ...defaults[i].noite, ...row.noite },
                }))
              : defaults;
          setCarrinhoMacaco(mergeDays(data.carrinhoMacaco, days));
          setCarrinhoRetao(mergeDays(data.carrinhoRetao, days));
        } else {
          setCarrinhoMacaco(days);
          setCarrinhoRetao(days);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [user, selectedMonth]);

  const updateDesignado = (
    cart: 'carrinhoMacaco' | 'carrinhoRetao',
    index: number,
    horario: 'manha' | 'tarde' | 'noite',
    slot: 'designado1' | 'designado2',
    value: string
  ) => {
    const setter = cart === 'carrinhoMacaco' ? setCarrinhoMacaco : setCarrinhoRetao;
    setter(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [horario]: { ...updated[index][horario], [slot]: value },
      };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    const toastId = toast.loading("Salvando...");
    try {
      const docId = getMonthDocId(selectedMonth);
      await setDoc(doc(db, 'public_witness', docId), { carrinhoMacaco, carrinhoRetao });
      toast.success("Salvo com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar.", { id: toastId });
    }
  };

  const handlePrint = async () => {
    try {
      const { generateCarrinhoPDF, openPDFForPrint } = await import('@/print/services/carrinho-pdf-generator');
      const pdfBytes = await generateCarrinhoPDF({
        month: selectedMonth,
        carrinhoMacaco,
        carrinhoRetao,
      });
      openPDFForPrint(pdfBytes);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir');
    }
  };

  const downloadPDF = async () => {
    try {
      const { generateCarrinhoPDF, downloadPDF } = await import('@/print/services/carrinho-pdf-generator');
      const pdfBytes = await generateCarrinhoPDF({
        month: selectedMonth,
        carrinhoMacaco,
        carrinhoRetao,
      });
      downloadPDF(pdfBytes, `testemunho-publico-${selectedMonth}.pdf`);
      toast.success('PDF salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const filteredPublishers = publishers
    .filter(p => p.designations?.includes("Serviço de campo::Testemunho público"))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  const horarios = [
    { key: 'manha' as const, label: '12:00-14:00' },
    { key: 'tarde' as const, label: '14:00-16:00' },
    { key: 'noite' as const, label: '16:00-18:00' },
  ];

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#050B14]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
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
              onClick={downloadPDF}
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
        <div className="bg-white">
          <CarrinhoPrintView
            month={selectedMonth}
            carrinhoMacaco={carrinhoMacaco}
            carrinhoRetao={carrinhoRetao}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end shrink-0 no-print">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Testemunho Público</h1>
          <p className="text-xs text-[#94A3B8] font-bold">Registro dos carrinhos utilizados no testemunho público.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPrint(true)}
            className="h-10 bg-transparent border border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9]/10 font-bold rounded-xl px-4 text-xs gap-2"
          >
            <Eye className="h-4 w-4" />
            Visualizar Impressão
          </Button>
          <Button
            onClick={handleSave}
            className="h-10 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 px-6 text-xs gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
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

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-6">
        {[{
          key: 'carrinhoMacaco' as const,
          title: 'Carrinho Macaco',
          desc: 'Carrinho de testemunho público padrão',
          data: carrinhoMacaco
        }, {
          key: 'carrinhoRetao' as const,
          title: 'Carrinho Retão',
          desc: 'Carrinho de testemunho público reto',
          data: carrinhoRetao
        }].map(cart => (
          <div key={cart.key} className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-3">
              <h3 className="text-xs font-black text-[#0EA5E9] uppercase tracking-wider">{cart.title}</h3>
              <p className="text-[10px] text-[#94A3B8] font-medium ml-2">{cart.desc}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <colgroup>
                  <col className="w-16" />
                  <col className="w-16" />
                {horarios.map(h => (
                  <React.Fragment key={h.key}>
                    <col className="w-44" />
                    <col className="w-44" />
                  </React.Fragment>
                ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-[#1E293B]/50">
                    <th rowSpan={2} className="text-left text-[10px] font-medium text-[#94A3B8] pb-2 pr-1">Dia</th>
                    <th rowSpan={2} className="text-left text-[10px] font-medium text-[#94A3B8] pb-2 pr-1">Data</th>
                  {horarios.map(h => (
                    <th key={h.key} colSpan={2} className="text-center text-[10px] font-medium text-[#0EA5E9] pb-2 px-1">{h.label}</th>
                  ))}
                  </tr>
                  <tr className="border-b border-[#1E293B]/30">
                    {horarios.map(h => (
                    <React.Fragment key={h.key}>
                      <th className="text-center text-[9px] font-medium text-[#64748B] pb-2 px-0.5">D1</th>
                      <th className="text-center text-[9px] font-medium text-[#64748B] pb-2 px-0.5">D2</th>
                    </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cart.data.map((row, index) => (
                    <tr key={row.date} className="border-b border-[#1E293B]/30">
                      <td className="py-1.5 pr-1 text-white font-medium text-xs whitespace-nowrap">{row.diaSemana}</td>
                      <td className="py-1.5 pr-1 text-white font-medium text-xs whitespace-nowrap">{row.date}</td>
                      {horarios.map(h => (
                        <React.Fragment key={h.key}>
                          {(['designado1', 'designado2'] as const).map(slot => (
                            <td key={slot} className="py-1 px-0.5">
                              <select
                                value={row[h.key][slot]}
                                onChange={(e) => updateDesignado(cart.key, index, h.key, slot, e.target.value)}
                                className="w-full px-1 py-1 text-[10px] bg-[#1E293B]/50 border border-[#1E293B]/60 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                              >
                                <option value="">---</option>
                                {filteredPublishers.map(p => (
                                  <option key={p.id} value={`${p.firstName} ${p.lastName}`}>
                                    {p.firstName} {p.lastName}
                                  </option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
