'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const defaultPermissions = { leitura: false, inclusao: false, deletar: false, impressao: false, admin: false };
const masterPermissions = { leitura: true, inclusao: true, deletar: true, impressao: true, admin: true };

const isMasterEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const e = email.toLowerCase();
  return e.includes('jardimcalifornia') || e === 'mariomarciofranco@gmail.com';
};

interface AuthContextType {
  user: any;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      if (currentUser) {
        registerUser(currentUser);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const err = error as any;
      const code = err?.code || '';
      let msg = 'Erro ao fazer login. Tente novamente.';
      if (code === 'auth/popup-blocked') msg = 'Popup bloqueado pelo navegador. Permita popups e tente novamente.';
      else if (code === 'auth/unauthorized-domain') msg = 'Este domínio não está autorizado no Firebase. Adicione localhost em Authentication > Settings.';
      else if (code === 'auth/operation-not-allowed') msg = 'Login com Google não está habilitado no Firebase Console.';
      else if (code === 'auth/popup-closed-by-user') msg = 'Popup fechado antes do login ser concluído.';
      else if (code === 'auth/cancelled-popup-request') msg = 'Outra solicitação de login já está em andamento.';
      toast.error(msg, { duration: 6000 });
      console.error("Error signing in:", error);
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
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
