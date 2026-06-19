'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Save, 
  UserPlus, 
  Filter, 
  Trash2,
  Calendar,
  CheckCircle2,
  MoreVertical,
  Clock,
  Printer,
  Users,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { phoneMask } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import { toast } from 'sonner';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc
} from 'firebase/firestore';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';

const TAGS = ["Outras Ovelhas", "Ungido", "Batizado", "Publicador não batizado"] as const;

export function PublishersView() {
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterPioneer, setFilterPioneer] = useState(false);
  const [filterInactive, setFilterInactive] = useState(false);
  const [fullName, setFullName] = useState('');
  const [publisherData, setPublisherData] = useState<any>({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    secondaryPhone: "",
    profession: "",
    address: "",
    birthDate: "",
    gender: "masculino",
    status: "ativo",
    groupId: "",
    responsibility: "publicador",
    pioneerType: "nao",
    baptismDate: "",
    tags: [],
    designations: []
  });
  const [publishers, setPublishers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch Publishers
  React.useEffect(() => {
    if (!user) {
      setPublishers([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'publishers')
    );
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const pubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (a.firstName || "").localeCompare(b.firstName || ""));
      setPublishers(pubs);
      setIsLoading(false);
    }, (error: unknown) => {
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'publishers');
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Groups
  React.useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }

    const q = query(
      collection(db, 'groups')
    );
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const gs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      setGroups(gs);
    }, (error: unknown) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });
    return () => unsubscribe();
  }, [user]);

  // Load selected publisher data
  React.useEffect(() => {
    if (selectedPublisherId) {
      const pub = publishers.find(p => p.id === selectedPublisherId);
      if (pub) {
        setPublisherData(pub);
        setFullName([pub.firstName, pub.middleName, pub.lastName].filter(Boolean).join(' '));
      }
    } else {
      setPublisherData({
        firstName: "",
        middleName: "",
        lastName: "",
        phone: "",
        secondaryPhone: "",
        profession: "",
        address: "",
        birthDate: "",
        gender: "masculino",
        status: "ativo",
        groupId: "",
        responsibility: "publicador",
        pioneerType: "nao",
        baptismDate: "",
        tags: [],
        designations: []
      });
      setFullName('');
    }
  }, [selectedPublisherId, publishers]);

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar!");
      return;
    }
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      toast.error("Nome completo deve ter pelo menos nome e sobrenome!");
      return;
    }
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const firstName = capitalize(nameParts[0]);
    const lastName = capitalize(nameParts[nameParts.length - 1]);
    const middleName = nameParts.slice(1, -1).map(capitalize).join(' ');
    const dataToSave = {
      ...publisherData,
      firstName,
      middleName,
      lastName,
    };
    const toastId = toast.loading(selectedPublisherId ? "Atualizando..." : "Cadastrando...");
    try {
      // Remove any unwanted fields from data
      const { id, createdAt, updatedAt, ...pureData } = dataToSave;
      
      if (selectedPublisherId) {
        await updateDoc(doc(db, 'publishers', selectedPublisherId), {
          ...pureData,
          updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, 'publishers'), {
          ...pureData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setSelectedPublisherId(docRef.id);
      }
      toast.success(selectedPublisherId ? "Alterações salvas!" : "Publicador cadastrado com sucesso!", { id: toastId });
    } catch (error: any) {
      console.error("Save error detail:", error);
      let msg = "Erro desconhecido";
      if (error.message?.includes("permission-denied")) {
        msg = "Permissão negada no banco de dados.";
      } else if (error.message) {
        msg = error.message;
      }
      toast.error(`Erro ao salvar: ${msg}`, { id: toastId });
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!selectedPublisherId) return;
    const pub = publishers.find(p => p.id === selectedPublisherId);
    if (!pub) return;
    
    const toastId = toast.loading("Excluindo cadastro...");
    try {
      await deleteDoc(doc(db, 'publishers', selectedPublisherId));
      setSelectedPublisherId(null);
      setIsDeleteDialogOpen(false);
      toast.success("Cadastro excluído com sucesso!", { id: toastId });
    } catch (error: any) {
      console.error("Delete publisher error:", error);
      toast.error(`Erro ao excluir: ${error.message || "Erro desconhecido"}`, { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `publishers/${selectedPublisherId}`);
    }
  };

  const handleNew = () => {
    setSelectedPublisherId(null);
  };

  // S-21 / Field Report data
  const now = new Date();
  const serviceStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const serviceYear = `${serviceStartYear}/${serviceStartYear + 1}`;
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
  const [s21Data, setS21Data] = useState<Record<string, { participou: boolean; estudos: string; auxiliar: boolean; horas: string; observacao: string }>>({});
  const [isS21Loading, setIsS21Loading] = useState(false);

  // Fetch S-21 data from field_reports when publisher changes
  React.useEffect(() => {
    if (!selectedPublisherId || !user) return;
    setIsS21Loading(true);
    const fetchS21 = async () => {
      const results = await Promise.all(serviceMonths.map(async (sm) => {
        const docId = `${sm.year}-${String(sm.month + 1).padStart(2, '0')}`;
        try {
          const docSnap = await getDoc(doc(db, 'field_reports', docId));
          if (docSnap.exists()) {
            const reports = docSnap.data().reports || {};
            return { docId, entry: reports[selectedPublisherId] || { participou: false, estudos: '', auxiliar: false, horas: '', observacao: '' } };
          }
        } catch (e) {
          console.error(`S-21 load error for ${docId}:`, e);
        }
        return { docId, entry: { participou: false, estudos: '', auxiliar: false, horas: '', observacao: '' } };
      }));
      const data: Record<string, any> = {};
      results.forEach(({ docId, entry }) => { data[docId] = entry; });
      setS21Data(data);
      setIsS21Loading(false);
    };
    fetchS21();
  }, [selectedPublisherId, user]);

  const updateS21Field = async (docId: string, field: string, value: boolean | string) => {
    setS21Data(prev => ({
      ...prev,
      [docId]: {
        ...(prev[docId] || { participou: false, estudos: '', auxiliar: false, horas: '', observacao: '' }),
        [field]: value,
      }
    }));
  };

  const saveS21Data = async () => {
    if (!user || !selectedPublisherId) return;
    const toastId = toast.loading("Salvando registro S-21...");
    try {
      await Promise.all(serviceMonths.map(async (sm) => {
        const docId = `${sm.year}-${String(sm.month + 1).padStart(2, '0')}`;
        const entry = s21Data[docId];
        if (!entry) return;
        await setDoc(doc(db, 'field_reports', docId), {
          reports: { [selectedPublisherId]: entry },
          month: sm.month,
          year: sm.year,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }));
      toast.success("Registro S-21 salvo!", { id: toastId });
    } catch (error) {
      console.error("Save S-21 error:", error);
      toast.error("Erro ao salvar registro S-21.", { id: toastId });
    }
  };

  const hoursGoal = 850;
  const currentTotalHours = Object.values(s21Data).reduce((sum, r) => sum + (parseInt(r.horas, 10) || 0), 0);
  const remainingHours = hoursGoal - currentTotalHours;

  return (
    <div className="flex-1 flex flex-col gap-8 min-h-0">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Publicadores</h1>
          <p className="text-[#94A3B8] font-bold">Gestão completa do corpo de publicadores.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="border-[#1E293B] text-[#94A3B8] font-bold h-12 rounded-xl gap-2 px-6">
            Relatórios em Lote
          </Button>
          <Button 
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={!selectedPublisherId}
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-500/10 font-bold h-12 rounded-xl gap-2 px-6"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Cadastro
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold h-12 rounded-xl px-8 shadow-lg shadow-blue-600/20 gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Registro
            </Button>
          </div>
        </div>

      <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
        {/* List Card */}
        <Card className="w-96 bg-[#0F172A] border-[#1E293B] shadow-sm rounded-3xl overflow-hidden flex flex-col min-h-0">
          <div className="p-6 border-b border-[#1E293B]/50 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-3 h-4 w-4 text-[#64748B]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome..."
                className="pl-12 h-11 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus-visible:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleNew}
                className="flex-1 h-12 bg-[#0EA5E9] hover:bg-blue-700 gap-2 font-bold rounded-xl shadow-md shadow-blue-600/10"
              >
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </div>
            <div className="space-y-2">
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full h-11 bg-[#1E293B]/50 border border-[#1E293B]/50 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] cursor-pointer"
              >
                <option value="all">Todos os Grupos</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterPioneer}
                    onChange={(e) => setFilterPioneer(e.target.checked)}
                    className="accent-[#0EA5E9] w-4 h-4 rounded cursor-pointer"
                  />
                  Pioneiro Regular
                </label>
                <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterInactive}
                    onChange={(e) => setFilterInactive(e.target.checked)}
                    className="accent-[#0EA5E9] w-4 h-4 rounded cursor-pointer"
                  />
                  Inativos
                </label>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
               <div className="p-12 flex justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
               </div>
            ) : publishers.length === 0 ? (
               <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                 <div className="h-16 w-16 rounded-full bg-[#1E293B]/50 flex items-center justify-center">
                   <Users className="h-8 w-8 text-[#64748B]" />
                 </div>
                 <div>
                   <p className="text-[#64748B] font-bold text-sm">Nenhum cadastro encontrado</p>
                   <p className="text-xs text-[#64748B] mt-1">Comece cadastrando um novo publicador.</p>
                 </div>
               </div>
             ) : (
              <div className="p-4 space-y-2">
                {publishers.filter((p: any) => {
                  if (!searchQuery && filterGroup === 'all' && !filterPioneer && !filterInactive) return true;
                  const full_name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').toLowerCase();
                  if (searchQuery && !full_name.includes(searchQuery.toLowerCase())) return false;
                  if (filterGroup !== 'all' && p.groupId !== filterGroup) return false;
                  if (filterPioneer && p.pioneerType !== 'regular') return false;
                  if (!filterInactive && p.status === 'inativo') return false;
                  if (filterInactive && p.status !== 'inativo') return false;
                  return true;
                }).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPublisherId(p.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl transition-all border",
                      selectedPublisherId === p.id 
                        ? "bg-[#0EA5E9]/10 border-[#0EA5E9]/20 shadow-sm" 
                        : "border-transparent text-[#94A3B8] hover:bg-[#1E293B]/50"
                    )}
                  >
                    <p className="font-bold text-white">{[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}</p>
                    <p className="text-[10px] uppercase font-black text-[#64748B] tracking-widest mt-1">
                      Grupo: {groups.find(g => g.id === p.groupId)?.name || "Não atribuído"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Form Area */}
        <div className="flex-1 bg-[#0F172A] border border-[#1E293B] shadow-sm rounded-3xl flex flex-col h-full min-h-0">
          <Tabs defaultValue="personal" className="flex-1 flex flex-col min-h-0">
            <div className="px-8 pt-6 border-b border-[#1E293B]/50 bg-[#1E293B]/30 shrink-0">
              <TabsList className="bg-transparent gap-8 h-auto p-0">
                <TabsTrigger value="personal" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#0EA5E9] data-[state=active]:text-[#0EA5E9] rounded-none h-12 px-2 font-bold text-[#64748B] transition-all cursor-pointer outline-none">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="spiritual" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#0EA5E9] data-[state=active]:text-[#0EA5E9] rounded-none h-12 px-2 font-bold text-[#64748B] transition-all cursor-pointer outline-none">Espiritual</TabsTrigger>
                <TabsTrigger value="designation" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#0EA5E9] data-[state=active]:text-[#0EA5E9] rounded-none h-12 px-2 font-bold text-[#64748B] transition-all cursor-pointer outline-none">Designação</TabsTrigger>
                <TabsTrigger value="registry" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#0EA5E9] data-[state=active]:text-[#0EA5E9] rounded-none h-12 px-2 font-bold text-[#64748B] transition-all cursor-pointer outline-none">Registro (S-21)</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 w-full h-full">
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  <TabsContent value="personal" className="m-0 space-y-6 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-3">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Nome Completo</Label>
                      <Input 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nome completo" 
                        className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Celular Principal</Label>
                         <Input 
                           value={publisherData.phone}
                           onChange={(e) => setPublisherData({ ...publisherData, phone: phoneMask(e.target.value) })}
                           placeholder="(00) 00000-0000" 
                           className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20" 
                         />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Recado / Outro</Label>
                         <Input 
                           value={publisherData.secondaryPhone}
                           onChange={(e) => setPublisherData({ ...publisherData, secondaryPhone: phoneMask(e.target.value) })}
                           placeholder="(00) 00000-0000" 
                           className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20" 
                         />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Profissão</Label>
                      <Input 
                        value={publisherData.profession}
                        onChange={(e) => setPublisherData({ ...publisherData, profession: e.target.value })}
                        placeholder="Cargo" 
                        className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20 capitalize" 
                      />
                    </div>
                    <div className="md:col-span-3 space-y-3">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Residência / Endereço</Label>
                      <Input 
                        value={publisherData.address}
                        onChange={(e) => setPublisherData({ ...publisherData, address: e.target.value })}
                        placeholder="Rua, Número, Bairro..." 
                        className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20 capitalize" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Nascimento</Label>
                      <Input 
                        value={publisherData.birthDate}
                        onChange={(e) => setPublisherData({ ...publisherData, birthDate: e.target.value })}
                        type="date" 
                        className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Gênero</Label>
                      <Select 
                        value={publisherData.gender}
                        onValueChange={(val) => setPublisherData({ ...publisherData, gender: val })}
                      >
                        <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="spiritual" className="m-0 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Situação na Congregação</Label>
                      <Select 
                        value={publisherData.status} 
                        onValueChange={(val) => setPublisherData({ ...publisherData, status: val })}
                      >
                        <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="removido">Removido</SelectItem>
                          <SelectItem value="mudou">Mudou</SelectItem>
                        </SelectContent>
                      </Select>
                      {publisherData.status === 'inativo' && (
                        <p className="text-[10px] font-bold text-red-500 uppercase bg-red-500/10 p-2 rounded-lg">Sistema detectou 6 meses sem atividade corporativa</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Grupo de Campo</Label>
                      <Select 
                        value={publisherData.groupId} 
                        onValueChange={(val) => setPublisherData({ ...publisherData, groupId: val })}
                      >
                        <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl">
                          <span>{groups.find(g => g.id === publisherData.groupId)?.name || "Selecione um grupo"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Responsabilidade</Label>
                      <Select 
                        value={publisherData.responsibility} 
                        onValueChange={(val) => setPublisherData({ ...publisherData, responsibility: val })}
                      >
                        <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="publicador">Publicador</SelectItem>
                          <SelectItem value="servo">Servo Ministerial</SelectItem>
                          <SelectItem value="anciao">Ancião</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Tipo de Pioneiro</Label>
                      <Select 
                        value={publisherData.pioneerType} 
                        onValueChange={(val) => setPublisherData({ ...publisherData, pioneerType: val })}
                      >
                        <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao">Não é pioneiro</SelectItem>
                          <SelectItem value="auxiliar">Auxiliar</SelectItem>
                          <SelectItem value="regular">Pioneiro Regular</SelectItem>
                          <SelectItem value="especial">Pioneiro Especial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Data de Batismo</Label>
                      <Input 
                        value={publisherData.baptismDate}
                        onChange={(e) => setPublisherData({ ...publisherData, baptismDate: e.target.value })}
                        type="date" 
                        className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl" 
                      />
                    </div>
                   </div>

                   <div className="bg-[#1E293B]/50 p-6 rounded-3xl border border-[#1E293B]/50 space-y-4">
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Outras Informações</h4>
                       <div className="grid grid-cols-2 gap-2">
                          {(TAGS).map((item) => (
                            <div key={item} className="flex items-center space-x-2 p-3 bg-[#0F172A] rounded-2xl border border-[#1E293B]/50 transition-colors hover:bg-[#1E293B]/50">
                              <Checkbox 
                                id={item} 
                                className="h-5 w-5 border-[#1E293B]" 
                                checked={publisherData.tags?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentTags = publisherData.tags || [];
                                  if (checked) {
                                    setPublisherData({ ...publisherData, tags: [...currentTags, item] });
                                  } else {
                                    setPublisherData({ ...publisherData, tags: currentTags.filter((t: string) => t !== item) });
                                  }
                                }}
                              />
                              <label htmlFor={item} className="text-[10px] font-bold text-[#F1F5F9] cursor-pointer">{item}</label>
                           </div>
                        ))}
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="designation" className="m-0 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { title: "Tesouros da Palavra", items: ["Presidente", "Oração inicial", "Oração final", "Joias espirituais", "Discurso 10min", "Leitura da Bíblia"] },
                        { title: "Vida e Ministério", items: ["Iniciando conversas", "Cultivando o interesse", "Fazendo discípulos", "Explicando suas crenças", "Discurso", "Estudo Bíblico", "Ajudante"] },
                        { title: "Nossa vida cristã", items: ["Partes", "Estudo Bíblico", "Leitor"] },
                        { title: "Fim de semana", items: ["Orador local", "Orador fora", "Presidente", "Oração inicial", "Dirigente A Sentinela", "Leitor", "Oração final"] },
                        { title: "Serviço de campo", items: ["Testemunho público", "Dirigente de campo", "Super. de Grupo", "Aux. Super. de Grupo"] },
                        { title: "Designação Mecânica", items: ["Indicador", "Microfones", "Som", "Palco"] },
                      ].map((sec) => (
                        <Card key={sec.title} className="bg-[#0F172A] border-[#1E293B]/50 shadow-sm rounded-3xl overflow-hidden group hover:border-[#0EA5E9]/30 transition-all">
                          <div className="px-4 py-3 bg-[#1E293B]/30 border-b border-[#1E293B]/50">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{sec.title}</h4>
                          </div>
                          <CardContent className="p-4">
                            <div className="space-y-1">
                              {sec.items.map((item) => {
                                const compositeKey = `${sec.title}::${item}`;
                                return (
                                <div key={compositeKey} className="flex items-center space-x-3">
                                  <Checkbox 
                                    id={compositeKey} 
                                    className="h-5 w-5 border-[#1E293B]" 
                                    checked={publisherData.designations?.includes(compositeKey)}
                                    onCheckedChange={(checked) => {
                                      const currentDes = publisherData.designations || [];
                                      if (checked) {
                                        setPublisherData({ ...publisherData, designations: [...currentDes, compositeKey] });
                                      } else {
                                        setPublisherData({ ...publisherData, designations: currentDes.filter((d: string) => d !== compositeKey) });
                                      }
                                    }}
                                  />
                                  <label htmlFor={compositeKey} className="text-[11px] font-bold text-[#94A3B8] cursor-pointer">{item}</label>
                                </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                   </div>
                </TabsContent>

                 <TabsContent value="registry" className="m-0 space-y-6">
                    {publisherData.pioneerType === "regular" && (
                      <div className="grid grid-cols-3 gap-2">
                         <Card className="bg-[#0F172A] border-[#1E293B] shadow rounded-2xl">
                           <CardContent className="p-1.5">
                             <p className="text-[8px] font-black uppercase tracking-widest text-[#64748B] inline">Objetivo Anual </p>
                             <span className="text-xs font-black text-white">{hoursGoal}h</span>
                           </CardContent>
                         </Card>
                         <Card className="bg-slate-900 text-white border-none shadow rounded-2xl">
                           <CardContent className="p-1.5">
                             <p className="text-[8px] font-black uppercase tracking-widest opacity-70 inline">Horas Lançadas </p>
                             <span className="text-xs font-black text-yellow-400">{currentTotalHours}h</span>
                           </CardContent>
                         </Card>
                         <Card className="bg-[#0F172A] border-[#1E293B] shadow rounded-2xl">
                           <CardContent className="p-1.5">
                             <p className="text-[8px] font-black uppercase tracking-widest text-[#64748B] inline">Restante </p>
                             <span className="text-xs font-black text-green-400">{remainingHours}h</span>
                           </CardContent>
                        </Card>
                     </div>
                   )}

                   <div className="flex justify-between items-center bg-[#0EA5E9]/10 p-3 rounded-2xl border border-[#0EA5E9]/20">
                      <div>
                        <p className="text-[10px] font-black text-[#0EA5E9] uppercase tracking-tight">Ano de serviço {serviceYear}</p>
                        <p className="text-[9px] text-[#0EA5E9]/80 font-bold mt-0.5">Lançamento mensal de atividades de campo.</p>
                      </div>
                      <div className="flex gap-2">
                        {selectedPublisherId && (
                          <Button
                            onClick={saveS21Data}
                            className="bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold h-8 rounded-xl px-4 gap-1.5 shadow-lg shadow-blue-600/20 text-[10px]"
                          >
                            <Save className="h-3 w-3" />
                            Salvar S-21
                          </Button>
                        )}
                         <Button variant="outline" className="bg-[#0F172A] border-[#0EA5E9]/30 text-[#0EA5E9] hover:bg-[#0EA5E9]/20 h-8 gap-1.5 font-bold px-4 rounded-xl text-[10px] uppercase tracking-widest">
                          <Printer className="h-3 w-3" />
                          Imprimir S-21
                        </Button>
                      </div>
                   </div>

                   <div className="rounded-3xl border border-[#1E293B]/50 overflow-hidden bg-[#0F172A] shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-[#1E293B]/30">
                          <TableRow className="border-[#1E293B]/50 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 px-8 whitespace-nowrap">Mês</TableHead>
                            <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">Participou</TableHead>
                            <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">Estudos</TableHead>
                            <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">Auxiliar</TableHead>
                            <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">Horas</TableHead>
                            <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 px-8 whitespace-nowrap">Observações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isS21Loading ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-[#0EA5E9] mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : !selectedPublisherId ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-12">
                                <p className="text-[#64748B] font-bold text-sm">Selecione um publicador para ver o registro S-21.</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            serviceMonths.map((sm) => {
                              const docId = `${sm.year}-${String(sm.month + 1).padStart(2, '0')}`;
                              const entry = s21Data[docId] || { participou: false, estudos: '', auxiliar: false, horas: '', observacao: '' };
                              return (
                                <TableRow key={sm.name} className="border-[#1E293B]/50 hover:bg-[#1E293B]/30 transition-colors h-16">
                                  <TableCell className="text-sm font-bold text-white px-8">{sm.name}</TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        className="h-5 w-5 border-[#1E293B] data-[state=checked]:bg-[#0EA5E9]"
                                        checked={entry.participou}
                                        onCheckedChange={(checked) => updateS21Field(docId, 'participou', !!checked)}
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={2}
                                      value={entry.estudos}
                                      onChange={(e) => updateS21Field(docId, 'estudos', e.target.value.replace(/\D/g, '').slice(0, 2))}
                                      className="w-20 mx-auto h-12 text-center bg-[#0F172A] border border-[#1E293B] text-sm font-bold rounded-xl text-white focus:outline-none focus:border-[#0EA5E9]"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        className="h-5 w-5 border-[#1E293B] data-[state=checked]:bg-amber-500"
                                        checked={entry.auxiliar}
                                        onCheckedChange={(checked) => updateS21Field(docId, 'auxiliar', !!checked)}
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={2}
                                      value={entry.horas}
                                      onChange={(e) => updateS21Field(docId, 'horas', e.target.value.replace(/\D/g, '').slice(0, 2))}
                                      className="w-24 mx-auto h-12 text-center bg-[#0F172A] border border-[#1E293B] text-sm font-bold rounded-xl text-white focus:outline-none focus:border-[#0EA5E9]"
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell className="px-8">
                                    <input
                                      type="text"
                                      maxLength={35}
                                      value={entry.observacao}
                                      onChange={(e) => updateS21Field(docId, 'observacao', e.target.value.slice(0, 35))}
                                      className="h-12 bg-[#0F172A] border border-[#1E293B] text-xs font-bold rounded-xl min-w-[200px] text-white px-4 focus:outline-none focus:border-[#0EA5E9]"
                                      placeholder="Detalhes..."
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    </div>
                    <div className="h-4" />
                 </TabsContent>
                </div>
              </div>
             </ScrollArea>
         </Tabs>
      </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0F172A] border-none rounded-[32px] p-8 shadow-xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">Excluir Cadastro</DialogTitle>
            <p className="text-[#94A3B8] font-bold text-sm">
              {(() => { const p = publishers.find(p => p.id === selectedPublisherId); return <>Tem certeza que deseja excluir o cadastro de <span className="text-red-600 font-black">"{p?.firstName} {p?.lastName}"</span>?</>; })()} Esta ação não pode ser desfeita.
            </p>
          </DialogHeader>
          <DialogFooter className="pt-6 gap-3 sm:justify-start">
            <Button 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl px-8 flex-1"
            >
              Sim, Excluir
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-[#1E293B] text-[#94A3B8] h-12 rounded-xl px-8"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
