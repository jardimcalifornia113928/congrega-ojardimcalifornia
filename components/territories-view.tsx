'use client';

import React from 'react';
import {
  Map,
  Plus,
  Trash2,
  Pencil,
  Send,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  FileText
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
import { mergeSuperintendent } from '@/lib/superintendent';
import type { Territory } from '@/lib/types';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { toast } from 'sonner';
import { TerritoryPdfPreviewModal } from '@/components/territory-pdf-preview-modal';
import { RegistroPdfPreviewModal } from '@/components/registro-pdf-preview-modal';

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
  dataDesignacao: '',
  horario: '08:45',
  dataConclusao: ''
};

function fullName(p: Publisher) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return `${d}/${m}/${y} - ${days[date.getDay()]}`;
}

function monthKey(dateStr: string): string {
  if (!dateStr) return '';
  const m = dateStr.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : '';
}

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function monthLabel(key: string): string {
  if (!key) return '';
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_LABELS[idx]} ${y}`;
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getTerritoryMonth(t: Territory): string {
  return t.month || monthKey(t.dataDesignacao || '');
}

// Posições dos campos no PDF do território (coordenadas em pt, origem inferior-esquerda)
// Rótulos empilhados à direita: Data / Dirigente / Horário / Saída
const TERRITORY_PDF_FIELDS = [
  { label: 'Data -', x: 538.3, y: 344.5, key: 'data' as const, width: 30.5 },
  { label: 'Dirigente -', x: 538.3, y: 329.5, key: 'dirigente' as const, width: 53.4 },
  { label: 'Horário -', x: 538.3, y: 314.5, key: 'horario' as const, width: 45.6 },
  { label: 'Saída -', x: 538.3, y: 299.5, key: 'saida' as const, width: 34.2 },
];

interface TerritoryCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

async function getTerritoryCrop(): Promise<TerritoryCrop | null> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'territory_crop'));
    const sel = snap.data()?.selections?.[0];
    if (sel && typeof sel.x === 'number' && typeof sel.w === 'number') {
      return { x: sel.x, y: sel.y, w: sel.w, h: sel.h };
    }
  } catch { /* ignora */ }
  try {
    const raw = localStorage.getItem('territory-pdf-selections');
    const arr = raw ? JSON.parse(raw) : [];
    const sel = Array.isArray(arr) ? arr[0] : null;
    if (sel && typeof sel.x === 'number' && typeof sel.w === 'number') {
      return { x: sel.x, y: sel.y, w: sel.w, h: sel.h };
    }
  } catch { /* ignora */ }
  return null;
}

// Estilo para exibir somente a área recortada do mapa dentro do contêiner
function croppedImgStyle(crop: TerritoryCrop | null): React.CSSProperties {
  if (!crop || !crop.w || !crop.h) return {};
  return {
    position: 'absolute',
    width: `${100 / crop.w}%`,
    height: `${100 / crop.h}%`,
    left: `${-(crop.x / crop.w) * 100}%`,
    top: `${-(crop.y / crop.h) * 100}%`,
    maxWidth: 'none',
  };
}

async function generateTerritoryPdf(t: Territory): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const res = await fetch(`/territorio/${t.number}.pdf`);
  if (!res.ok) throw new Error('PDF do território indisponível');
  const bytes = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const page = pdfDoc.getPage(0);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const color = rgb(0.05, 0.08, 0.14);

  const values = {
    data: t.dataDesignacao ? formatDate(t.dataDesignacao) : '',
    dirigente: t.dirigenteName || '',
    horario: t.horario || '',
    saida: t.saidaName || '',
  };

  for (const field of TERRITORY_PDF_FIELDS) {
    const text = values[field.key];
    if (!text) continue;
    page.drawText(text, {
      x: field.x + field.width + 3,
      y: field.y,
      size: 12,
      font,
      color,
    });
  }

  // Aplica o recorte salvo (área útil do mapa) para o mapa aparecer grande no WhatsApp/email
  const crop = await getTerritoryCrop();
  if (crop) {
    const { width, height } = page.getSize();
    const x = crop.x * width;
    const y = (1 - crop.y - crop.h) * height;
    const w = crop.w * width;
    const h = crop.h * height;
    page.setMediaBox(x, y, w, h);
    page.setCropBox(x, y, w, h);
  }

  return pdfDoc.save();
}

export function TerritoriesView() {
  const [territories, setTerritories] = React.useState<Territory[]>([]);
  const [publishers, setPublishers] = React.useState<Publisher[]>([]);
  const publishersBaseRef = React.useRef<any[]>([]);
  const [superintendentSettings, setSuperintendentSettings] = React.useState<{ superintendentName?: string; superintendentDesignations?: string[] } | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sendingId, setSendingId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<{ pdfBytes: Uint8Array; fileName: string; territory: Territory } | null>(null);
  const [registroPreview, setRegistroPreview] = React.useState<{ territories: Territory[]; viewMonth: string; fileName: string } | null>(null);
  const [territoryCrop, setTerritoryCrop] = React.useState<TerritoryCrop | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    getTerritoryCrop().then(setTerritoryCrop);
  }, []);
  const cropAspect = territoryCrop ? ((territoryCrop.w * 1440) / (territoryCrop.h * 810)).toFixed(4) : null;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; number: string } | null>(null);

  const [viewMonth, setViewMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [closeMonthOpen, setCloseMonthOpen] = React.useState(false);
  const [closingMonth, setClosingMonth] = React.useState(false);

  const visibleTerritories = territories.filter(t => getTerritoryMonth(t) === viewMonth);
  const isCurrentMonth = viewMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

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
      data.sort((a, b) => (a.dataDesignacao || '').localeCompare(b.dataDesignacao || '') || a.number.localeCompare(b.number, undefined, { numeric: true }));
      setTerritories(data);
      setIsLoading(false);
    }, (error: unknown) => {
      console.error("Territories fetch error:", error);
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'territories');
    });

    const unsubPublishers = onSnapshot(collection(db, 'publishers'), (snapshot: any) => {
      publishersBaseRef.current = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        firstName: doc.data().firstName || '',
        middleName: doc.data().middleName || '',
        lastName: doc.data().lastName || '',
        phone: doc.data().phone || '',
        designations: doc.data().designations || []
      })) as any[];
      setPublishers(mergeSuperintendent(publishersBaseRef.current, superintendentSettings));
    }, (error: unknown) => {
      console.error("Publishers fetch error:", error);
    });

    return () => {
      unsubTerritories();
      unsubPublishers();
    };
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'settings', `congregation_${user.uid}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSuperintendentSettings({
          superintendentName: data.circuitSuperintendent || "",
          superintendentDesignations: data.superintendentDesignations || [],
        });
      }
    });
    return () => unsub();
  }, [user]);

  React.useEffect(() => {
    setPublishers(mergeSuperintendent(publishersBaseRef.current, superintendentSettings));
  }, [superintendentSettings]);

  const today = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, dataDesignacao: today() });
    setDialogOpen(true);
  };

  const openEdit = (t: Territory) => {
    setEditingId(t.id);
    setForm({
      number: t.number || '',
      dirigenteId: t.dirigenteId || '',
      saidaId: t.saidaId || '',
      dataDesignacao: t.dataDesignacao || today(),
      horario: t.horario || '08:45',
      dataConclusao: t.dataConclusao || ''
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
      horario: form.horario || '',
      dataConclusao: form.dataConclusao || '',
      month: monthKey(form.dataDesignacao || ''),
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

  const handleConclude = async (t: Territory) => {
    try {
      if (t.dataConclusao) {
        await updateDoc(doc(db, 'territories', t.id), {
          dataConclusao: '',
          updatedAt: serverTimestamp()
        });
        toast.success('Conclusão removida');
      } else {
        await updateDoc(doc(db, 'territories', t.id), {
          dataConclusao: today(),
          ultimaDataConcluida: today(),
          updatedAt: serverTimestamp()
        });
        toast.success('Território concluído!');
      }
    } catch (error) {
      console.error("Conclude territory error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `territories/${t.id}`);
      toast.error('Erro ao concluir território');
    }
  };

  const handleCloseMonth = async () => {
    if (!user || visibleTerritories.length === 0) return;
    setClosingMonth(true);
    try {
      const dateNow = today();
      await Promise.all(
        visibleTerritories
          .filter(t => !t.dataConclusao)
          .map(t => updateDoc(doc(db, 'territories', t.id), {
            dataConclusao: dateNow,
            ultimaDataConcluida: dateNow,
            updatedAt: serverTimestamp()
          }))
      );
      setViewMonth(prev => shiftMonth(prev, 1));
      setCloseMonthOpen(false);
      toast.success('Mês fechado com sucesso!');
    } catch (error) {
      console.error("Close month error:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'territories');
      toast.error('Erro ao fechar o mês');
    } finally {
      setClosingMonth(false);
    }
  };

  const sendTerritoryToWhatsApp = async (t: Territory) => {
    if (sendingId) return;
    setSendingId(t.id);

    try {
      const pdfBytes = await generateTerritoryPdf(t);
      setPreview({
        pdfBytes,
        fileName: `territorio-${t.number}.pdf`,
        territory: t,
      });
    } catch (error) {
      console.error("Generate territory PDF error:", error);
      toast.error('Erro ao gerar o PDF do território');
    } finally {
      setSendingId(null);
    }
  };

  const handleGenerateRegistro = () => {
    if (visibleTerritories.length === 0) return;
    setRegistroPreview({
      territories: visibleTerritories,
      viewMonth,
      fileName: `registro-territorios-${viewMonth}.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Territórios</h1>
          <p className="text-xs text-[#94A3B8] font-bold">Designação, acompanhamento e envio para o dirigente de campo.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#1E293B]/40 border border-[#1E293B]/60 rounded-xl px-2 py-1.5">
              <button
                onClick={() => setViewMonth(prev => shiftMonth(prev, -1))}
                className="h-7 w-7 rounded-lg bg-[#1E293B]/60 hover:bg-[#334155] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
                title="Visualizar mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-black text-white min-w-[110px] text-center">{monthLabel(viewMonth)}</span>
              <button
                onClick={() => setViewMonth(prev => shiftMonth(prev, 1))}
                disabled={isCurrentMonth}
                className="h-7 w-7 rounded-lg bg-[#1E293B]/60 hover:bg-[#334155] text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {!isCurrentMonth && (
              <button
                onClick={() => setViewMonth(() => {
                  const now = new Date();
                  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                })}
                className="h-9 px-3 rounded-lg text-[11px] font-bold text-[#0EA5E9] hover:bg-[#0EA5E9]/10 transition-colors"
              >
                Voltar ao mês atual
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button variant="outline" onClick={handleGenerateRegistro} disabled={visibleTerritories.length === 0} className="h-10 border-[#1E293B] text-[#94A3B8] font-bold rounded-xl gap-2 px-5 text-xs w-full sm:w-auto disabled:opacity-40">
            <FileText className="h-3.5 w-3.5" />
            Gerar Registro
          </Button>

          <Button
            onClick={() => setCloseMonthOpen(true)}
            disabled={visibleTerritories.length === 0}
            className="h-10 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl gap-2 px-5 text-xs w-full sm:w-auto"
          >
            <CalendarX2 className="h-3.5 w-3.5" />
            Fechar mês
          </Button>

          <Button onClick={openCreate} className="h-10 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 px-6 text-xs w-full sm:w-auto">
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
          ) : visibleTerritories.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center">
                <Map className="h-8 w-8 text-[#64748B]" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-white">{isCurrentMonth ? 'Nenhuma designação neste mês' : `Nenhuma designação em ${monthLabel(viewMonth)}`}</h3>
                <p className="text-xs text-[#64748B] font-bold max-w-xs mt-1">
                  {isCurrentMonth
                    ? 'Cadastre as designações para acompanhar o trabalho nos territórios.'
                    : 'Volte para o mês atual ou cadastre novas designações.'}
                </p>
              </div>
              {isCurrentMonth && (
                <Button
                  onClick={openCreate}
                  variant="outline"
                  className="h-10 border-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 font-bold px-6 rounded-xl text-xs"
                >
                  Fazer primeira designação
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Cards para celular e tablet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 md:hidden">
                {visibleTerritories.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className={`h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-[#1E293B] ${territoryCrop ? 'relative' : ''}`}>
                        <img
                          src={`/territorio/${t.number}.png`}
                          alt={`Território ${t.number}`}
                          loading="lazy"
                          className={territoryCrop ? '' : 'w-full h-full object-cover'}
                          style={croppedImgStyle(territoryCrop)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-white">Nº {t.number}</span>
                          {t.dataConclusao && (
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 uppercase tracking-wide shrink-0">Concluído</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] font-bold truncate">
                          <span className="text-[#64748B]">Dirigente:</span> {t.dirigenteName || '—'}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] font-bold truncate">
                          <span className="text-[#64748B]">Saída:</span> {t.saidaName || '—'}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] font-bold truncate">
                          <span className="text-[#64748B]">Data:</span> {t.dataDesignacao ? formatDate(t.dataDesignacao) : '—'}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] font-bold truncate">
                          <span className="text-[#64748B]">Conclusão:</span> {t.dataConclusao ? formatDate(t.dataConclusao) : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 px-3 pb-3 pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConclude(t)}
                        className={`text-[11px] font-bold rounded-lg px-2.5 ${t.dataConclusao ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-[#64748B] hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                        title={t.dataConclusao ? 'Remover conclusão' : 'Marcar como concluído'}
                      >
                        {t.dataConclusao
                          ? <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Desfazer</>
                          : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluído</>}
                      </Button>
                      <div className="flex items-center gap-1.5">
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
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela para telas maiores */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#1E293B]/20">
                      <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-6 py-4 w-24">Nº</th>
                      <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-4 py-4">Dirigente</th>
                      <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-4 py-4">Saída de Campo</th>
                      <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-4 py-4">Data da Designação</th>
                      <th className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-4 py-4">Data de Conclusão</th>
                      <th className="text-right text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-6 py-4 w-44">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTerritories.map((t) => (
                      <tr key={t.id} className="border-b border-[#1E293B]/60 hover:bg-[#1E293B]/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-[#1E293B] ${territoryCrop ? 'relative' : ''}`}>
                              <img
                                src={`/territorio/${t.number}.png`}
                                alt={`Território ${t.number}`}
                                loading="lazy"
                                className={territoryCrop ? '' : 'w-full h-full object-cover'}
                                style={croppedImgStyle(territoryCrop)}
                              />
                            </div>
                            <span className="text-sm font-black text-white">{t.number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[#94A3B8] font-bold">{t.dirigenteName || '—'}</td>
                        <td className="px-4 py-4 text-[#94A3B8] font-bold">{t.saidaName || '—'}</td>
                        <td className="px-4 py-4 text-[#94A3B8] font-bold">{t.dataDesignacao ? formatDate(t.dataDesignacao) : '—'}</td>
                        <td className="px-4 py-4">
                          {t.dataConclusao ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {formatDate(t.dataConclusao)}
                            </span>
                          ) : (
                            <span className="text-[#64748B] font-bold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConclude(t)}
                              className={`text-[11px] font-bold rounded-lg px-2 ${t.dataConclusao ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-[#64748B] hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                              title={t.dataConclusao ? 'Remover conclusão' : 'Marcar como concluído'}
                            >
                              {t.dataConclusao
                                ? <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Desfazer</>
                                : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluído</>}
                            </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#0F172A] border-none rounded-3xl sm:rounded-[32px] p-5 sm:p-8 shadow-xl shadow-black/30 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">
              {editingId ? 'Editar Designação' : 'Nova Designação'}
            </DialogTitle>
            <p className="text-[#94A3B8] font-bold text-sm">
              {editingId
                ? 'Atualize os dados da designação deste território.'
                : 'Selecione o território e preencha os dados da designação.'}
            </p>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="py-4 sm:py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="number" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Nº do Território *</Label>
              <Select
                value={form.number}
                onValueChange={(val) => setForm({ ...form, number: val ?? '' })}
              >
                <SelectTrigger className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl w-full">
                  <span>{form.number ? `Nº ${form.number}` : "Selecione o território"}</span>
                </SelectTrigger>
                <SelectContent>
                  {TERRITORIOS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.number && (
                <div
                  className={`mt-2 rounded-2xl overflow-hidden border border-[#1E293B] bg-[#1E293B]/30 ${cropAspect ? 'relative' : 'h-32 sm:h-44'}`}
                  style={cropAspect ? { aspectRatio: cropAspect } : undefined}
                >
                  <img
                    src={`/territorio/${form.number}.png`}
                    alt={`Território Nº ${form.number}`}
                    className={territoryCrop ? '' : 'w-full h-full object-cover'}
                    style={croppedImgStyle(territoryCrop)}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dirigenteId" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Dirigente de Campo</Label>
                <Select
                  value={form.dirigenteId}
                  onValueChange={(val) => setForm({ ...form, dirigenteId: val ?? '' })}
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
                  onValueChange={(val) => setForm({ ...form, saidaId: val ?? '' })}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="horario" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Horário da Saída</Label>
                <Input
                  id="horario"
                  type="time"
                  className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20"
                  value={form.horario}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="dataConclusao" className="text-[10px] font-black text-[#64748B] tracking-widest uppercase">Data de Conclusão</Label>
                <Input
                  id="dataConclusao"
                  type="date"
                  className="h-12 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-xl focus:ring-blue-500/20"
                  value={form.dataConclusao}
                  onChange={(e) => setForm({ ...form, dataConclusao: e.target.value })}
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

      <Dialog open={closeMonthOpen} onOpenChange={(open) => !open && setCloseMonthOpen(false)}>
        <DialogContent className="sm:max-w-md bg-[#0F172A] border-none rounded-[32px] p-8 shadow-xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">Fechar mês</DialogTitle>
            <p className="text-[#94A3B8] font-bold text-sm">
              Fechar o mês de <span className="text-amber-400 font-black">{monthLabel(viewMonth)}</span>? As designações sem conclusão serão marcadas como concluídas hoje e a lista será zerada para o próximo mês.
            </p>
          </DialogHeader>
          <DialogFooter className="pt-6 gap-3 sm:justify-start">
            <Button
              onClick={handleCloseMonth}
              disabled={closingMonth}
              className="bg-amber-500 hover:bg-amber-600 text-[#0F172A] font-bold h-12 rounded-xl px-8 flex-1"
            >
              {closingMonth ? 'Fechando...' : 'Sim, Fechar Mês'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setCloseMonthOpen(false)}
              className="border-[#1E293B] text-[#94A3B8] h-12 rounded-xl px-8"
            >
              Cancelar
            </Button>
          </DialogFooter>
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

      {preview && (
        <TerritoryPdfPreviewModal
          pdfBytes={preview.pdfBytes}
          fileName={preview.fileName}
          shareText={`🗺️ Território Nº ${preview.territory.number}\nDirigente: ${preview.territory.dirigenteName || '—'}\nSaída de campo: ${preview.territory.saidaName || '—'}${preview.territory.dataDesignacao ? `\nData: ${formatDate(preview.territory.dataDesignacao)}` : ''}`}
          onClose={() => {
            setPreview(null);
            getTerritoryCrop().then(setTerritoryCrop);
          }}
        />
      )}

      {registroPreview && (
        <RegistroPdfPreviewModal
          territories={registroPreview.territories}
          viewMonth={registroPreview.viewMonth}
          fileName={registroPreview.fileName}
          userEmail={user?.email}
          onClose={() => setRegistroPreview(null)}
        />
      )}
    </div>
  );
}