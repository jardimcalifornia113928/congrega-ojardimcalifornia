'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Printer,
  Save,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wrench,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  query,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { MeetingPreviewModal, type MidweekPreviewData, type WeekendPreviewData } from '@/components/meeting-preview-modal';

// ==========================================
// AUTOCOMPLETE INPUT COMPONENT FOR PUBLISHERS
// ==========================================
interface PublisherInputProps {
  value: string;
  onChange: (value: string) => void;
  publishers: any[];
  roleName: string;
  placeholder?: string;
}

function PublisherInput({
  value,
  onChange,
  publishers,
  roleName,
  placeholder = "Selecionar..."
}: PublisherInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

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

  const getRoleDesignationKey = (role: string): string => {
    if (role === "Presidente") return "Fim de semana::Presidente";
    if (role === "Oração inicial") return "Fim de semana::Oração inicial";
    if (role === "Oração final") return "Fim de semana::Oração final";
    if (role === "Orador local") return "Fim de semana::Orador local";
    if (role === "Orador visitante") return "Fim de semana::Orador fora";
    if (role === "Dirigente A sentinela") return "Fim de semana::Dirigente A Sentinela";
    if (role === "Leitor A sentinela") return "Fim de semana::Leitor";
    if (role === "Indicador 01" || role === "Indicador 02") return "Designação Mecânica::Indicador";
    if (role === "Microfone 01" || role === "Microfone 02") return "Designação Mecânica::Microfones";
    if (role === "Palco") return "Designação Mecânica::Palco";
    if (role === "Audio e Video") return "Designação Mecânica::Som";
    return "";
  };

  const designationKey = getRoleDesignationKey(roleName);

  const filteredPubs = publishers
    .filter(p => {
      if (!p || !p.firstName || !p.lastName) return false;
      const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = fullName.includes((search || "").toLowerCase());
      const hasDesignation = designationKey ? p.designations?.includes(designationKey) : false;
      return matchesSearch && hasDesignation;
    })
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const handleSelect = (fullName: string) => {
    onChange(fullName);
    setSearch(fullName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="hidden print:block text-xs font-medium text-black border-b border-gray-300 pb-1 min-h-[18px]">
        {value || "—"}
      </div>

      <input
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="print:hidden w-full bg-[#1E293B]/20 border border-[#1E293B]/50 hover:border-[#1E293B] focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
      />
      {isOpen && filteredPubs.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-xl scrollbar-thin">
          <div className="p-1">
            <div className="px-2 py-1 text-[9px] font-black text-[#0EA5E9] uppercase tracking-wider">{designationKey || roleName}</div>
            {filteredPubs.map(p => {
              const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(name)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs text-white font-medium transition-colors"
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN WEEKEND VIEW COMPONENT
// ==========================================
interface WeekendMeetingData {
  openingPrayer: string;
  closingPrayer: string;
  president: string;
  localSpeaker: string;
  visitingSpeaker: string;
  talkTheme: string;
  watchtowerConductor: string;
  watchtowerReader: string;

  // Designação Mecanica
  mechanicalIndicador1: string;
  mechanicalIndicador2: string;
  mechanicalMicrofone1: string;
  mechanicalMicrofone2: string;
  mechanicalPalco: string;
  mechanicalAudioVideo: string;
}

const defaultMeetingData: WeekendMeetingData = {
  openingPrayer: "",
  closingPrayer: "",
  president: "",
  localSpeaker: "",
  visitingSpeaker: "",
  talkTheme: "",
  watchtowerConductor: "",
  watchtowerReader: "",

  mechanicalIndicador1: "",
  mechanicalIndicador2: "",
  mechanicalMicrofone1: "",
  mechanicalMicrofone2: "",
  mechanicalPalco: "",
  mechanicalAudioVideo: ""
};

export function WeekendView() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const [publishers, setPublishers] = useState<any[]>([]);
  const [meetingData, setMeetingData] = useState<WeekendMeetingData>(defaultMeetingData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [midweekData, setMidweekData] = useState<MidweekPreviewData | null>(null);
  const [savedWeeks, setSavedWeeks] = useState<string[]>([]);

  const getMondayStr = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const mondayStr = getMondayStr(selectedDate);

  const formatWeekRange = (monday: Date): string => {
    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const monthName = months[monday.getMonth()];

    if (monday.getMonth() !== sunday.getMonth()) {
      const nextMonthName = months[sunday.getMonth()];
      return `${monthName} ${startDay} - ${nextMonthName} ${endDay}`;
    }

    return `${monthName} ${startDay}-${endDay}`;
  };

  const handlePrevWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 7);
    setSelectedDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 7);
    setSelectedDate(next);
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'publishers')
    );
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const pubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (a.firstName || "").localeCompare(b.firstName || ""));
      setPublishers(pubs);
    });
    return () => unsubscribe();
  }, [user]);

  // Load saved weeks list
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'weekend_meetings'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const weeks = snap.docs.map(d => d.id).sort().reverse();
      setSavedWeeks(weeks);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const docRef = doc(db, 'weekend_meetings', mondayStr);
    const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMeetingData({
          ...defaultMeetingData,
          ...data
        } as WeekendMeetingData);
      } else {
        setMeetingData(defaultMeetingData);
      }
      setIsLoading(false);
    }, (error: unknown) => {
      console.error("Error loading weekend meeting:", error);
      setIsLoading(false);
      handleFirestoreError(error, OperationType.GET, `weekend_meetings/${mondayStr}`);
    });

    return () => unsubscribe();
  }, [user, mondayStr]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const toastId = toast.loading("Salvando programação...");
    try {
      await setDoc(doc(db, 'weekend_meetings', mondayStr), {
        ...meetingData,
        weekMonday: mondayStr,
        weekFormatted: formatWeekRange(selectedDate),
        updatedAt: new Date().toISOString()
      });
      toast.success("Programação salva!", { id: toastId });
    } catch (error) {
      console.error("Error saving weekend meeting:", error);
      handleFirestoreError(error, OperationType.WRITE, `weekend_meetings/${mondayStr}`);
      toast.error("Erro ao salvar", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!user) return;
    setIsPreviewLoading(true);
    try {
      const snap = await getDoc(doc(db, 'midweek_meetings', mondayStr));
      const f = (v?: string) => v || '';

      if (snap.exists()) {
        const d = snap.data();
        setMidweekData({
          weekRange: formatWeekRange(selectedDate),
          president: f(d.president),
          openingPrayer: f(d.openingPrayer),
          closingPrayer: f(d.closingPrayer),
          talkSpeaker: f(d.talkSpeaker),
          talkTheme: f(d.talkTheme),
          gemsSpeaker: f(d.gemsSpeaker),
          bibleReadingReader: f(d.bibleReadingReader),
          part1Theme: f(d.part1Theme), part1Speaker: f(d.part1Speaker),
          part1Assistant: f(d.part1Assistant), part1SecondHelper: f(d.part1SecondHelper),
          part2Theme: f(d.part2Theme), part2Speaker: f(d.part2Speaker),
          part2Assistant: f(d.part2Assistant), part2SecondHelper: f(d.part2SecondHelper),
          part3Theme: f(d.part3Theme), part3Speaker: f(d.part3Speaker),
          part3Assistant: f(d.part3Assistant), part3SecondHelper: f(d.part3SecondHelper),
          part4Theme: f(d.part4Theme), part4Speaker: f(d.part4Speaker),
          part4Assistant: f(d.part4Assistant), part4SecondHelper: f(d.part4SecondHelper),
          lifePart1Theme: f(d.lifePart1Theme), lifePart1Speaker: f(d.lifePart1Speaker),
          lifePart2Theme: f(d.lifePart2Theme), lifePart2Speaker: f(d.lifePart2Speaker),
          lifePart3Theme: f(d.lifePart3Theme), lifePart3Speaker: f(d.lifePart3Speaker),
          cbsConductor: f(d.cbsConductor), cbsReader: f(d.cbsReader),
          mechanicalIndicador1: f(d.mechanicalIndicador1),
          mechanicalIndicador2: f(d.mechanicalIndicador2),
          mechanicalMicrofone1: f(d.mechanicalMicrofone1),
          mechanicalMicrofone2: f(d.mechanicalMicrofone2),
          mechanicalPalco: f(d.mechanicalPalco),
          mechanicalAudioVideo: f(d.mechanicalAudioVideo),
        });
      } else {
        setMidweekData(null);
      }
      setShowPreview(true);
    } catch (error) {
      console.error("Error loading midweek data:", error);
      toast.error("Erro ao carregar dados do meio de semana.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updateField = (key: keyof WeekendMeetingData, value: any) => {
    setMeetingData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#050B14]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
    <div className="flex-1 overflow-y-auto pr-2 space-y-6">

      {/* Header (Não imprime no papel) */}
      <div className="flex justify-between items-end shrink-0 no-print">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Reunião de Fim de Semana</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevWeek}
              className="h-8 w-8 border-[#1E293B] text-[#94A3B8] hover:text-white rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold text-white uppercase bg-[#1E293B]/40 px-3 py-1 rounded-lg">
              {formatWeekRange(selectedDate)}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextWeek}
              className="h-8 w-8 border-[#1E293B] text-[#94A3B8] hover:text-white rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Saved indicator */}
            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${savedWeeks.includes(mondayStr) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {savedWeeks.includes(mondayStr) ? 'Salvo' : 'Não salvo'}
            </span>

            <div className="relative overflow-hidden">
              <input
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => {
                  if (e.target.value) {
                    const pickedDate = new Date(e.target.value + 'T00:00:00');
                    const day = pickedDate.getDay();
                    const diff = pickedDate.getDate() - day + (day === 0 ? -6 : 1);
                    setSelectedDate(new Date(pickedDate.setDate(diff)));
                  }
                }}
              />
              <Button variant="outline" className="h-8 border-[#1E293B] text-[#94A3B8] font-bold rounded-lg gap-2 px-3 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                Buscar Data
              </Button>
            </div>

            {/* Saved weeks dropdown */}
            {savedWeeks.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const parts = e.target.value.split('-');
                    setSelectedDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                  }
                }}
                className="bg-[#1E293B]/40 border border-[#1E293B]/50 text-white text-xs rounded-lg px-2 py-1.5 h-8 focus:outline-none focus:border-[#0EA5E9] cursor-pointer"
              >
                <option value="">Semanas salvas</option>
                {savedWeeks.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handlePreview}
            disabled={isPreviewLoading}
            variant="outline"
            className="h-10 border-[#0EA5E9]/50 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 font-bold rounded-xl gap-2 px-5 text-xs transition-all"
          >
            {isPreviewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
            Visualizar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 px-6 text-xs gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Quadro"}
          </Button>
        </div>
      </div>

      {/* Header somente para Impressão */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide text-black">Programação da Reunião de Fim de Semana</h1>
        <h2 className="text-md font-bold text-gray-700 mt-1 capitalize">{formatWeekRange(selectedDate)}</h2>
      </div>

      {/* CARD 1: FIM DE SEMANA */}
      <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-5 mb-6 print-card">
        <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
          <Sparkles className="h-4 w-4 text-emerald-400 no-print" />
          <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Fim de Semana</h3>
        </div>
        <div className="space-y-4">

          {/* Oração inicial + Oração final + Presidente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Oração inicial</label>
              <PublisherInput
                value={meetingData.openingPrayer}
                onChange={(val) => updateField("openingPrayer", val)}
                publishers={publishers}
                roleName="Oração inicial"
                placeholder="Oração inicial"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Oração final</label>
              <PublisherInput
                value={meetingData.closingPrayer}
                onChange={(val) => updateField("closingPrayer", val)}
                publishers={publishers}
                roleName="Oração final"
                placeholder="Oração final"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Presidente</label>
              <PublisherInput
                value={meetingData.president}
                onChange={(val) => updateField("president", val)}
                publishers={publishers}
                roleName="Presidente"
                placeholder="Presidente"
              />
            </div>
          </div>

          {/* Orador local + Orador visitante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Orador local</label>
              <PublisherInput
                value={meetingData.localSpeaker}
                onChange={(val) => updateField("localSpeaker", val)}
                publishers={publishers}
                roleName="Orador local"
                placeholder="Orador local"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Orador visitante</label>
              <div className="hidden print:block text-xs font-medium text-black border-b border-gray-300 pb-1 min-h-[18px]">
                {meetingData.visitingSpeaker || "—"}
              </div>
              <input
                type="text"
                value={meetingData.visitingSpeaker}
                onChange={(e) => updateField("visitingSpeaker", e.target.value)}
                placeholder="Nome do orador visitante"
                className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Tema do discurso */}
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Tema do discurso</label>
            <div className="hidden print:block text-xs font-medium text-black border-b border-gray-300 pb-1 min-h-[18px]">
              {meetingData.talkTheme || "—"}
            </div>
            <select
              value={meetingData.talkTheme}
              onChange={(e) => updateField("talkTheme", e.target.value)}
              className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
            >
              <option value="">Selecione um tema...</option>
              <option value="1. Você conhece bem a Deus?">1. Você conhece bem a Deus?</option>
              <option value="2. Você vai sobreviver aos últimos dias?">2. Você vai sobreviver aos últimos dias?</option>
              <option value="3. Você está avançando com a organização unida de Jeová?">3. Você está avançando com a organização unida de Jeová?</option>
              <option value="4. Que provas temos de que Deus existe?">4. Que provas temos de que Deus existe?</option>
              <option value="5. Você pode ter uma família feliz!">5. Você pode ter uma família feliz!</option>
              <option value="6. O dilúvio dos dias de Noé e você">6. O dilúvio dos dias de Noé e você</option>
              <option value="7. Imite a misericórdia de Jeová">7. Imite a misericórdia de Jeová</option>
              <option value="8. Viva para fazer a vontade de Deus">8. Viva para fazer a vontade de Deus</option>
              <option value="9. Escute e faça o que a Bíblia diz">9. Escute e faça o que a Bíblia diz</option>
              <option value="10. Seja honesto em tudo">10. Seja honesto em tudo</option>
              <option value="11. Imite a Jesus e não faça parte do mundo">11. Imite a Jesus e não faça parte do mundo</option>
              <option value="12. Deus quer que você respeite quem tem autoridade">12. Deus quer que você respeite quem tem autoridade</option>
              <option value="13. Qual o ponto de vista de Deus sobre o sexo e o casamento?">13. Qual o ponto de vista de Deus sobre o sexo e o casamento?</option>
              <option value="14. Um povo puro e limpo honra a Jeová">14. Um povo puro e limpo honra a Jeová</option>
              <option value="15. ‘Faça o bem a todos’">15. ‘Faça o bem a todos’</option>
              <option value="16. Seja cada vez mais amigo de Jeová">16. Seja cada vez mais amigo de Jeová</option>
              <option value="17. Glorifique a Deus com tudo o que você tem">17. Glorifique a Deus com tudo o que você tem</option>
              <option value="18. Faça de Jeová a sua fortaleza">18. Faça de Jeová a sua fortaleza</option>
              <option value="19. Como você pode saber seu futuro?">19. Como você pode saber seu futuro?</option>
              <option value="20. Chegou o tempo de Deus governar o mundo?">20. Chegou o tempo de Deus governar o mundo?</option>
              <option value="21. Dê valor ao seu lugar no Reino de Deus">21. Dê valor ao seu lugar no Reino de Deus</option>
              <option value="22. Você está usando bem o que Jeová lhe dá?">22. Você está usando bem o que Jeová lhe dá?</option>
              <option value="23. A vida tem objetivo">23. A vida tem objetivo</option>
              <option value="24. Você encontrou “uma pérola de grande valor”?">24. Você encontrou “uma pérola de grande valor”?</option>
              <option value="25. Lute contra o espírito do mundo">25. Lute contra o espírito do mundo</option>
              <option value="26. Você é importante para Deus?">26. Você é importante para Deus?</option>
              <option value="27. Como construir um casamento feliz">27. Como construir um casamento feliz</option>
              <option value="28. Mostre respeito e amor no seu casamento">28. Mostre respeito e amor no seu casamento</option>
              <option value="29. As responsabilidades e recompensas de ter filhos">29. As responsabilidades e recompensas de ter filhos</option>
              <option value="30. Como melhorar a comunicação na família">30. Como melhorar a comunicação na família</option>
              <option value="31. Você tem consciência da sua necessidade espiritual?">31. Você tem consciência da sua necessidade espiritual?</option>
              <option value="32. Como lidar com as ansiedades da vida">32. Como lidar com as ansiedades da vida</option>
              <option value="33. Quando vai existir verdadeira justiça?">33. Quando vai existir verdadeira justiça?</option>
              <option value="34. Você vai ser marcado para sobreviver?">34. Você vai ser marcado para sobreviver?</option>
              <option value="35. É possível viver para sempre? O que você precisa fazer?">35. É possível viver para sempre? O que você precisa fazer?</option>
              <option value="36. Será que a vida é só isso?">36. Será que a vida é só isso?</option>
              <option value="37. Obedecer a Deus é mesmo a melhor coisa a fazer?">37. Obedecer a Deus é mesmo a melhor coisa a fazer?</option>
              <option value="38. Como você pode sobreviver ao fim do mundo?">38. Como você pode sobreviver ao fim do mundo?</option>
              <option value="39. Jesus Cristo vence o mundo — Como e quando?">39. Jesus Cristo vence o mundo — Como e quando?</option>
              <option value="40. O que vai acontecer em breve?">40. O que vai acontecer em breve?</option>
              <option value="41. Fiquem parados e vejam como Jeová os salvará">41. Fiquem parados e vejam como Jeová os salvará</option>
              <option value="42. O amor pode vencer o ódio?">42. O amor pode vencer o ódio?</option>
              <option value="43. Tudo o que Deus nos pede é para o nosso bem">43. Tudo o que Deus nos pede é para o nosso bem</option>
              <option value="44. Como os ensinos de Jesus podem ajudar você?">44. Como os ensinos de Jesus podem ajudar você?</option>
              <option value="45. Continue andando no caminho que leva à vida">45. Continue andando no caminho que leva à vida</option>
              <option value="46. Fortaleça sua confiança em Jeová">46. Fortaleça sua confiança em Jeová</option>
              <option value="47. ‘Tenha fé nas boas novas’">47. ‘Tenha fé nas boas novas’</option>
              <option value="48. Seja leal a Deus mesmo quando for testado">48. Seja leal a Deus mesmo quando for testado</option>
              <option value="49. Será que um dia a Terra vai ser limpa?">49. Será que um dia a Terra vai ser limpa?</option>
              <option value="50. Como sempre tomar as melhores decisões">50. Como sempre tomar as melhores decisões</option>
              <option value="51. Será que a verdade da Bíblia está mudando a sua vida?">51. Será que a verdade da Bíblia está mudando a sua vida?</option>
              <option value="52. Quem é o seu Deus?">52. Quem é o seu Deus?</option>
              <option value="53. Você pensa como Deus?">53. Você pensa como Deus?</option>
              <option value="54. Fortaleça sua fé em Deus e em suas promessas">54. Fortaleça sua fé em Deus e em suas promessas</option>
              <option value="55. Você está fazendo um bom nome perante Deus?">55. Você está fazendo um bom nome perante Deus?</option>
              <option value="56. Existe um líder em quem você pode confiar?">56. Existe um líder em quem você pode confiar?</option>
              <option value="57. Como suportar perseguição">57. Como suportar perseguição</option>
              <option value="58. Quem são os verdadeiros seguidores de Cristo?">58. Quem são os verdadeiros seguidores de Cristo?</option>
              <option value="59. Ceifará o que semear">59. Ceifará o que semear</option>
              <option value="60. Você tem um objetivo na vida?">60. Você tem um objetivo na vida?</option>
              <option value="61. Nas promessas de quem você confia?">61. Nas promessas de quem você confia?</option>
              <option value="62. Onde encontrar uma esperança real para o futuro?">62. Onde encontrar uma esperança real para o futuro?</option>
              <option value="63. É possível encontrar a verdade?">63. É possível encontrar a verdade?</option>
              <option value="64. Você ama os prazeres ou a Deus?">64. Você ama os prazeres ou a Deus?</option>
              <option value="65. Como podemos ser pacíficos num mundo cheio de ódio">65. Como podemos ser pacíficos num mundo cheio de ódio</option>
              <option value="66. Você também vai participar na colheita?">66. Você também vai participar na colheita?</option>
              <option value="67. Medite na Bíblia e nas criações de Jeová">67. Medite na Bíblia e nas criações de Jeová</option>
              <option value="68. ‘Continuem a perdoar uns aos outros liberalmente’">68. ‘Continuem a perdoar uns aos outros liberalmente’</option>
              <option value="69. Por que mostrar amor abnegado?">69. Por que mostrar amor abnegado?</option>
              <option value="70. Por que Deus merece sua confiança?">70. Por que Deus merece sua confiança?</option>
              <option value="71. ‘Mantenha-se desperto’ — Por que e como?">71. ‘Mantenha-se desperto’ — Por que e como?</option>
              <option value="72. O amor identifica os cristãos verdadeiros">72. O amor identifica os cristãos verdadeiros</option>
              <option value="73. Você tem “um coração sábio”?">73. Você tem “um coração sábio”?</option>
              <option value="74. Os olhos de Jeová estão em todo lugar">74. Os olhos de Jeová estão em todo lugar</option>
              <option value="75. Mostre que você apoia o direito de Jeová governar">75. Mostre que você apoia o direito de Jeová governar</option>
              <option value="76. Princípios bíblicos — Podem nos ajudar a lidar com os problemas atuais?">76. Princípios bíblicos — Podem nos ajudar a lidar com os problemas atuais?</option>
              <option value="77. “Sempre mostrem hospitalidade”">77. “Sempre mostrem hospitalidade”</option>
              <option value="78. Sirva a Jeová com um coração alegre">78. Sirva a Jeová com um coração alegre</option>
              <option value="79. Você vai escolher ser amigo de Deus?">79. Você vai escolher ser amigo de Deus?</option>
              <option value="80. Você baseia sua esperança na ciência ou na Bíblia?">80. Você baseia sua esperança na ciência ou na Bíblia?</option>
              <option value="81. Quem está qualificado para fazer discípulos?">81. Quem está qualificado para fazer discípulos?</option>
              <option value="82. Jeová e Cristo fazem parte de uma trindade?">82. Jeová e Cristo fazem parte de uma trindade?</option>
              <option value="83. Será que os cristãos precisam obedecer aos Dez Mandamentos?">83. Será que os cristãos precisam obedecer aos Dez Mandamentos?</option>
              <option value="84. Escapará do destino deste mundo?">84. Escapará do destino deste mundo?</option>
              <option value="85. Boas notícias num mundo violento">85. Boas notícias num mundo violento</option>
              <option value="86. Como orar a Deus e ser ouvido por ele?">86. Como orar a Deus e ser ouvido por ele?</option>
              <option value="87. Qual é a sua relação com Deus?">87. Qual é a sua relação com Deus?</option>
              <option value="88. Por que viver de acordo com os padrões da Bíblia?">88. Por que viver de acordo com os padrões da Bíblia?</option>
              <option value="89. Quem tem sede da verdade, venha!">89. Quem tem sede da verdade, venha!</option>
              <option value="90. Faça o máximo para alcançar a verdadeira vida!">90. Faça o máximo para alcançar a verdadeira vida!</option>
              <option value="91. A presença do Messias e seu domínio">91. A presença do Messias e seu domínio</option>
              <option value="92. O papel da religião nos assuntos do mundo">92. O papel da religião nos assuntos do mundo</option>
              <option value="93. Desastres naturais — Quando vão acabar?">93. Desastres naturais — Quando vão acabar?</option>
              <option value="94. A religião verdadeira atende às necessidades da sociedade humana">94. A religião verdadeira atende às necessidades da sociedade humana</option>
              <option value="95. Não seja enganado pelo ocultismo!">95. Não seja enganado pelo ocultismo!</option>
              <option value="96. O que vai acontecer com as religiões?">96. O que vai acontecer com as religiões?</option>
              <option value="97. Permaneçamos inculpes em meio a uma geração pervertida">97. Permaneçamos inculpes em meio a uma geração pervertida</option>
              <option value="98. “A cena deste mundo está mudando”">98. “A cena deste mundo está mudando”</option>
              <option value="99. Por que podemos confiar no que a Bíblia diz?">99. Por que podemos confiar no que a Bíblia diz?</option>
              <option value="100. Como fazer amizades fortes e verdadeiras">100. Como fazer amizades fortes e verdadeiras</option>
              <option value="101. Jeová é o “Grandioso Criador”">101. Jeová é o “Grandioso Criador”</option>
              <option value="102. Preste atenção à “palavra profética”">102. Preste atenção à “palavra profética”</option>
              <option value="103. Como você pode ter a verdadeira alegria?">103. Como você pode ter a verdadeira alegria?</option>
              <option value="104. Pais, vocês estão construindo com materiais à prova de fogo?">104. Pais, vocês estão construindo com materiais à prova de fogo?</option>
              <option value="105. Somos consolados em todas as nossas tribulações">105. Somos consolados em todas as nossas tribulações</option>
              <option value="106. Arruinar a terra provocará retribuição divina">106. Arruinar a terra provocará retribuição divina</option>
              <option value="107. Você está treinando bem a sua consciência?">107. Você está treinando bem a sua consciência?</option>
              <option value="108. Você pode encarar o futuro com confiança!">108. Você pode encarar o futuro com confiança!</option>
              <option value="109. O Reino de Deus está próximo">109. O Reino de Deus está próximo</option>
              <option value="110. Deus vem primeiro na vida familiar bem-sucedida">110. Deus vem primeiro na vida familiar bem-sucedida</option>
              <option value="111. É possível que a humanidade seja completamente curada?">111. É possível que a humanidade seja completamente curada?</option>
              <option value="112. Como mostrar amor num mundo egoísta">112. Como mostrar amor num mundo egoísta</option>
              <option value="113. Jovens - Como vocês podem ter uma vida feliz?">113. Jovens - Como vocês podem ter uma vida feliz?</option>
              <option value="114. Apreço pelas maravilhas da criação de Deus">114. Apreço pelas maravilhas da criação de Deus</option>
              <option value="115. Não caia nas armadilhas de Satanás">115. Não caia nas armadilhas de Satanás</option>
              <option value="116. Escolha sabiamente com quem irá associar-se!">116. Escolha sabiamente com quem irá associar-se!</option>
              <option value="117. Como vencer o mal com o bem">117. Como vencer o mal com o bem</option>
              <option value="118. Olhemos os jovens do ponto de vista de Jeová">118. Olhemos os jovens do ponto de vista de Jeová</option>
              <option value="119. Por que é benéfico que os cristãos vivam separados do mundo">119. Por que é benéfico que os cristãos vivam separados do mundo</option>
              <option value="120. Por que se submeter à regência de Deus agora">120. Por que se submeter à regência de Deus agora</option>
              <option value="121. Uma família mundial que será salva da destruição">121. Uma família mundial que será salva da destruição</option>
              <option value="122. Paz global — de onde virá?">122. Paz global — de onde virá?</option>
              <option value="123. Por que os cristãos têm de ser diferentes">123. Por que os cristãos têm de ser diferentes</option>
              <option value="124. Razões para crer que a Bíblia é de autoria divina">124. Razões para crer que a Bíblia é de autoria divina</option>
              <option value="125. Por que a humanidade precisa de resgate">125. Por que a humanidade precisa de resgate</option>
              <option value="126. Quem se salvará?">126. Quem se salvará?</option>
              <option value="127. O que acontece quando morremos?">127. O que acontece quando morremos?</option>
              <option value="128. É o inferno um lugar de tormento ardente?">128. É o inferno um lugar de tormento ardente?</option>
              <option value="129. O que a Bíblia diz sobre a Trindade?">129. O que a Bíblia diz sobre a Trindade?</option>
              <option value="130. A terra permanecerá para sempre">130. A terra permanecerá para sempre</option>
              <option value="131. Tome posição contra o Diabo!">131. Tome posição contra o Diabo!</option>
              <option value="132. Ressurreição — A vitória sobre a morte!">132. Ressurreição — A vitória sobre a morte!</option>
              <option value="133. Tem importância o que cremos sobre a nossa origem?">133. Tem importância o que cremos sobre a nossa origem?</option>
              <option value="134. Será que os cristãos precisam guardar o sábado?">134. Será que os cristãos precisam guardar o sábado?</option>
              <option value="135. A santidade da vida e do sangue">135. A santidade da vida e do sangue</option>
              <option value="136. Será que Deus aprova o uso de imagens na adoração?">136. Será que Deus aprova o uso de imagens na adoração?</option>
              <option value="137. Ocorreram realmente os milagres da Bíblia?">137. Ocorreram realmente os milagres da Bíblia?</option>
              <option value="138. Viva com bom juízo num mundo depravado">138. Viva com bom juízo num mundo depravado</option>
              <option value="139. Sabedoria divina num mundo científico">139. Sabedoria divina num mundo científico</option>
              <option value="140. Quem é realmente Jesus Cristo?">140. Quem é realmente Jesus Cristo?</option>
              <option value="141. Quando terão fim os gemidos da criação humana?">141. Quando terão fim os gemidos da criação humana?</option>
              <option value="142. Por que refugiar-se em Jeová">142. Por que refugiar-se em Jeová</option>
              <option value="143. Confie no Deus de todo consolo">143. Confie no Deus de todo consolo</option>
              <option value="144. Uma congregação leal sob a liderança de Cristo">144. Uma congregação leal sob a liderança de Cristo</option>
              <option value="145. Quem é semelhante a Jeová, nosso Deus?">145. Quem é semelhante a Jeová, nosso Deus?</option>
              <option value="146. Use a educação para louvar a Jeová">146. Use a educação para louvar a Jeová</option>
              <option value="147. Confie que Jeová tem o poder para nos salvar">147. Confie que Jeová tem o poder para nos salvar</option>
              <option value="148. Você tem o mesmo conceito de Deus sobre a vida?">148. Você tem o mesmo conceito de Deus sobre a vida?</option>
              <option value="149. O que significa “andar com Deus”?">149. O que significa “andar com Deus”?</option>
              <option value="150. Este mundo está condenado à destruição?">150. Este mundo está condenado à destruição?</option>
              <option value="151. Jeová é “uma altura protetora” para seu povo">151. Jeová é “uma altura protetora” para seu povo</option>
              <option value="152. Armagedom — por que e quando?">152. Armagedom — por que e quando?</option>
              <option value="153. Tenha bem em mente o “atemorizante dia”!">153. Tenha bem em mente o “atemorizante dia”!</option>
              <option value="154. O governo humano é pesado na balança">154. O governo humano é pesado na balança</option>
              <option value="155. Chegou a hora do julgamento de Babilônia?">155. Chegou a hora do julgamento de Babilônia?</option>
              <option value="156. O Dia do Juízo — tempo de temor ou de esperança?">156. O Dia do Juízo — tempo de temor ou de esperança?</option>
              <option value="157. Como os verdadeiros cristãos adornam o ensino divino">157. Como os verdadeiros cristãos adornam o ensino divino</option>
              <option value="158. Seja corajoso e confie em Jeová">158. Seja corajoso e confie em Jeová</option>
              <option value="159. Como encontrar segurança num mundo perigoso">159. Como encontrar segurança num mundo perigoso</option>
              <option value="160. Mantenha a identidade cristã!">160. Mantenha a identidade cristã!</option>
              <option value="161. Por que Jesus sofreu e morreu?">161. Por que Jesus sofreu e morreu?</option>
              <option value="162. Seja liberto deste mundo em escuridão">162. Seja liberto deste mundo em escuridão</option>
              <option value="163. Por que temer o Deus verdadeiro?">163. Por que temer o Deus verdadeiro?</option>
              <option value="164. Será que Deus ainda está no controle?">164. Será que Deus ainda está no controle?</option>
              <option value="165. Os valores de quem você preza?">165. Os valores de quem você preza?</option>
              <option value="166. Verdadeira fé — O que é e como mostrar">166. Verdadeira fé — O que é e como mostrar</option>
              <option value="167. Ajamos sabiamente num mundo insensato">167. Ajamos sabiamente num mundo insensato</option>
              <option value="168. Você pode sentir-se seguro neste mundo atribulado!">168. Você pode sentir-se seguro neste mundo atribulado!</option>
              <option value="169. Por que ser orientado pela Bíblia?">169. Por que ser orientado pela Bíblia?</option>
              <option value="170. Quem está qualificado para governar a humanidade?">170. Quem está qualificado para governar a humanidade?</option>
              <option value="171. Poderá viver em paz agora — e para sempre!">171. Poderá viver em paz agora — e para sempre!</option>
              <option value="172. Que reputação você tem perante Deus?">172. Que reputação você tem perante Deus?</option>
              <option value="173. Existe uma religião verdadeira do ponto de vista de Deus?">173. Existe uma religião verdadeira do ponto de vista de Deus?</option>
              <option value="174. Quem se qualificará para entrar no novo mundo de Deus?">174. Quem se qualificará para entrar no novo mundo de Deus?</option>
              <option value="175. O que prova que a Bíblia é autêntica?">175. O que prova que a Bíblia é autêntica?</option>
              <option value="176. Quando haverá verdadeira paz e segurança?">176. Quando haverá verdadeira paz e segurança?</option>
              <option value="177. Onde encontrar ajuda em tempos de aflição?">177. Onde encontrar ajuda em tempos de aflição?</option>
              <option value="178. Ande no caminho da integridade">178. Ande no caminho da integridade</option>
              <option value="179. Rejeite as fantasias do mundo, empenhe-se pelas realidades do reino">179. Rejeite as fantasias do mundo, empenhe-se pelas realidades do reino</option>
              <option value="180. A Ressurreição — Por que essa esperança deve ser real para você">180. A Ressurreição — Por que essa esperança deve ser real para você</option>
              <option value="181. Já é mais tarde do que você imagina?">181. Já é mais tarde do que você imagina?</option>
              <option value="182. O que o Reino de Deus está fazendo por nós agora?">182. O que o Reino de Deus está fazendo por nós agora?</option>
              <option value="183. Desvie seus olhos do que é fútil">183. Desvie seus olhos do que é fútil</option>
              <option value="184. A morte é o fim de tudo?">184. A morte é o fim de tudo?</option>
              <option value="185. Será que a verdade influencia sua vida?">185. Será que a verdade influencia sua vida?</option>
              <option value="186. Sirva em união com o povo feliz de Deus">186. Sirva em união com o povo feliz de Deus</option>
              <option value="187. Por que um Deus amoroso permite a maldade?">187. Por que um Deus amoroso permite a maldade?</option>
              <option value="188. Você confia em Jeová?">188. Você confia em Jeová?</option>
              <option value="189. Ande com Deus e receba bênçãos para sempre">189. Ande com Deus e receba bênçãos para sempre</option>
              <option value="190. Como se cumprirá a promessa de perfeita felicidade familiar">190. Como se cumprirá a promessa de perfeita felicidade familiar</option>
              <option value="191. Como o amor e a fé vencem o mundo">191. Como o amor e a fé vencem o mundo</option>
              <option value="192. Você está no caminho para a vida eterna?">192. Você está no caminho para a vida eterna?</option>
              <option value="193. Os problemas de hoje logo serão coisa do passado">193. Os problemas de hoje logo serão coisa do passado</option>
              <option value="194. Como a sabedoria de Deus nos ajuda">194. Como a sabedoria de Deus nos ajuda</option>
            </select>
          </div>

          {/* Dirigente A Sentinela + Leitor A Sentinela */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Dirigente A Sentinela</label>
              <PublisherInput
                value={meetingData.watchtowerConductor}
                onChange={(val) => updateField("watchtowerConductor", val)}
                publishers={publishers}
                roleName="Dirigente A sentinela"
                placeholder="Dirigente"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Leitor A Sentinela</label>
              <PublisherInput
                value={meetingData.watchtowerReader}
                onChange={(val) => updateField("watchtowerReader", val)}
                publishers={publishers}
                roleName="Leitor A sentinela"
                placeholder="Leitor"
              />
            </div>
          </div>

        </div>
      </div>

      {/* CARD 2: DESIGNAÇÃO MECANICA */}
      <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-5 mb-6 print-card">
        <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
          <Wrench className="h-4 w-4 text-purple-400 no-print" />
          <h3 className="text-xs font-black text-purple-400 uppercase tracking-wider">Designação Mecanica</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Indicador 01</label>
            <PublisherInput
              value={meetingData.mechanicalIndicador1}
              onChange={(val) => updateField("mechanicalIndicador1", val)}
              publishers={publishers}
              roleName="Indicador 01"
              placeholder="Indicador 01"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Indicador 02</label>
            <PublisherInput
              value={meetingData.mechanicalIndicador2}
              onChange={(val) => updateField("mechanicalIndicador2", val)}
              publishers={publishers}
              roleName="Indicador 02"
              placeholder="Indicador 02"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Microfone 01</label>
            <PublisherInput
              value={meetingData.mechanicalMicrofone1}
              onChange={(val) => updateField("mechanicalMicrofone1", val)}
              publishers={publishers}
              roleName="Microfone 01"
              placeholder="Microfone 01"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Microfone 02</label>
            <PublisherInput
              value={meetingData.mechanicalMicrofone2}
              onChange={(val) => updateField("mechanicalMicrofone2", val)}
              publishers={publishers}
              roleName="Microfone 02"
              placeholder="Microfone 02"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Palco</label>
            <PublisherInput
              value={meetingData.mechanicalPalco}
              onChange={(val) => updateField("mechanicalPalco", val)}
              publishers={publishers}
              roleName="Palco"
              placeholder="Palco"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Audio e Video</label>
            <PublisherInput
              value={meetingData.mechanicalAudioVideo}
              onChange={(val) => updateField("mechanicalAudioVideo", val)}
              publishers={publishers}
              roleName="Audio e Video"
              placeholder="Audio e Video"
            />
          </div>
        </div>
      </div>

      {/* Modal de Pré-visualização */}
      {showPreview && (
        <MeetingPreviewModal
          midweek={midweekData ?? {
            weekRange: formatWeekRange(selectedDate),
            president: '', openingPrayer: '', closingPrayer: '',
            talkSpeaker: '', talkTheme: '', gemsSpeaker: '', bibleReadingReader: '',
            part1Theme: '', part1Speaker: '', part1Assistant: '', part1SecondHelper: '',
            part2Theme: '', part2Speaker: '', part2Assistant: '', part2SecondHelper: '',
            part3Theme: '', part3Speaker: '', part3Assistant: '', part3SecondHelper: '',
            part4Theme: '', part4Speaker: '', part4Assistant: '', part4SecondHelper: '',
            lifePart1Theme: '', lifePart1Speaker: '',
            lifePart2Theme: '', lifePart2Speaker: '',
            lifePart3Theme: '', lifePart3Speaker: '',
            cbsConductor: '', cbsReader: '',
            mechanicalIndicador1: '', mechanicalIndicador2: '',
            mechanicalMicrofone1: '', mechanicalMicrofone2: '',
            mechanicalPalco: '', mechanicalAudioVideo: '',
          }}
          weekend={{
            president: meetingData.president,
            openingPrayer: meetingData.openingPrayer,
            closingPrayer: meetingData.closingPrayer,
            localSpeaker: meetingData.localSpeaker,
            visitingSpeaker: meetingData.visitingSpeaker,
            talkTheme: meetingData.talkTheme,
            watchtowerConductor: meetingData.watchtowerConductor,
            watchtowerReader: meetingData.watchtowerReader,
            mechanicalIndicador1: meetingData.mechanicalIndicador1,
            mechanicalIndicador2: meetingData.mechanicalIndicador2,
            mechanicalMicrofone1: meetingData.mechanicalMicrofone1,
            mechanicalMicrofone2: meetingData.mechanicalMicrofone2,
            mechanicalPalco: meetingData.mechanicalPalco,
            mechanicalAudioVideo: meetingData.mechanicalAudioVideo,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
    </div>
  );
}
