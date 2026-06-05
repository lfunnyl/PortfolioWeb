/**
 * AuthContext — Firebase Authentication ile kullanıcı oturumu yönetimi.
 *
 * Desteklenen işlemler:
 *  - E-posta/şifre ile kayıt + otomatik doğrulama e-postası
 *  - E-posta/şifre ile giriş
 *  - Çıkış
 *  - Şifre sıfırlama e-postası
 *
 * Firebase, JWT token yönetimini, bcrypt hash'lemeyi, şifre sıfırlamayı
 * ve e-posta doğrulamayı otomatik üstlenir — backend kodu gerekmez.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user:             FirebaseUser | null;
  isAuthenticated:  boolean;
  isLoading:        boolean;
  login:            (email: string, password: string) => Promise<void>;
  register:         (email: string, password: string) => Promise<void>;
  logout:           () => Promise<void>;
  sendPasswordReset:(email: string) => Promise<void>;
  /** Eski hook uyumu için — Firebase token'ı döner, kullanım önerilmez */
  token:            string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,      setUser]      = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token,     setToken]     = useState<string | null>(null);

  // Firebase oturum durumu değişikliklerini dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // useCloudSync ile uyum için token'ı sakla (doğrudan Firestore kullandığı için artık gerekmiyor)
        const t = await firebaseUser.getIdToken();
        setToken(t);
      } else {
        setToken(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  /** E-posta + şifre ile giriş */
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  /** Yeni kullanıcı kaydı + doğrulama e-postası gönder */
  const register = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Firebase doğrulama e-postasını otomatik gönder
    await sendEmailVerification(credential.user);
  };

  /** Çıkış yap */
  const logout = async () => {
    await signOut(auth);
  };

  /** Şifre sıfırlama e-postası gönder */
  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        sendPasswordReset,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
