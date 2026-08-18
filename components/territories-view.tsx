'use client';

import React from 'react';
import {
  Map,
  Plus,
  Printer,
  Trash2,
  Pencil,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';
import type { Territory } from '@/lib/types';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { toast } from 'sonner';

interface Publisher {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  designations?: string[];
}

const TERRITORIOS = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'));

const DIRIGENTE_DESIGNATION = 'Serviço de campo::Dirigente de campo';
const SAIDA_DESIGNATION = 'Serviço de campo::Saída de campo';

const EMPTY_FORM = {
  number: '',
  dirigenteId: '',
  saidaId: '',
  dataDesignacao: ''
};

function fullName(p: Publisher) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
}

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '55';
  return '55' + digits;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function buildMessage(t: Territory): string {
  const lines = [
    `🗺️ *Designação de Território*`,
    ``,
    `*Território:* Nº ${t.number}`,
    `*Dirigente:* ${t.dirigenteName || '—'}`,
    `*Saída de campo:* ${t.saidaName || '—'}`
  ];
  if (t.dataDesignacao) lines.push(`*Data da designação:* ${formatDate(t.dataDesignacao)}`);
  return lines.join('\n');
}

export function TerritoriesView() {
  const [territories, setTerritories] = React.useState<Territory[]>([]);
  const [publishers, setPublishers] = React.useState<Publisher[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sendingId, setSendingId] = React.useState<string | null>(null);
  const { user } = useAuth();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; number: string } | null>(null);

  const dirigentes = publishers
    .filter(p => p.designations?.includes(DIRIGENTE_DESIGNATION))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  const saidas = publishers
    .filter(p => p.designations?.includes(SAIDA_DESIGNATION))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  React.useEffect(() => {
    if (!user) {
      setTerritories([]);
      setPublishers([]);
      setIsLoading(false);
      return;
    }

    const unsubTerritories = onSnapshot(collection(db, 'territories'), (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Territory[];
      data.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      setTerritories(data);
      setIsLoading(false);
    }, (error: unknown) => {
      console.error("Territories fetch error:", error);
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'territories');
    });

    const unsubPublishers = onSnapshot(collection(db, 'publishers'), (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        firstName: doc.data().firstName || '',
        middleName: doc.data().middleName || '',
        lastName: doc.data().lastName || '',
        phone: doc.data().phone || '',
        designations: doc.data().designations || []
      })) as Publisher[];
      setPublishers(data);
    }, (error: unknown) => {
      console.error("Publishers fetch error:", error);
    });

    return () => {
      unsubTerritories();
      unsubPublishers();
    };
  }, [user]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: Territory) => {
    setEditingId(t.id);
    setForm({
      number: t.number || '',
      dirigenteId: t.dirigenteId || '',
      saidaId: t.saidaId || '',
      dataDesignacao: t.dataDesignacao || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.number || !user) return;
    setSaving(true);

    const findPub = (id: string) => publishers.find(p => p.id === id);
    const dirigente = findPub(form.dirigenteId);
    const saida = findPub(form.saidaId);

    const payload = {
      number: form.number,
      dirigenteId: form.dirigenteId || '',
      dirigenteName: dirigente ? fullName(dirigente) : '',
      dirigentePhone: dirigente?.phone || '',
      saidaId: form.saidaId || '',
      saidaName: saida ? fullName(saida) : '',
      dataDesignacao: form.dataDesignacao || '',
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'territories', editingId), payload);
        toast.success('Território atualizado!');
      } else {
        await addDoc(collection(db, 'territories'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Território criado!');
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (error) {
      console.error("Save territory error:", error);
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'territories');
      toast.error('Erro ao salvar território');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'territories', deleteTarget.id));
      toast.success('Território excluído!');
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete territory error:", error);
      handleFirestoreError(error, OperationType.DELETE, `territories/${deleteTarget.id}`);
      toast.error('Erro ao excluir território');
    }
  };

  const sendTerritoryToWhatsApp = async (t: Territory) => {
    if (!t.dirigentePhone) {
      toast.error('Dirigente sem telefone cadastrado');
      return;
    }
    if (sendingId) return;
    setSendingId(t.id);
    const message = buildMessage(t);
    const waUrl = `https://wa.me/${toWhatsAppNumber(t.dirigentePhone)}?text=${encodeURIComponent(message)}`;
    const imageUrl = `/territorio/${t.number}.png`;

    // No desktop, abre o WhatsApp direto (wa.me com o texto) — caminho garantido
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (!isMobile || !navigator.canShare) {
      window.open(waUrl, '_blank', 'noopener');
      setSendingId(null);
      return;
    }

    // No mobile, tenta o Web Share com a imagem (WhatsApp aparece na lista de apps)
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('imagem indisponível');
      const blob = await res.blob();
      const file = new File([blob], `${t.number}.png`, { type: blob.type });
      const shareData = { files: [file], text: message, title: `Território Nº ${t.number}` };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Enviado para o dirigente!');
        setSendingId(null);
        return;
      }
    } catch {
      // Web Share falhou ou cancelado → cai no wa.me
    }
    window.open(waUrl, '_blank', 'noopener');
    setSendingId(null);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    printWindow.document.write(`
      <html>
      <head>
        <title>Territórios - Jardim Califórnia</title>
        <style>
          @page { margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #222; padding: 20px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Territórios — Jardim Califórnia</h1>
        <p class="subtitle">Relatório gerado em ${dateStr}</p>
        <table>
          <thead>
            <tr>
              <th style="width:60px">Nº</th>
              <th>Dirigente</th>
              <th>Saída de campo</th>
              <th style="width:150px">Data da Designação</th>
            </tr>
          </thead>
          <tbody>
            ${territories.map(t => `
              <tr>
                <td><strong>${t.number}</strong></td>
                <td>${t.dirigenteName || '—'}</td>
                <td>${t.saidaName || '—'}</td>
                <td>${t.dataDesignacao ? formatDate(t.dataDesignacao) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">Jardim Califórnia — Congregação de Testemunhas de Jeová</div>
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
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Territórios</h1>
          <p className="text-xs text-[#94A3B8] font-bold">Designação, acompanhamento e envio para o dirigente de campo.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint} className="h-10 border-[#1E293B] text-[#94A3B8] font-bold rounded-xl gap-2 px-5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            Gerar PDF
          </Button>

          <Button onClick={openCreate} className="h-10 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 px-6 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nova Designação
          </Button>
        </div>
      </div>

      <Card className="border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : territories.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center">
                <Map className="h-8 w-8 text-[#64748B]" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-white">Nenhuma designação de território</h3>
                <p className="text-xs text-[#64748B] font-bold max-w-xs mt-1">
                  Cadastre as designações para acompanhar o trabalho nos territórios.
                </p>
              </div>
              <Button
                onClick={openCreate}
                variant="outline"
                className="h-10 border-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 font-bold px-6 rounded-xl text-xs"
              >
                Fazer primeira designação
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#1E293B]/20">
                    <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-6 py-4 w-24">Nº</th>
                    <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-4 py-4">Dirigente</th>
                    <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-4 py-4">Saída de Campo</th>
                    <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-4 py-4">Data da Designação</th>
                    <th className="text-right text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-6 py-4 w-36">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {territories.map((t) => (
                    <tr key={t.id} className="border-b border-[#1E293B]/60 hover:bg-[#1E293B]/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-[#1E293B]">
                            <img
                              src={`/territorio/${t.number}.png`}
                              alt={`Território ${t.number}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm font-black text-white">{t.number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#94A3B8] font-bold">{t.dirigenteName || '—'}</td>
                      <td className="px-4 py-4 text-[#94A3B8] font-bold">{t.saidaName || '—'}</td>
                      <td className="px-4 py-4 text-[#94A3B8] font-bold">{t.dataDesignacao ? formatDate(t.dataDesignacao) : '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => sendTerritoryToWhatsApp(t)}
                            disabled={sendingId === t.id}
                            className="text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10 transition-colors"
                            title="Enviar para o dirigente"
                          >
                            {sendingId === t.id
                              ? <div className="h-4 w-4 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
                              : <Send className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(t)}
                            className="text-[#64748B] hover:text-white transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: t.id, number: t.number })}
                            className="text-[#64748B] hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-[#0F172A] border-none rounded-[32px] p-8 shadow-xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">
              {editingId ? 'Editar Designação' : 'Nova Designação'}
            </DialogTitle>
            <p className="text-[#94A3B8] font-bold text-sm">
              {editingId
                ? 'Atualize os dados da designação deste território.'
                : 'Preencha os dados para designar o território.'}
            </p>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="py-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Nº do Território *</Label>
                <Select
                  value={form.number}
                  onValueChange={(val) => setForm({ ...form, number: val })}
                >
                  <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl w-full">
                    <span>{form.number ? `Território Nº ${form.number}` : "Selecione o território"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {TERRITORIOS.map((n) => (
                      <SelectItem key={n} value={n}>Território Nº {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.number && (
                  <div className="mt-2 rounded-2xl overflow-hidden border border-[#1E293B] h-40 bg-[#1E293B]/30">
                    <img
                      src={`/territorio/${form.number}.png`}
                      alt={`Território Nº ${form.number}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dirigenteId" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Dirigente de Campo</Label>
                <Select
                  value={form.dirigenteId}
                  onValueChange={(val) => setForm({ ...form, dirigenteId: val })}
                >
                  <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl w-full">
                    <span>{form.dirigenteId ? (dirigentes.find(p => p.id === form.dirigenteId) ? fullName(dirigentes.find(p => p.id === form.dirigenteId)!) : "Selecionar...") : "Selecionar..."}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {dirigentes.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-[#64748B] font-bold">
                        Nenhum publicador com a designação de dirigente
                      </div>
                    ) : dirigentes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{fullName(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="saidaId" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Saída de Campo</Label>
                <Select
                  value={form.saidaId}
                  onValueChange={(val) => setForm({ ...form, saidaId: val })}
                >
                  <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl w-full">
                    <span>{form.saidaId ? (saidas.find(p => p.id === form.saidaId) ? fullName(saidas.find(p => p.id === form.saidaId)!) : "Selecionar...") : "Selecionar..."}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {saidas.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-[#64748B] font-bold">
                        Nenhum publicador com a designação de saída de campo
                      </div>
                    ) : saidas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{fullName(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="dataDesignacao" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Data da Designação</Label>
                <Input
                  id="dataDesignacao"
                  type="date"
                  className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20"
                  value={form.dataDesignacao}
                  onChange={(e) => setForm({ ...form, dataDesignacao: e.target.value })}
                />
              </div>
            <DialogFooter className="pt-4 gap-3 sm:justify-start">
              <Button
                type="submit"
                disabled={!form.number || saving}
                className="bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold h-12 rounded-xl px-8 flex-1"
              >
                {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Confirmar Criação')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-[#1E293B] text-[#94A3B8] h-12 rounded-xl px-8"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md bg-[#0F172A] border-none rounded-[32px] p-8 shadow-xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">Excluir Designação</DialogTitle>
            <p className="text-[#94A3B8] font-bold text-sm">
              Tem certeza que deseja excluir o território <span className="text-red-600 font-black">Nº {deleteTarget?.number}</span>? Esta ação não pode ser desfeita.
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
              onClick={() => setDeleteTarget(null)}
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