'use client';

import React from 'react';
import { 
  UsersRound, 
  Plus, 
  Printer,
  Shield,
  UserPlus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy,
  where,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { toast } from 'sonner';

export function GroupsView() {
  const [groups, setGroups] = React.useState<any[]>([]);
  const [publishers, setPublishers] = React.useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) {
      setGroups([]);
      setPublishers([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'groups'), 
      where('ownerId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      setGroups(groupsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Groups fetch error:", error);
      handleFirestoreError(error, OperationType.LIST, 'groups');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'publishers'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPublishers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    const toastId = toast.loading("Criando grupo...");
    
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        count: 0,
        members: [],
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      toast.success("Grupo criado com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Add group error:", error);
      toast.error("Erro ao criar grupo", { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    }
  };

  const [groupToDelete, setGroupToDelete] = React.useState<{id: string, name: string} | null>(null);

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    const { id, name } = groupToDelete;
    const toastId = toast.loading(`Excluindo ${name}...`);
    try {
      await deleteDoc(doc(db, 'groups', id));
      // Limpa groupId dos publicadores que pertenciam a este grupo
      const publishersInGroup = publishers.filter((p: any) => p.groupId === id);
      await Promise.all(publishersInGroup.map((p: any) =>
        updateDoc(doc(db, 'publishers', p.id), { groupId: '', updatedAt: serverTimestamp() })
      ));
      toast.success("Grupo excluído!", { id: toastId });
      setGroupToDelete(null);
    } catch (error: any) {
      console.error("Delete group error:", error);
      toast.error(`Erro ao excluir: ${error.message || "Erro desconhecido"}`, { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `groups/${id}`);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const monthStr = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    printWindow.document.write(`
      <html>
      <head>
        <title>Grupos de Campo - Jardim Califórnia</title>
        <style>
          @page { margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #222; padding: 20px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
          .group { margin-bottom: 24px; page-break-inside: avoid; }
          .group-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 10px; }
          .group-name { font-size: 16px; font-weight: bold; }
          .group-count { font-size: 11px; color: #666; }
          .leader { font-size: 12px; color: #444; margin-bottom: 8px; }
          .leader span { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Grupos de Campo — Jardim Califórnia</h1>
        <p class="subtitle">Relatório gerado em ${dateStr}</p>
        ${groups.map(group => {
          const gp = publishers.filter((p: any) => p.groupId === group.id).sort((a: any, b: any) => (a.firstName || '').localeCompare(b.firstName || ''));
          const sup = gp.find((p: any) => p.designations?.includes("Serviço de campo::Super. de Grupo"));
          const aux = gp.find((p: any) => p.designations?.includes("Serviço de campo::Aux. Super. de Grupo"));
          return `
            <div class="group">
              <div class="group-header">
                <span class="group-name">${group.name}</span>
                <span class="group-count">${gp.length} publicador(es)</span>
              </div>
              <div class="leader">
                Super.: <span>${sup ? `${sup.firstName} ${sup.lastName}` : 'Ninguém designado'}</span>
                &nbsp;|&nbsp;
                Aux.: <span>${aux ? `${aux.firstName} ${aux.lastName}` : 'Ninguém designado'}</span>
              </div>
              <table>
                <thead>
                  <tr><th style="width:40px">#</th><th>Nome</th><th style="width:100px">Responsabilidade</th><th style="width:80px">Pioneiro</th></tr>
                </thead>
                <tbody>
                  ${gp.map((p: any, i: number) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${p.firstName || ''} ${p.lastName || ''}</td>
                      <td>${p.responsibility === 'anciao' ? 'Ancião' : p.responsibility === 'servo_ministerial' ? 'Servo Ministerial' : 'Publicador'}</td>
                      <td>${p.pioneerType === 'regular' ? 'Pioneiro Regular' : p.pioneerType === 'auxiliar' ? 'Auxiliar' : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
        ${(() => {
          const groupIds = groups.map(g => g.id);
          const ungrouped = publishers.filter((p: any) => !p.groupId || !groupIds.includes(p.groupId)).sort((a: any, b: any) => (a.firstName || '').localeCompare(b.firstName || ''));
          if (ungrouped.length === 0) return '';
          return `
            <div class="group">
              <div class="group-header" style="border-color:#999;">
                <span class="group-name" style="color:#666;">Sem Grupo</span>
                <span class="group-count">${ungrouped.length} publicador(es)</span>
              </div>
              <table>
                <thead>
                  <tr><th style="width:40px">#</th><th>Nome</th><th style="width:100px">Responsabilidade</th><th style="width:80px">Pioneiro</th></tr>
                </thead>
                <tbody>
                  ${ungrouped.map((p: any, i: number) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${p.firstName || ''} ${p.lastName || ''}</td>
                      <td>${p.responsibility === 'anciao' ? 'Ancião' : p.responsibility === 'servo_ministerial' ? 'Servo Ministerial' : 'Publicador'}</td>
                      <td>${p.pioneerType === 'regular' ? 'Pioneiro Regular' : p.pioneerType === 'auxiliar' ? 'Auxiliar' : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        })()}
        <div class="footer">Jardim Califórnia — Congregação de Testemunhas de Jeová — Mês de ${monthStr}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Grupo de Campo</h1>
          <p className="text-xs text-[#94A3B8] font-bold">Organização estratégica dos grupos de serviço.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint} className="h-10 border-[#1E293B] text-[#94A3B8] font-bold rounded-xl gap-2 px-5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            Gerar PDF
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger render={<Button className="h-10 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 px-6 text-xs" />}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Grupo
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#0F172A] border-none rounded-[32px] p-8 shadow-xl shadow-black/30">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white tracking-tight">Criar Novo Grupo</DialogTitle>
                <p className="text-[#94A3B8] font-bold text-sm">Defina um nome para o novo grupo de serviço.</p>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }} className="py-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Nome do Grupo</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: Grupo Raposa, Grupo 1..." 
                    className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    autoFocus
                  />
                </div>
                <DialogFooter className="pt-4 gap-3 sm:justify-start">
                  <Button 
                    type="submit"
                    disabled={!newGroupName.trim()}
                    className="bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold h-12 rounded-xl px-8 flex-1"
                  >
                    Confirmar Criação
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-[#1E293B] text-[#94A3B8] h-12 rounded-xl px-8"
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4">
        {groups.length === 0 ? (
          <div className="flex-1 py-16 flex flex-col items-center justify-center bg-[#0F172A] border border-dashed border-[#1E293B] rounded-[32px] space-y-4">
             <div className="h-16 w-16 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center">
                <UsersRound className="h-8 w-8 text-[#64748B]" />
             </div>
             <div className="text-center">
                <h3 className="text-lg font-black text-white">Nenhum grupo configurado</h3>
                <p className="text-xs text-[#64748B] font-bold max-w-xs mt-1">Os grupos são vinculados aos publicadores no cadastro espiritual.</p>
             </div>
             <Button 
               onClick={() => setIsCreateDialogOpen(true)}
               variant="outline" 
               className="h-10 border-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 font-bold px-6 rounded-xl text-xs"
             >
               Começar agora
             </Button>
          </div>
        ) : (
          groups.map((group) => (
             <Card key={group.id} className="min-w-[300px] max-w-[400px] max-h-[500px] border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden group hover:shadow-xl transition-all shrink-0">
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="p-5 bg-[#1E293B]/30 border-b border-[#1E293B]/50 flex justify-between items-start shrink-0">
                    <div className="space-y-0.5">
                      <h3 className="text-lg font-black text-white">{group.name}</h3>
                      <p className="text-[10px] font-black text-[#0EA5E9] uppercase tracking-widest">{publishers.filter((p: any) => p.groupId === group.id).length} Publicadores</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setGroupToDelete({ id: group.id, name: group.name })}
                      className="text-[#64748B] hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-5 space-y-3 overflow-y-auto flex-1">
                    <div className="space-y-1.5 mb-3">
                      {(() => {
                        const gp = publishers.filter((p: any) => p.groupId === group.id);
                        const sup = gp.find((p: any) => p.designations?.includes("Serviço de campo::Super. de Grupo"));
                        const aux = gp.find((p: any) => p.designations?.includes("Serviço de campo::Aux. Super. de Grupo"));
                        return <>
                          <div className="flex items-center gap-2 text-[#0EA5E9]"><Shield className="h-3.5 w-3.5" /><p className="text-[10px] font-black uppercase tracking-widest">Super.: {sup ? `${sup.firstName} ${sup.lastName}` : "Ninguém designado"}</p></div>
                          <div className="flex items-center gap-2 text-[#94A3B8]"><UserPlus className="h-3.5 w-3.5" /><p className="text-[10px] font-black uppercase tracking-widest">Aux.: {aux ? `${aux.firstName} ${aux.lastName}` : "Ninguém designado"}</p></div>
                        </>;
                      })()}
                    </div>
                    <div className="flex flex-col gap-1">
                       {publishers.filter((p: any) => p.groupId === group.id).sort((a: any, b: any) => (a.firstName || '').localeCompare(b.firstName || '')).map((p: any) => (
                          <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1E293B]/30 rounded-lg text-[11px] font-bold text-[#94A3B8] shrink-0">
                            <div className="h-5 w-5 rounded-md bg-[#1E293B]/50 flex items-center justify-center text-[9px] font-bold text-[#64748B] shrink-0">
                              {p.firstName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="truncate">{p.firstName} {p.lastName}</span>
                          </div>
                       ))}
                       {publishers.filter((p: any) => p.groupId === group.id).length === 0 && (
                         <p className="text-[10px] text-[#64748B] italic">Nenhum publicador vinculado</p>
                       )}
                    </div>
                  </div>
                </CardContent>
             </Card>
          ))
        )}
        {/* Ungrouped publishers card */}
        {(() => {
          const groupIds = groups.map(g => g.id);
          const ungrouped = publishers.filter((p: any) => !p.groupId || !groupIds.includes(p.groupId)).sort((a: any, b: any) => (a.firstName || '').localeCompare(b.firstName || ''));
          if (ungrouped.length === 0) return null;
          return (
            <Card className="min-w-[300px] max-w-[400px] max-h-[500px] border-[#1E293B]/50 border-dashed shadow-sm rounded-[32px] overflow-hidden shrink-0 bg-[#0F172A]/50">
              <CardContent className="p-0 flex flex-col h-full">
                <div className="p-5 bg-[#1E293B]/20 border-b border-[#1E293B]/50 shrink-0">
                  <h3 className="text-lg font-black text-[#94A3B8]">Sem Grupo</h3>
                  <p className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">{ungrouped.length} publicador(es)</p>
                </div>
                <div className="p-5 space-y-1 overflow-y-auto flex-1">
                  {ungrouped.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1E293B]/30 rounded-lg text-[11px] font-bold text-[#64748B] shrink-0">
                      <div className="h-5 w-5 rounded-md bg-[#1E293B]/50 flex items-center justify-center text-[9px] font-bold text-[#64748B] shrink-0">
                        {p.firstName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="truncate">{p.firstName} {p.lastName}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      <Dialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-[#0F172A] border-none rounded-[32px] p-8 shadow-xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">Excluir Grupo</DialogTitle>
            <p className="text-[#94A3B8] font-bold text-sm">
              Tem certeza que deseja excluir o grupo <span className="text-red-600 font-black">"{groupToDelete?.name}"</span>? Esta ação não pode ser feita.
            </p>
          </DialogHeader>
          <DialogFooter className="pt-6 gap-3 sm:justify-start">
            <Button 
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl px-8 flex-1"
            >
              Sim, Excluir
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setGroupToDelete(null)}
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
