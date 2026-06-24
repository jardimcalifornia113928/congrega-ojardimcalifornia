'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dashboard } from '@/components/dashboard';
import { PublishersView } from '@/components/publishers-view';
import { GroupsView } from '@/components/groups-view';
import { MidweekView } from '@/components/midweek-view';
import { WeekendView } from '@/components/weekend-view';
import { FieldReportView } from '@/components/field-report-view';
import { PrintsView } from '@/components/prints-view';
import { SettingsView } from '@/components/settings-view';
import { AttendanceView } from '@/components/attendance-view';
import { UsersView } from '@/components/users-view';

export default function Home() {
  const { user, loading, signIn } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showNavConfirm, setShowNavConfirm] = useState(false);
  const [fieldDirty, setFieldDirty] = useState(false);

  const handleNavigate = useCallback((tab: string) => {
    if (activeTab === 'field' && tab !== 'field' && fieldDirty) {
      setPendingTab(tab);
      setShowNavConfirm(true);
    } else {
      setActiveTab(tab);
    }
  }, [activeTab, fieldDirty]);

  const confirmNav = () => {
    if (pendingTab) setActiveTab(pendingTab);
    setPendingTab(null);
    setShowNavConfirm(false);
    setFieldDirty(false);
  };

  const cancelNav = () => {
    setPendingTab(null);
    setShowNavConfirm(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#050B14]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050B14] p-6">
        <div className="h-16 w-16 rounded-2xl bg-[#0EA5E9] flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-xl shadow-[#0EA5E9]/20">C</div>
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Congregação Jardim Califórnia</h1>
        <div className="flex flex-col items-center mb-8">
          <p className="text-[#94A3B8] text-sm font-medium">Publicadores · Reuniões · Relatórios</p>
        </div>
        <Button onClick={signIn} size="lg" className="bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90 h-12 px-8 gap-3 font-medium rounded-xl shadow-lg shadow-[#0EA5E9]/20 text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
          <LogIn className="h-5 w-5" />
          Entrar com Google
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050B14] overflow-hidden">
      <Sidebar activeTab={activeTab} onNavigate={handleNavigate} />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
          {activeTab === 'dashboard' && (
            <div className="flex-1 pr-3 overflow-auto">
              <Dashboard onNavigate={setActiveTab} />
            </div>
          )}
          {activeTab === 'publishers' && <PublishersView />}
          {activeTab === 'groups' && (
            <ScrollArea className="flex-1 pr-3">
              <GroupsView />
            </ScrollArea>
          )}
          {activeTab === 'midweek' && <MidweekView />}
          {activeTab === 'weekend' && (
            <ScrollArea className="flex-1 pr-3">
              <WeekendView />
            </ScrollArea>
          )}
          {activeTab === 'attendance' && (
            <ScrollArea className="flex-1 pr-3">
              <AttendanceView />
            </ScrollArea>
          )}
          {activeTab === 'field' && <FieldReportView onDirtyChange={setFieldDirty} />}
          {activeTab === 'prints' && (
            <div className="flex-1 pr-3 overflow-y-auto">
              <PrintsView />
            </div>
          )}
          {activeTab === 'settings' && (
            <ScrollArea className="flex-1 pr-3">
              <SettingsView />
            </ScrollArea>
          )}
          {activeTab === 'users' && (
            <ScrollArea className="flex-1 pr-3">
              <UsersView />
            </ScrollArea>
          )}
        </div>
      </main>

      {/* Confirmação de navegação com alterações não salvas */}
      {showNavConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-black text-white mb-2">Alterações não salvas</h3>
            <p className="text-[11px] text-[#94A3B8] font-medium mb-5">
              Você tem alterações não salvas no relatório de campo. Deseja sair sem salvar?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelNav}
                variant="outline"
                className="border-[#1E293B] text-[#94A3B8] font-bold h-10 rounded-lg px-5 text-[11px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmNav}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 rounded-lg px-5 text-[11px]"
              >
                Sair sem salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
