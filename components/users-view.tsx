'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Users, Check, X, Loader2, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export interface UserPermissions {
  cadastrar: boolean;
  limpar: boolean;
  excluir: boolean;
  backup: boolean;
  imprimir: boolean;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  permissions: Record<string, UserPermissions>;
  createdAt: string;
}

const SCREENS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'publishers', label: 'Publicadores' },
  { id: 'groups', label: 'Famílias' },
  { id: 'midweek', label: 'Meio Semana' },
  { id: 'weekend', label: 'Fim Semana' },
  { id: 'attendance', label: 'Assistência' },
  { id: 'field', label: 'Rel. Campo' },
  { id: 'prints', label: 'Impressões' },
  { id: 'settings', label: 'Configuração' },
  { id: 'users', label: 'Usuários' },
];

const PERMISSIONS: { id: keyof UserPermissions; label: string }[] = [
  { id: 'cadastrar', label: 'C' },
  { id: 'limpar', label: 'L' },
  { id: 'excluir', label: 'E' },
  { id: 'backup', label: 'B' },
  { id: 'imprimir', label: 'I' },
];

const defaultPermissions: UserPermissions = {
  cadastrar: false,
  limpar: false,
  excluir: false,
  backup: false,
  imprimir: false,
};

function buildDefaultPermissions(): Record<string, UserPermissions> {
  const perms: Record<string, UserPermissions> = {};
  SCREENS.forEach(s => { perms[s.id] = { ...defaultPermissions }; });
  return perms;
}

export function UsersView() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = user?.email?.toLowerCase().includes('jardimcalifornia');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserData[] = [];
      snapshot.forEach(doc => {
        list.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      list.sort((a, b) => {
        if (a.role === 'admin') return -1;
        if (b.role === 'admin') return 1;
        return a.displayName?.localeCompare(b.displayName || '') || 0;
      });
      setUsers(list);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const togglePermission = async (targetUser: UserData, screenId: string, permId: keyof UserPermissions) => {
    if (!isAdmin || targetUser.role === 'admin') return;
    setSavingUserId(targetUser.uid);
    try {
      const currentPerms = targetUser.permissions?.[screenId] || { ...defaultPermissions };
      const updatedPerms = {
        ...targetUser.permissions,
        [screenId]: {
          ...currentPerms,
          [permId]: !currentPerms[permId],
        },
      };
      const docRef = doc(db, 'users', targetUser.uid);
      await setDoc(docRef, { permissions: updatedPerms }, { merge: true });
      toast.success(`Permissão atualizada para ${targetUser.displayName || targetUser.email}`);
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Erro ao atualizar permissão.");
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (u.role === 'admin') return true;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#050B14]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Usuários</h1>
          <p className="text-[11px] text-[#94A3B8] font-bold">Gerencie permissões de acesso por tela</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário..."
            className="h-9 w-52 bg-[#1E293B]/50 border border-[#1E293B]/50 text-white rounded-lg pl-9 pr-3 text-[11px] font-medium focus:outline-none focus:border-[#0EA5E9]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-2 scrollbar-thin">
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl overflow-hidden min-w-[900px]">
          {/* Header da tabela */}
          <div className="flex border-b border-[#1E293B]/60">
            <div className="w-44 shrink-0 p-3 bg-[#1E293B]/20">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Usuário</span>
            </div>
            {SCREENS.map(screen => (
              <div key={screen.id} className="flex-1 min-w-[140px] border-l border-[#1E293B]/40 p-3 bg-[#1E293B]/20 text-center">
                <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">{screen.label}</span>
              </div>
            ))}
          </div>

          {/* Sub-header: permissões */}
          <div className="flex border-b border-[#1E293B]/40">
            <div className="w-44 shrink-0 p-1.5" />
            {SCREENS.map(screen => (
              <div key={screen.id} className="flex-1 min-w-[140px] border-l border-[#1E293B]/40 flex justify-center gap-0.5 py-1">
                {PERMISSIONS.map(perm => (
                  <span
                    key={perm.id}
                    title={perm.id === 'cadastrar' ? 'Cadastrar' : perm.id === 'limpar' ? 'Limpar' : perm.id === 'excluir' ? 'Excluir' : perm.id === 'backup' ? 'Backup' : 'Imprimir'}
                    className="text-[8px] font-black text-[#64748B] uppercase w-5 text-center"
                  >
                    {perm.label}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* Linhas de usuários */}
          {filteredUsers.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Users className="h-10 w-10 text-[#64748B] mx-auto mb-3 opacity-40" />
                <p className="text-[13px] text-[#64748B] font-medium">Nenhum usuário encontrado</p>
                <p className="text-[11px] text-[#64748B]/60 mt-1">Os usuários aparecerão aqui ao fazer login com Google.</p>
              </div>
            </div>
          )}

          {filteredUsers.map(u => (
            <div key={u.uid} className={`flex border-b border-[#1E293B]/30 last:border-b-0 hover:bg-[#1E293B]/5 transition-colors ${savingUserId === u.uid ? 'opacity-60' : ''}`}>
              <div className="w-44 shrink-0 p-3 flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-[#1E293B]/50 text-[#94A3B8]'}`}>
                  {u.displayName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white truncate flex items-center gap-1">
                    {u.displayName || 'Sem nome'}
                    {u.role === 'admin' && (
                      <Shield className="h-3 w-3 text-amber-400 shrink-0" />
                    )}
                  </p>
                  <p className="text-[9px] text-[#64748B] font-medium truncate">{u.email}</p>
                </div>
              </div>
              {SCREENS.map(screen => {
                const perms = u.permissions?.[screen.id] || defaultPermissions;
                return (
                  <div key={screen.id} className="flex-1 min-w-[140px] border-l border-[#1E293B]/40 flex items-center justify-center gap-0.5 py-2">
                    {u.role === 'admin' ? (
                      <span className="text-[9px] text-amber-400/70 font-bold italic">Admin</span>
                    ) : savingUserId === u.uid ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0EA5E9]" />
                    ) : (
                      PERMISSIONS.map(perm => (
                        <button
                          key={perm.id}
                          onClick={() => togglePermission(u, screen.id, perm.id)}
                          disabled={!isAdmin || !u.email}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                            perms[perm.id]
                              ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]'
                              : 'bg-[#1E293B]/30 text-[#475569] hover:bg-[#1E293B]/60'
                          } ${isAdmin && u.email ? 'cursor-pointer' : 'cursor-default'}`}
                          title={`${perm.id === 'cadastrar' ? 'Cadastrar' : perm.id === 'limpar' ? 'Limpar' : perm.id === 'excluir' ? 'Excluir' : perm.id === 'backup' ? 'Backup' : 'Imprimir'} - ${screen.label}`}
                        >
                          {perms[perm.id] ? (
                            <Check className="h-2.5 w-2.5" />
                          ) : (
                            <X className="h-2.5 w-2.5" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
