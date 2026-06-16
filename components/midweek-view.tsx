'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Printer, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  BookOpen,
  Users,
  Wrench
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
  where 
} from 'firebase/firestore';
import { toast } from 'sonner';

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
    if (role === "Presidente") return "Tesouros da Palavra::Presidente";
    if (role === "Oração inicial" || role === "Oração final") return "Tesouros da Palavra::Orações";
    if (role === "Discurso 10min") return "Tesouros da Palavra::Discurso 10min";
    if (role === "Joias espirituais") return "Tesouros da Palavra::Joias espirituais";
    if (role === "Leitura da Bíblia") return "Tesouros da Palavra::Leitura da Bíblia";
    if (role === "Iniciando conversas") return "Vida e Ministério::Iniciando conversas";
    if (role === "Cultivando o interesse") return "Vida e Ministério::Cultivando o interesse";
    if (role === "Discurso") return "Vida e Ministério::Discurso";
    if (role === "Ajudante") return "Vida e Ministério::Ajudante";
    if (role === "Parte de Vida") return "Nossa vida cristã::Partes";
    if (role === "Estudo Bíblico de Congregação") return "Nossa vida cristã::Estudo Bíblico";
    if (role === "EBC Leitor") return "Nossa vida cristã::Leitor";
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
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
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
      {/* Visualização de Impressão */}
      <div className="hidden print:block text-xs font-medium text-black border-b border-gray-300 pb-1 min-h-[18px]">
        {value || "—"}
      </div>

      {/* Input de Edição */}
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
              const name = `${p.firstName} ${p.lastName}`;
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
// MAIN MIDWEEK VIEW COMPONENT
// ==========================================
interface MidweekMeetingData {
  president: string;
  openingPrayer: string;
  talkSpeaker: string;
  talkTheme: string;
  talkDuration: number;
  gemsSpeaker: string;
  gemsDuration: number;
  bibleReadingReader: string;
  
  // Ministry parts
  part1Type: string;
  part1Speaker: string;
  part1Theme: string;
  part1Duration: number;
  part1Assistant: string;
  part1SecondHelper: string;
  
  part2Type: string;
  part2Speaker: string;
  part2Theme: string;
  part2Duration: number;
  part2Assistant: string;
  part2SecondHelper: string;
  
  part3Type: string;
  part3Speaker: string;
  part3Theme: string;
  part3Duration: number;
  part3Assistant: string;
  part3SecondHelper: string;
  
  part4Type: string;
  part4Speaker: string;
  part4Theme: string;
  part4Duration: number;
  part4Assistant: string;
  part4SecondHelper: string;
  
  // Christian Life parts
  lifePart1Speaker: string;
  lifePart1Theme: string;
  lifePart1Duration: number;
  
  lifePart2Speaker: string;
  lifePart2Theme: string;
  lifePart2Duration: number;
  
  lifePart3Speaker: string;
  lifePart3Theme: string;
  lifePart3Duration: number;
  
  cbsConductor: string;
  cbsTheme: string;
  cbsDuration: number;
  cbsReader: string;
  
  closingPrayer: string;
  
  // Songs
  songOpening: string;
  songMiddle: string;
  songClosing: string;
  
  // Designação Mecanica
  mechanicalIndicador1: string;
  mechanicalIndicador2: string;
  mechanicalMicrofone1: string;
  mechanicalMicrofone2: string;
  mechanicalPalco: string;
  mechanicalAudioVideo: string;
}

const defaultMeetingData: MidweekMeetingData = {
  president: "",
  openingPrayer: "",
  talkSpeaker: "",
  talkTheme: "",
  talkDuration: 10,
  gemsSpeaker: "",
  gemsDuration: 10,
  bibleReadingReader: "",
  
  part1Type: "Iniciando conversas",
  part1Speaker: "",
  part1Theme: "Iniciando conversas",
  part1Duration: 2,
  part1Assistant: "",
  part1SecondHelper: "",
  
  part2Type: "Iniciando conversas",
  part2Speaker: "",
  part2Theme: "Iniciando conversas",
  part2Duration: 2,
  part2Assistant: "",
  part2SecondHelper: "",
  
  part3Type: "Cultivando o interesse",
  part3Speaker: "",
  part3Theme: "Cultivando o interesse",
  part3Duration: 2,
  part3Assistant: "",
  part3SecondHelper: "",
  
  part4Type: "Discurso",
  part4Speaker: "",
  part4Theme: "Discurso",
  part4Duration: 5,
  part4Assistant: "",
  part4SecondHelper: "",
  
  lifePart1Speaker: "",
  lifePart1Theme: "",
  lifePart1Duration: 15,
  
  lifePart2Speaker: "",
  lifePart2Theme: "",
  lifePart2Duration: 0,
  
  lifePart3Speaker: "",
  lifePart3Theme: "",
  lifePart3Duration: 0,
  
  cbsConductor: "",
  cbsTheme: "",
  cbsDuration: 30,
  cbsReader: "",
  
  closingPrayer: "",
  
  songOpening: "",
  songMiddle: "",
  songClosing: "",
  
  mechanicalIndicador1: "",
  mechanicalIndicador2: "",
  mechanicalMicrofone1: "",
  mechanicalMicrofone2: "",
  mechanicalPalco: "",
  mechanicalAudioVideo: ""
};

export function MidweekView() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Start with the current week's Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const [publishers, setPublishers] = useState<any[]>([]);
  const [meetingData, setMeetingData] = useState<MidweekMeetingData>(defaultMeetingData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get Monday Date String for document ID (format: YYYY-MM-DD)
  const getMondayStr = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const mondayStr = getMondayStr(selectedDate);

  // Formatter for week header: "mês dia_inicio-dia_fim" in lowercase
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

  // Navigators
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

  // Fetch Publishers
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'publishers'),
      where('ownerId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (a.firstName || "").localeCompare(b.firstName || ""));
      setPublishers(pubs);
    });
    return () => unsubscribe();
  }, [user]);

  // Load Midweek Meeting Data
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    const docRef = doc(db, 'midweek_meetings', mondayStr);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMeetingData({
          ...defaultMeetingData,
          ...data
        } as MidweekMeetingData);
      } else {
        setMeetingData(defaultMeetingData);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading meeting details:", error);
      handleFirestoreError(error, OperationType.GET, `midweek_meetings/${mondayStr}`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, mondayStr]);

  // Save Midweek Meeting Data
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const toastId = toast.loading("Salvando programação...");
    try {
      await setDoc(doc(db, 'midweek_meetings', mondayStr), {
        ...meetingData,
        ownerId: user.uid,
        weekMonday: mondayStr,
        weekFormatted: formatWeekRange(selectedDate),
        updatedAt: new Date().toISOString()
      });
      toast.success("Programação salva com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Save midweek meeting error:", error);
      toast.error("Erro ao salvar programação.", { id: toastId });
      handleFirestoreError(error, OperationType.WRITE, `midweek_meetings/${mondayStr}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updateField = (key: keyof MidweekMeetingData, value: any) => {
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
    <div className="flex flex-col min-h-0 flex-1">
    <div className="flex-1 overflow-y-auto pr-2 space-y-6">
      
      {/* Header (Não imprime no papel) */}
      <div className="flex justify-between items-end shrink-0 no-print">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Reunião de meio de semana</h1>
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

            {/* Seletor de data disfarçado */}
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
            {isSaving ? "Salvando..." : "Salvar Quadro"}
          </Button>
        </div>
      </div>

      {/* Header somente para Impressão */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide text-black">Programação da Reunião de Meio de Semana</h1>
        <h2 className="text-md font-bold text-gray-700 mt-1 capitalize">{formatWeekRange(selectedDate)}</h2>
      </div>

      {/* CARD 1: TESOUROS DA PALAVRA DE DEUS */}
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-5 mb-6 print-card">
          <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
            <BookOpen className="h-4 w-4 text-amber-400 no-print" />
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Tesouros da Palavra de Deus</h3>
          </div>
          <div className="space-y-3">

            {/* Grid 3 colunas: Presidente | Oração inicial | Oração final */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#94A3B8] font-bold print:text-black">Presidente</span>
                <PublisherInput 
                  value={meetingData.president} 
                  onChange={(val) => updateField("president", val)}
                  publishers={publishers}
                  roleName="Presidente"
                  placeholder="Presidente"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#94A3B8] font-bold print:text-black">Oração inicial</span>
                <PublisherInput 
                  value={meetingData.openingPrayer} 
                  onChange={(val) => updateField("openingPrayer", val)}
                  publishers={publishers}
                  roleName="Oração inicial"
                  placeholder="Designado"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#94A3B8] font-bold print:text-black">Oração final</span>
                <PublisherInput 
                  value={meetingData.closingPrayer} 
                  onChange={(val) => updateField("closingPrayer", val)}
                  publishers={publishers}
                  roleName="Oração final"
                  placeholder="Designado"
                />
              </div>
            </div>

            {/* Grid 2 colunas: Tesouros | Joias espirituais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#94A3B8] font-bold print:text-black">Tesouros</span>
                <PublisherInput 
                  value={meetingData.talkSpeaker} 
                  onChange={(val) => updateField("talkSpeaker", val)}
                  publishers={publishers}
                  roleName="Discurso 10min"
                  placeholder="Orador"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#94A3B8] font-bold print:text-black">Joias espirituais</span>
                <PublisherInput 
                  value={meetingData.gemsSpeaker} 
                  onChange={(val) => updateField("gemsSpeaker", val)}
                  publishers={publishers}
                  roleName="Joias espirituais"
                  placeholder="Dirigente"
                />
              </div>
            </div>

            {/* Leitura da Bíblia */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <span className="w-full sm:w-60 text-xs text-[#94A3B8] font-bold shrink-0 print:text-black">Leitura da Bíblia</span>
              <div className="w-full sm:w-72">
                <PublisherInput 
                  value={meetingData.bibleReadingReader} 
                  onChange={(val) => updateField("bibleReadingReader", val)}
                  publishers={publishers}
                  roleName="Leitura da Bíblia"
                  placeholder="Leitor"
                />
              </div>
            </div>

          </div>
        </div>

        {/* CARD 2: FAÇA SEU MELHOR NO MINISTÉRIO */}
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-5 mb-6 print-card">
          <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
            <Sparkles className="h-4 w-4 text-orange-400 no-print" />
            <h3 className="text-xs font-black text-orange-400 uppercase tracking-wider">Faça seu melhor no ministério</h3>
          </div>
          <div className="space-y-4">
            
            {/* Linha 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <div className="hidden print:block text-xs text-black border-b border-gray-300 pb-1 min-h-[18px]">
                    {meetingData.part1Theme || "—"}
                  </div>
                  <select
                    value={meetingData.part1Theme}
                    onChange={(e) => updateField("part1Theme", e.target.value)}
                    className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
                  >
                    <option value="">Selecionar</option>
                    <option value="04 - Iniciando conversas">04 - Iniciando conversas</option>
                    <option value="04 - Cultivando interesse">04 - Cultivando interesse</option>
                    <option value="04 - Explicando suas crenças">04 - Explicando suas crenças</option>
                    <option value="04 - Fazendo discipulos">04 - Fazendo discipulos</option>
                    <option value="04 - Estudo Biblico">04 - Estudo Biblico</option>
                    <option value="04 - Discurso">04 - Discurso</option>
                  </select>
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.part1Speaker} 
                    onChange={(val) => updateField("part1Speaker", val)}
                    publishers={publishers}
                    roleName="Iniciando conversas"
                    placeholder="Estudante"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <PublisherInput 
                    value={meetingData.part1Assistant} 
                    onChange={(val) => updateField("part1Assistant", val)}
                    publishers={publishers}
                    roleName="Ajudante"
                    placeholder="Ajudante"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <PublisherInput 
                    value={meetingData.part1SecondHelper} 
                    onChange={(val) => updateField("part1SecondHelper", val)}
                    publishers={publishers}
                    roleName="Ajudante"
                    placeholder="Ajudante"
                  />
                </div>
              </div>
            </div>

            {/* Linha 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <div className="hidden print:block text-xs text-black border-b border-gray-300 pb-1 min-h-[18px]">
                    {meetingData.part2Theme || "—"}
                  </div>
                  <select
                    value={meetingData.part2Theme}
                    onChange={(e) => updateField("part2Theme", e.target.value)}
                    className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
                  >
                    <option value="">Selecionar</option>
                    <option value="05 - Iniciando conversas">05 - Iniciando conversas</option>
                    <option value="05 - Cultivando interesse">05 - Cultivando interesse</option>
                    <option value="05 - Explicando suas crenças">05 - Explicando suas crenças</option>
                    <option value="05 - Fazendo discipulos">05 - Fazendo discipulos</option>
                    <option value="05 - Estudo Biblico">05 - Estudo Biblico</option>
                    <option value="05 - Discurso">05 - Discurso</option>
                  </select>
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.part2Speaker} 
                    onChange={(val) => updateField("part2Speaker", val)}
                    publishers={publishers}
                    roleName="Iniciando conversas"
                    placeholder="Estudante"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <PublisherInput 
                    value={meetingData.part2Assistant} 
                    onChange={(val) => updateField("part2Assistant", val)}
                    publishers={publishers}
                    roleName="Ajudante"
                    placeholder="Ajudante"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <PublisherInput 
                    value={meetingData.part2SecondHelper} 
                    onChange={(val) => updateField("part2SecondHelper", val)}
                    publishers={publishers}
                    roleName="Ajudante"
                    placeholder="Ajudante"
                  />
                </div>
              </div>
            </div>

            {/* Linha 3 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <div className="hidden print:block text-xs text-black border-b border-gray-300 pb-1 min-h-[18px]">
                    {meetingData.part3Theme || "—"}
                  </div>
                  <select
                    value={meetingData.part3Theme}
                    onChange={(e) => updateField("part3Theme", e.target.value)}
                    className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
                  >
                    <option value="">Selecionar</option>
                    <option value="06 - Iniciando conversas">06 - Iniciando conversas</option>
                    <option value="06 - Cultivando interesse">06 - Cultivando interesse</option>
                    <option value="06 - Explicando suas crenças">06 - Explicando suas crenças</option>
                    <option value="06 - Fazendo discipulos">06 - Fazendo discipulos</option>
                    <option value="06 - Estudo Biblico">06 - Estudo Biblico</option>
                    <option value="06 - Discurso">06 - Discurso</option>
                  </select>
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.part3Speaker} 
                    onChange={(val) => updateField("part3Speaker", val)}
                    publishers={publishers}
                    roleName="Cultivando o interesse"
                    placeholder="Estudante"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <PublisherInput 
                    value={meetingData.part3Assistant} 
                    onChange={(val) => updateField("part3Assistant", val)}
                    publishers={publishers}
                    roleName="Ajudante"
                    placeholder="Ajudante"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <PublisherInput 
                    value={meetingData.part3SecondHelper} 
                    onChange={(val) => updateField("part3SecondHelper", val)}
                    publishers={publishers}
                    roleName="Ajudante"
                    placeholder="Ajudante"
                  />
                </div>
              </div>
            </div>

            {/* Linha 4 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <div className="hidden print:block text-xs text-black border-b border-gray-300 pb-1 min-h-[18px]">
                    {meetingData.part4Theme || "—"}
                  </div>
                  <select
                    value={meetingData.part4Theme}
                    onChange={(e) => updateField("part4Theme", e.target.value)}
                    className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
                  >
                    <option value="">Selecionar</option>
                    <option value="07 - Iniciando conversas">07 - Iniciando conversas</option>
                    <option value="07 - Cultivando interesse">07 - Cultivando interesse</option>
                    <option value="07 - Explicando suas crenças">07 - Explicando suas crenças</option>
                    <option value="07 - Fazendo discipulos">07 - Fazendo discipulos</option>
                    <option value="07 - Estudo Biblico">07 - Estudo Biblico</option>
                    <option value="07 - Discurso">07 - Discurso</option>
                  </select>
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.part4Speaker} 
                    onChange={(val) => updateField("part4Speaker", val)}
                    publishers={publishers}
                    roleName="Discurso"
                    placeholder="Estudante"
                  />
                </div>
                <div className="w-full sm:w-56" />
                <div className="w-full sm:w-56" />
              </div>
            </div>

          </div>
        </div>

        {/* CARD 3: NOSSA VIDA CRISTÃ */}
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-5 mb-6 print-card">
          <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B]/40 pb-2">
            <Users className="h-4 w-4 text-rose-400 no-print" />
            <h3 className="text-xs font-black text-rose-400 uppercase tracking-wider">Nossa Vida Cristã</h3>
          </div>
          <div className="space-y-4">
            
            {/* Parte de Vida 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <div className="hidden print:block text-xs text-black border-b border-gray-300 pb-1 min-h-[18px]">
                    {meetingData.lifePart1Theme || "—"}
                  </div>
                  <input 
                    type="text"
                    value={meetingData.lifePart1Theme}
                    onChange={(e) => updateField("lifePart1Theme", e.target.value)}
                    placeholder="Tema da parte"
                    className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
                  />
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.lifePart1Speaker} 
                    onChange={(val) => updateField("lifePart1Speaker", val)}
                    publishers={publishers}
                    roleName="Parte de Vida"
                    placeholder="Designado"
                  />
                </div>
              </div>
            </div>

            {/* Parte de Vida 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <div className="hidden print:block text-xs text-black border-b border-gray-300 pb-1 min-h-[18px]">
                    {meetingData.lifePart2Theme || "—"}
                  </div>
                  <input 
                    type="text"
                    value={meetingData.lifePart2Theme}
                    onChange={(e) => updateField("lifePart2Theme", e.target.value)}
                    placeholder="Tema da parte"
                    className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
                  />
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.lifePart2Speaker} 
                    onChange={(val) => updateField("lifePart2Speaker", val)}
                    publishers={publishers}
                    roleName="Parte de Vida"
                    placeholder="Designado"
                  />
                </div>
              </div>
            </div>

            {/* Parte de Vida 3 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <div className="hidden print:block text-xs text-black border-b border-gray-300 pb-1 min-h-[18px]">
                    {meetingData.lifePart3Theme || "—"}
                  </div>
                  <input 
                    type="text"
                    value={meetingData.lifePart3Theme}
                    onChange={(e) => updateField("lifePart3Theme", e.target.value)}
                    placeholder="Tema da parte"
                    className="print:hidden w-full bg-[#0F172A] border border-[#1E293B]/50 focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
                  />
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.lifePart3Speaker} 
                    onChange={(val) => updateField("lifePart3Speaker", val)}
                    publishers={publishers}
                    roleName="Parte de Vida"
                    placeholder="Designado"
                  />
                </div>
              </div>
            </div>

            {/* Estudo Bíblico de Congregação */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
              <span className="w-full sm:w-60 text-xs text-[#94A3B8] font-bold shrink-0 print:text-black">Estudo Bíblico de Congregação</span>
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.cbsConductor} 
                    onChange={(val) => updateField("cbsConductor", val)}
                    publishers={publishers}
                    roleName="Estudo Bíblico de Congregação"
                    placeholder="Dirigente"
                  />
                </div>
                <div className="w-full sm:w-72">
                  <PublisherInput 
                    value={meetingData.cbsReader} 
                    onChange={(val) => updateField("cbsReader", val)}
                    publishers={publishers}
                    roleName="EBC Leitor"
                    placeholder="Leitor do estudo"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* DESIGNAÇÃO MECANICA */}
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
    </div>
    </div>
  );
}
