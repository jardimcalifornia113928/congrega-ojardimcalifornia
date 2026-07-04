'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, Shield, Calendar, Phone, Database, Save, MapPin, Hash, Clock, UserCog, Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" }
];

export function SettingsView() {
  const [form, setForm] = useState({
    congregationName: "Jardim Califórnia",
    address: "",
    congregationNumber: "",
    circuit: "SP-00",
    midweekDay: 2,
    midweekTime: "",
    weekendDay: 6,
    weekendTime: "",
    circuitSuperintendent: "",
    circuitSuperintendentWife: "",
    circuitSuperintendentPhone: ""
  });

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const COLLECTIONS = ['publishers', 'groups', 'midweek_meetings', 'weekend_meetings', 'attendance', 'field_reports', 'users', 'public_witness'];

  const SETTINGS_DOC_ID = user ? `congregation_${user.uid}` : null;

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'settings', `congregation_${user.uid}`);
    const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as typeof form;
        setForm(prev => ({ ...prev, ...data }));
      }
    }, (error: unknown) => {
      console.error("Error loading settings:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveAll = async () => {
    if (!user || !SETTINGS_DOC_ID) return;
    const toastId = toast.loading("Salvando configurações...");
    try {
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), {
        ...form,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Configurações salvas!", { id: toastId });
    } catch (error) {
      console.error("Save settings error:", error);
      toast.error("Erro ao salvar configurações.", { id: toastId });
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    setIsBackingUp(true);
    const toastId = toast.loading("Coletando dados do Firestore...");
    try {
      const backupData: Record<string, Record<string, unknown>> = {};
      for (const colName of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, colName));
        backupData[colName] = {};
        snapshot.forEach((docSnap: any) => {
          backupData[colName][docSnap.id] = docSnap.data();
        });
      }
      backupData['_metadata'] = {
        exportedAt: new Date().toISOString(),
        exportedBy: user.uid,
        version: '1.0'
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-jardim-california-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup concluído! ${Object.keys(backupData).length - 1} coleções exportadas.`, { id: toastId });
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Erro ao fazer backup.", { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsRestoring(true);
    const toastId = toast.loading("Restaurando dados...");
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Arquivo inválido: o backup deve ser um objeto JSON.');
      }

      for (const [colName, docs] of Object.entries(data)) {
        if (colName === '_metadata') continue;
        if (!COLLECTIONS.includes(colName)) {
          throw new Error(`Coleção desconhecida "${colName}" encontrada no arquivo.`);
        }
        if (!docs || typeof docs !== 'object' || Array.isArray(docs)) {
          throw new Error(`Coleção "${colName}" deve conter um objeto de documentos.`);
        }
        for (const [docId, docData] of Object.entries(docs as Record<string, unknown>)) {
          if (!docData || typeof docData !== 'object' || Array.isArray(docData)) {
            throw new Error(`Documento "${colName}/${docId}" inválido: o valor deve ser um objeto.`);
          }
          if (Object.keys(docData as Record<string, unknown>).length === 0) {
            throw new Error(`Documento "${colName}/${docId}" vazio: não é permitido restaurar documentos sem campos.`);
          }
        }
      }

      let totalDocs = 0;
      for (const [colName, docs] of Object.entries(data)) {
        if (colName === '_metadata') continue;
        if (!COLLECTIONS.includes(colName)) continue;
        for (const [docId, docData] of Object.entries(docs as Record<string, unknown>)) {
          await setDoc(doc(db, colName, docId), docData as Record<string, unknown>);
          totalDocs++;
        }
      }
      toast.success(`Restauração concluída! ${totalDocs} documentos restaurados.`, { id: toastId });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao restaurar backup.";
      console.error("Restore error:", error);
      toast.error(msg, { id: toastId });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Configurações</h1>
          <p className="text-[11px] text-[#94A3B8] font-bold">Gerencie as preferências globais do sistema.</p>
        </div>
        <Button onClick={handleSaveAll} className="h-9 bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20 px-5 gap-1.5 text-[10px]">
          <Save className="h-3.5 w-3.5" />
          Salvar Tudo
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">

        {/* Card: Congregação */}
        <Card className="border-[#1E293B] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#1E293B]/30 border-b border-[#1E293B]/50 p-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-[#0EA5E9]" />
              </div>
              <div>
                <CardTitle className="text-[11px] font-black text-white uppercase tracking-widest">Congregação</CardTitle>
                <p className="text-[9px] text-[#64748B] font-bold">Dados básicos</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase">Nome da Congregação</Label>
              <Input
                value={form.congregationName}
                onChange={(e) => updateField("congregationName", e.target.value)}
                className="h-9 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> Endereço
              </Label>
              <Input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Rua, número, bairro"
                className="h-9 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-lg text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase flex items-center gap-1">
                  <Hash className="h-2.5 w-2.5" /> Nº
                </Label>
                <Input
                  value={form.congregationNumber}
                  onChange={(e) => updateField("congregationNumber", e.target.value)}
                  placeholder="00000"
                  className="h-9 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase">Circuito</Label>
                <Input
                  value={form.circuit}
                  onChange={(e) => updateField("circuit", e.target.value)}
                  className="h-9 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-lg text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Reuniões */}
        <Card className="border-[#1E293B] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#1E293B]/30 border-b border-[#1E293B]/50 p-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-[11px] font-black text-white uppercase tracking-widest">Reuniões</CardTitle>
                <p className="text-[9px] text-[#64748B] font-bold">Dias e horários</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase">Meio de Semana</Label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.midweekDay}
                  onChange={(e) => updateField("midweekDay", parseInt(e.target.value))}
                  className="h-9 bg-[#1E293B]/50 border border-[#1E293B]/50 text-white rounded-lg px-2 text-[10px] font-bold focus:outline-none focus:border-[#0EA5E9]"
                >
                  {WEEKDAYS.map(day => (
                    <option key={day.value} value={day.value} className="bg-[#0F172A]">{day.label}</option>
                  ))}
                </select>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#64748B] pointer-events-none" />
                  <input
                    type="time"
                    value={form.midweekTime}
                    onChange={(e) => updateField("midweekTime", e.target.value)}
                    className="w-full h-9 bg-[#1E293B]/50 border border-[#1E293B]/50 text-white rounded-lg pl-7 pr-2 text-[10px] font-bold focus:outline-none focus:border-[#0EA5E9] [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase">Fim de Semana</Label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.weekendDay}
                  onChange={(e) => updateField("weekendDay", parseInt(e.target.value))}
                  className="h-9 bg-[#1E293B]/50 border border-[#1E293B]/50 text-white rounded-lg px-2 text-[10px] font-bold focus:outline-none focus:border-[#0EA5E9]"
                >
                  {WEEKDAYS.map(day => (
                    <option key={day.value} value={day.value} className="bg-[#0F172A]">{day.label}</option>
                  ))}
                </select>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#64748B] pointer-events-none" />
                  <input
                    type="time"
                    value={form.weekendTime}
                    onChange={(e) => updateField("weekendTime", e.target.value)}
                    className="w-full h-9 bg-[#1E293B]/50 border border-[#1E293B]/50 text-white rounded-lg pl-7 pr-2 text-[10px] font-bold focus:outline-none focus:border-[#0EA5E9] [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Superintendente de Circuito */}
        <Card className="border-[#1E293B] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#1E293B]/30 border-b border-[#1E293B]/50 p-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <UserCog className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-[11px] font-black text-white uppercase tracking-widest">Superintendente</CardTitle>
                <p className="text-[9px] text-[#64748B] font-bold">Contato</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase">Superintendente</Label>
              <Input
                value={form.circuitSuperintendent}
                onChange={(e) => updateField("circuitSuperintendent", e.target.value)}
                placeholder="Nome completo"
                className="h-9 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase">Esposa</Label>
              <Input
                value={form.circuitSuperintendentWife}
                onChange={(e) => updateField("circuitSuperintendentWife", e.target.value)}
                placeholder="Nome completo"
                className="h-9 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-[#64748B] tracking-widest uppercase flex items-center gap-1">
                <Phone className="h-2.5 w-2.5" /> Celular
              </Label>
              <Input
                value={form.circuitSuperintendentPhone}
                onChange={(e) => updateField("circuitSuperintendentPhone", e.target.value)}
                placeholder="(00) 00000-0000"
                className="h-9 bg-[#1E293B]/50 border-[#1E293B]/50 rounded-lg text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card: Base de Dados */}
        <Card className="border-[#1E293B] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#1E293B]/30 border-b border-[#1E293B]/50 p-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Database className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-[11px] font-black text-white uppercase tracking-widest">Base de Dados</CardTitle>
                <p className="text-[9px] text-[#64748B] font-bold">Manutenção</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <p className="text-[11px] text-[#94A3B8] font-medium">Sincronização ativa com Firebase Firestore.</p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleRestore}
              className="hidden"
            />
            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              variant="outline"
              className="w-full h-9 border-[#1E293B] text-[#94A3B8] font-bold rounded-lg gap-2 text-[10px] disabled:opacity-50"
            >
              {isBackingUp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {isBackingUp ? "Fazendo backup..." : "Backup"}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              variant="outline"
              className="w-full h-9 border-[#1E293B] text-[#94A3B8] font-bold rounded-lg gap-2 text-[10px] disabled:opacity-50"
            >
              {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {isRestoring ? "Restaurando..." : "Restaurar Backup"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
