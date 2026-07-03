'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Users, Check, X, Loader2, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface UserPermissions {
  leitura: boolean;
  inclusao: boolean;
  deletar: boolean;
  impressao: boolean;
  admin: boolean;
}

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  permissions: UserPermissions;
  createdAt: string;
}

const PERMISSION_COLUMNS: { id: keyof UserPermissions; label: string; tooltip: string }[] = [
  { id: 'leitura', label: 'Leitura', tooltip: 'Visualizar dados' },
  { id: 'inclusao', label: 'Inclusão', tooltip: 'Adicionar novos registros' },
  { id: 'deletar', label: 'Deletar', tooltip: 'Excluir registros' },
  { id: 'impressao', label: 'Impressão', tooltip: 'Imprimir relatórios' },
  { id: 'admin', label: 'Admin', tooltip: 'Acesso total ao sistema' },
];

const MASTER_EMAILS = ['mariomarciofranco@gmail.com'];

const isMasterEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return MASTER_EMAILS.includes(email.toLowerCase());
};

const defaultPermissions: UserPermissions = {
  leitura: false,
  inclusao: false,
  deletar: false,
  impressao: false,
  admin: false,
};

export function UsersView() {
  const { user: authUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot: any) => {
      const list: UserData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const perms = { ...defaultPermissions, ...(data.permissions || {}) };
        list.push({ uid: doc.id, ...data, permissions: perms } as UserData);
      });
      list.sort((a, b) => {
        if (isMasterEmail(a.email)) return -1;
        if (isMasterEmail(b.email)) return 1;
        return a.displayName?.localeCompare(b.displayName || '') || 0;
      });
      setUsers(list);
      setIsLoading(false);
    }, (error: unknown) => {
      console.error("Error fetching users:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const togglePermission = async (targetUser: UserData, permId: keyof UserPermissions) => {
    if (!isAdmin || isMasterEmail(targetUser.email)) return;
    setSavingUserId(targetUser.uid);
    try {
      const updatedPerms = {
        ...targetUser.permissions,
        [permId]: !targetUser.permissions[permId],
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
    if (!search) return true;
    const q = search.toLowerCase();
    return u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  if (!isAdmin) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#050B14]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-[#64748B] mx-auto mb-3 opacity-40" />
          <p className="text-[15px] text-[#94A3B8] font-bold">Acesso restrito</p>
          <p className="text-[12px] text-[#64748B] mt-1">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </div>
    );
  }

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
          <p className="text-[11px] text-[#94A3B8] font-bold">Gerencie permissões de acesso ao sistema</p>
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
        <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#1E293B]/60">
            <div className="w-72 shrink-0 p-3 bg-[#1E293B]/20">
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Usuário</span>
            </div>
            {PERMISSION_COLUMNS.map(col => (
              <div key={col.id} className="flex-1 min-w-[90px] border-l border-[#1E293B]/40 p-3 bg-[#1E293B]/20 text-center">
                <span className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">{col.label}</span>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Users className="h-10 w-10 text-[#64748B] mx-auto mb-3 opacity-40" />
                <p className="text-[13px] text-[#64748B] font-medium">Nenhum usuário encontrado</p>
              </div>
            </div>
          )}

          {filteredUsers.map(u => {
            const isMaster = isMasterEmail(u.email);
            return (
              <div key={u.uid} className={`flex border-b border-[#1E293B]/30 last:border-b-0 hover:bg-[#1E293B]/5 transition-colors ${savingUserId === u.uid ? 'opacity-60' : ''}`}>
                <div className="w-72 shrink-0 p-3 flex items-center gap-2.5">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isMaster ? 'bg-amber-500/20 text-amber-400' : 'bg-[#1E293B]/50 text-[#94A3B8]'}`}>
                    {u.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white truncate flex items-center gap-1">
                      {u.displayName || 'Sem nome'}
                      {isMaster && <Shield className="h-3 w-3 text-amber-400 shrink-0" />}
                    </p>
                    <p className="text-[9px] text-[#64748B] font-medium truncate">{u.email}</p>
                  </div>
                </div>
                {PERMISSION_COLUMNS.map(col => {
                  const checked = isMaster ? true : u.permissions[col.id];
                  const disabled = isMaster || savingUserId === u.uid || !isAdmin;
                  return (
                    <div key={col.id} className="flex-1 min-w-[90px] border-l border-[#1E293B]/40 flex items-center justify-center py-2">
                      {savingUserId === u.uid ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0EA5E9]" />
                      ) : (
                        <button
                          onClick={() => togglePermission(u, col.id)}
                          disabled={disabled}
                          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                            checked
                              ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]'
                              : 'bg-[#1E293B]/30 text-[#475569] hover:bg-[#1E293B]/60'
                          } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                          title={PERMISSION_COLUMNS.find(c => c.id === col.id)?.tooltip}
                        >
                          {checked ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
