'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/auth-provider';
import { LogIn, Loader2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

const Dashboard = dynamic(() => import('@/components/dashboard').then(m => ({ default: m.Dashboard })), { ssr: false });
const PublishersView = dynamic(() => import('@/components/publishers-view').then(m => ({ default: m.PublishersView })), { ssr: false });
const GroupsView = dynamic(() => import('@/components/groups-view').then(m => ({ default: m.GroupsView })), { ssr: false });
const MidweekView = dynamic(() => import('@/components/midweek-view').then(m => ({ default: m.MidweekView })), { ssr: false });
const WeekendView = dynamic(() => import('@/components/weekend-view').then(m => ({ default: m.WeekendView })), { ssr: false });
const FieldReportView = dynamic(() => import('@/components/field-report-view').then(m => ({ default: m.FieldReportView })), { ssr: false });
const ServiceView = dynamic(() => import('@/components/service-view').then(m => ({ default: m.ServiceView })), { ssr: false });
const PrintsView = dynamic(() => import('@/components/prints-view').then(m => ({ default: m.PrintsView })), { ssr: false });
const SettingsView = dynamic(() => import('@/components/settings-view').then(m => ({ default: m.SettingsView })), { ssr: false });
const AttendanceView = dynamic(() => import('@/components/attendance-view').then(m => ({ default: m.AttendanceView })), { ssr: false });
const UsersView = dynamic(() => import('@/components/users-view').then(m => ({ default: m.UsersView })), { ssr: false });
const PublicWitnessView = dynamic(() => import('@/components/public-witness-view').then(m => ({ default: m.PublicWitnessView })), { ssr: false });
const CleaningView = dynamic(() => import('@/components/cleaning-view').then(m => ({ default: m.CleaningView })), { ssr: false });

export default function Home() {
  const { user, loading, signIn } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showNavConfirm, setShowNavConfirm] = useState(false);
  const [fieldDirty, setFieldDirty] = useState(false);

  const handleNavigate = useCallback((tab: string) => {
    setMobileMenuOpen(false);
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
      <Sidebar activeTab={activeTab} onNavigate={handleNavigate} isMobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="sticky top-0 z-30 lg:hidden flex items-center gap-2 px-4 py-3 border-b border-[#1E293B] bg-[#050B14]">
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="h-9 w-9 rounded-lg bg-[#1E293B] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#0EA5E9] flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="text-sm font-semibold text-white">Jardim Califórnia</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
          {activeTab === 'dashboard' && (
            <div className="flex-1 pr-3 overflow-auto">
              <Dashboard onNavigate={setActiveTab} />
            </div>
          )}
          {activeTab === 'publishers' && (
            <ScrollArea className="flex-1 pr-3">
              <PublishersView />
            </ScrollArea>
          )}
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
          {activeTab === 'service' && <ServiceView onDirtyChange={setFieldDirty} />}
          {activeTab === 'public_witness' && <PublicWitnessView />}
          {activeTab === 'cleaning' && <CleaningView />}
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
