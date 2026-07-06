'use client';

import React from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  UsersRound,
  LayoutDashboard,
  Printer,
  Shield,
  Briefcase,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export function Sidebar({ activeTab, onNavigate }: SidebarProps) {
  const { logout, user } = useAuth();
  
  const groups = [
    { title: 'VISÃO GERAL', items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { title: 'PESSOAS', items: [
      { id: 'publishers', label: 'Publicadores', icon: Users },
      { id: 'groups', label: 'Grupo de Campo', icon: UsersRound },
    ]},
    { title: 'REUNIÕES', items: [
      { id: 'midweek', label: 'Meio de semana', icon: Calendar },
      { id: 'weekend', label: 'Fim de semana', icon: Calendar },
      { id: 'attendance', label: 'Assistência', icon: BarChart3 },
    ]},
    { title: 'RELATÓRIOS', items: [
      { id: 'field', label: 'Relatório de campo', icon: FileText },
      { id: 'service', label: 'Serviço de Campo', icon: Briefcase },
      { id: 'public_witness', label: 'Testemunho Público', icon: ClipboardList },
      { id: 'prints', label: 'Impressões', icon: Printer },
      { id: 'cleaning', label: 'Limpeza', icon: Calendar },
    ]},
    { title: 'CONFIGURAÇÃO', items: [
      { id: 'settings', label: 'Congregação', icon: Settings },
      { id: 'users', label: 'Usuários', icon: Shield },
    ]},
  ];

  return (
    <aside className="w-64 bg-[#08111F] border-r border-[#1E293B] flex flex-col h-full flex-shrink-0">
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#0EA5E9] flex items-center justify-center text-white font-bold text-base shadow-lg shadow-[#0EA5E9]/20">C</div>
          <div>
            <p className="text-sm font-semibold text-white tracking-tight">Congregação</p>
            <p className="text-[11px] font-medium text-[#94A3B8] tracking-wide">Jardim Califórnia</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[0.12em] opacity-60">{group.title}</h3>
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                  activeTab === item.id 
                    ? "bg-[#0EA5E9]/10 text-[#0EA5E9] shadow-sm" 
                    : "text-[#94A3B8] hover:bg-[#1E293B]/50 hover:text-[#F1F5F9]"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  activeTab === item.id ? "text-[#0EA5E9]" : "text-[#64748B]"
                )} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 mt-auto border-t border-[#1E293B] space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0F172A] border border-[#1E293B]">
            <Avatar className="h-8 w-8 border border-[#1E293B] flex-shrink-0">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Usuário'} />
              <AvatarFallback className="bg-[#0EA5E9]/10 text-[#0EA5E9] text-xs font-semibold">
                {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#F1F5F9] truncate">{user.displayName}</p>
              <p className="text-[10px] font-medium text-[#0EA5E9] truncate uppercase tracking-wide">Administrador</p>
            </div>
          </div>
        )}
        <button 
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#64748B] hover:bg-red-500/10 hover:text-red-400 transition-all group"
        >
          <LogOut className="h-4 w-4 group-hover:rotate-12 transition-transform flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
