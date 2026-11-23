'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

const defaultPermissions = { leitura: false, inclusao: false, deletar: false, impressao: false, admin: false };
const masterPermissions = { leitura: true, inclusao: true, deletar: true, impressao: true, admin: true };

const ADMIN_EMAILS = ['mariomarciofranco@gmail.com', 'jardimcalifornia@gmail.com'];

const isMasterEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const e = email.toLowerCase();
  return ADMIN_EMAILS.includes(e);
};

const describeAuthError = (error: unknown): string => {
  const code = (error as any)?.code || 'sem-codigo';
  if (code === 'auth/unauthorized-domain') return 'Este domínio não está autorizado no Firebase. Adicione localhost em Authentication > Settings.';
  if (code === 'auth/operation-not-allowed') return 'Login com Google não está habilitado no Firebase Console.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Login cancelado antes de concluir.';
  if (code === 'auth/network-request-failed') return 'Falha de rede ao falar com o Google. Verifique a conexão.';
  return `Erro ao fazer login (${code}).`;
};

// Uma única chamada de getRedirectResult por carregamento de página.
// Em dev o React StrictMode monta o efeito duas vezes e a segunda chamada
// pode consumir/anular o resultado do redirect, deixando o usuário deslogado.
let redirectResultPromise: Promise<unknown> | null = null;
const consumeRedirectResult = (): Promise<unknown> =>
  (redirectResultPromise ??= getRedirectResult(auth));

interface AuthContextType {
  user: any;
  userDoc: any;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDoc: null,
  isAdmin: false,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const registerUser = async (currentUser: any) => {
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const isMaster = isMasterEmail(currentUser.email);
        await setDoc(docRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Usuário',
          photoURL: currentUser.photoURL || '',
          role: isMaster ? 'admin' : 'user',
          permissions: isMaster ? { ...masterPermissions } : { ...defaultPermissions },
          createdAt: new Date().toISOString(),
        });
      } else {
        const data = docSnap.data();
        if (data.displayName !== currentUser.displayName || data.photoURL !== currentUser.photoURL) {
          await setDoc(docRef, {
            displayName: currentUser.displayName || 'Usuário',
            photoURL: currentUser.photoURL || '',
            lastAccess: new Date().toISOString(),
          }, { merge: true });
        }
      }
    } catch (error) {
      console.error("Error registering user:", error);
    }
  };

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      if (currentUser) {
        registerUser(currentUser);
      }
      if (active) setLoading(false);
    }, () => {
      if (active) setLoading(false);
    });

    // Diagnóstico: o handler do Firebase devolve o motivo da falha na URL
    const params = new URLSearchParams(window.location.search);
    const handlerError = params.get('authError') || params.get('error');
    if (handlerError) {
      console.error('Firebase auth handler error:', handlerError, window.location.href);
      toast.error(`Falha do Firebase: ${handlerError}`, { duration: 15000 });
    }

    // Conclui o fluxo de login por redirect (volta do Google).
    // Mantém o spinner até o resultado chegar para não piscar a tela de login.
    consumeRedirectResult()
      .catch((error) => {
        console.error('Error completing redirect sign-in:', error);
        toast.error(describeAuthError(error), { duration: 8000 });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const timeout = setTimeout(() => {
      if (active) setLoading(false);
    }, 5000);

    return () => {
      active = false;
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Observa o documento do usuário no Firestore para obter role
  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setUserDoc({ id: snap.id, ...snap.data() });
      } else {
        setUserDoc(null);
      }
    });
    return () => unsub();
  }, [user]);

  // `permissions.admin` é o campo gravado pela tela de usuários; `role` é o
  // campo legado/master. Qualquer um dos dois habilita o acesso de admin.
  const isAdmin =
    userDoc?.role === 'admin' ||
    userDoc?.permissions?.admin === true ||
    isMasterEmail(user?.email);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Mesmo fluxo de produção (popup): é o que funciona no navegador do usuário
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as any)?.code || '';
      console.error('Error signing in:', error);
      // Navegador embutido/popup bloqueado: cai para redirect na mesma aba
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error('Error signing in (redirect):', redirectError);
          toast.error(describeAuthError(redirectError), { duration: 8000 });
          return;
        }
      }
      toast.error(describeAuthError(error), { duration: 8000 });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, isAdmin, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
