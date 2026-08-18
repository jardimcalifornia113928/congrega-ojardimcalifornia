'use client';

import React, { useState } from 'react';
import { Loader2, Users, Phone, ArrowUpDown, ArrowDownAZ, Save, Check, Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { phoneMask } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import { collection, onSnapshot, query, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { CongregationPreviewModal } from '@/components/congregation-preview-modal';
import type { CongregationPrintRow } from '@/components/congregation-print-layout';

const RESPONSIBILITY_LABELS: Record<string, string> = {
  publicador: 'Publicador',
  estudante: 'Estudante',
  servo: 'Servo Ministerial',
  anciao: 'Ancião',
};

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  removido: 'Removido',
  mudou: 'Mudou',
};

const FILTERS = [
  { id: 'all', label: 'Todos os Publicadores' },
  { id: 'anciao', label: 'Anciãos' },
  { id: 'servo', label: 'Servos Ministeriais' },
  { id: 'regular', label: 'Pioneiros Regulares' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function CongregationView() {
  const [publishers, setPublishers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [savingPhones, setSavingPhones] = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) {
      setPublishers([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'publishers'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const pubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) =>
        [a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ').localeCompare(
          [b.firstName, b.middleName, b.lastName].filter(Boolean).join(' ')
        )
      );
      setPublishers(pubs);
      setIsLoading(false);
    }, (error: unknown) => {
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'publishers');
    });
    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'groups'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      setGroups(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));
    }, (error: unknown) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });
    return () => unsubscribe();
  }, [user]);

  const getFullName = (p: any) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
  const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || 'Não atribuído';

  const matchesFilter = (p: any) => {
    if (filter === 'all') return true;
    if (filter === 'anciao') return p.responsibility === 'anciao';
    if (filter === 'servo') return p.responsibility === 'servo';
    if (filter === 'regular') return p.pioneerType === 'regular';
    return true;
  };

  const filteredPublishers = publishers.filter(matchesFilter);

  const printRows: CongregationPrintRow[] = filteredPublishers.map(p => ({
    name: getFullName(p),
    phone: p.phone ? phoneMask(p.phone) : '',
    groupName: getGroupName(p.groupId),
    responsibility: RESPONSIBILITY_LABELS[p.responsibility] || 'Publicador',
    status: STATUS_LABELS[p.status] || 'Ativo',
  }));

  const printTitle = 'Publicadores Jardim Califórnia';
  const printSubtitle = FILTERS.find(f => f.id === filter)?.label || 'Todos os Publicadores';

  const handleSavePhone = async (publisherId: string) => {
    if (!user || !phoneDrafts[publisherId]) return;
    setSavingPhones(prev => new Set(prev).add(publisherId));
    try {
      await updateDoc(doc(db, 'publishers', publisherId), {
        phone: phoneDrafts[publisherId],
        updatedAt: serverTimestamp()
      });
      setPhoneDrafts(prev => {
        const next = { ...prev };
        delete next[publisherId];
        return next;
      });
      const pub = publishers.find(p => p.id === publisherId);
      toast.success(`Celular de ${getFullName(pub)} salvo!`);
    } catch (error: any) {
      console.error("Save phone error:", error);
      toast.error(`Erro ao salvar celular: ${error.message || "Erro desconhecido"}`);
      handleFirestoreError(error, OperationType.UPDATE, `publishers/${publisherId}`);
    } finally {
      setSavingPhones(prev => {
        const next = new Set(prev);
        next.delete(publisherId);
        return next;
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Congregação</h1>
          <p className="text-[#94A3B8] font-bold">Lista completa do corpo de publicadores.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowPrintPreview(true)}
            disabled={filteredPublishers.length === 0}
            variant="outline"
            className="border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155] font-bold h-9 rounded-xl gap-2 px-5 text-[11px]"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Badge className="bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20 font-bold h-9 px-4 rounded-xl text-[11px] uppercase tracking-wider">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            {filteredPublishers.length} publicador(es)
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-4 h-9 rounded-xl text-[11px] font-bold transition-all cursor-pointer outline-none whitespace-nowrap",
              filter === f.id
                ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border border-[#0EA5E9]/30 shadow-sm"
                : "bg-[#1E293B]/50 text-[#94A3B8] border border-[#1E293B] hover:bg-[#1E293B] hover:text-[#F1F5F9]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="bg-[#0F172A] border-[#1E293B] shadow-sm rounded-3xl overflow-hidden flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 min-h-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-[#1E293B]/30 sticky top-0 z-10">
                <TableRow className="border-[#1E293B]/50 hover:bg-transparent">
                  <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 px-6 whitespace-nowrap">
                    <ArrowDownAZ className="h-3 w-3 inline mr-1.5 text-[#0EA5E9]" />
                    Nome
                  </TableHead>
                  <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">
                    <Phone className="h-3 w-3 inline mr-1.5 text-[#0EA5E9]" />
                    Celular
                  </TableHead>
                  <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">
                    <ArrowUpDown className="h-3 w-3 inline mr-1.5 text-[#0EA5E9]" />
                    Grupo de Campo
                  </TableHead>
                  <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">Responsabilidade</TableHead>
                  <TableHead className="text-[10px] font-black text-[#94A3B8] uppercase h-14 text-center whitespace-nowrap">Situação na Congregação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-[#0EA5E9] mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredPublishers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-[#1E293B]/50 flex items-center justify-center">
                          <Users className="h-7 w-7 text-[#64748B]" />
                        </div>
                        <p className="text-[#64748B] font-bold text-sm">Nenhum publicador encontrado</p>
                        <p className="text-xs text-[#64748B]">Ajuste o filtro ou cadastre novos publicadores.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPublishers.map((p: any, idx: number) => {
                    const hasDraft = phoneDrafts[p.id] !== undefined;
                    const phoneValue = hasDraft ? phoneDrafts[p.id] : (p.phone || '');
                    const isSaving = savingPhones.has(p.id);
                    const statusBg: Record<string, string> = {
                      ativo: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      inativo: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      removido: 'bg-red-500/10 text-red-400 border-red-500/20',
                      mudou: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                    };
                    const respBg: Record<string, string> = {
                      publicador: 'bg-[#1E293B]/60 text-[#94A3B8] border-[#1E293B]',
                      estudante: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
                      servo: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                      anciao: 'bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20',
                    };
                    return (
                      <TableRow key={p.id} className={cn("border-[#1E293B]/50 hover:bg-[#1E293B]/30 transition-colors h-16", idx % 2 === 0 && "bg-[#1E293B]/10")}>
                        <TableCell className="px-6">
                          <p className="text-sm font-bold text-white">{getFullName(p)}</p>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={phoneValue ? phoneMask(phoneValue) : ''}
                              placeholder="(00) 00000-0000"
                              onChange={(e) => setPhoneDrafts(prev => ({ ...prev, [p.id]: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                              className="w-40 h-9 text-center text-sm font-bold bg-[#0F172A] border border-[#1E293B] text-white rounded-xl focus:outline-none focus:border-[#0EA5E9] transition-colors"
                            />
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#0EA5E9] shrink-0" />
                            ) : hasDraft ? (
                              <button
                                onClick={() => handleSavePhone(p.id)}
                                title="Salvar celular"
                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-bold text-[#94A3B8]">{getGroupName(p.groupId)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("font-bold text-[9px] uppercase tracking-wider border rounded-lg px-3 py-1", respBg[p.responsibility] || respBg.publicador)}>
                            {RESPONSIBILITY_LABELS[p.responsibility] || 'Publicador'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("font-bold text-[9px] uppercase tracking-wider border rounded-lg px-3 py-1", statusBg[p.status] || statusBg.ativo)}>
                            {STATUS_LABELS[p.status] || 'Ativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showPrintPreview && (
        <CongregationPreviewModal
          title={printTitle}
          subtitle={printSubtitle}
          rows={printRows}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}

export default CongregationView;