import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));

  useEffect(() => {
    const savedEmail = localStorage.getItem('auth_email');
    if (token && savedEmail) {
      setUser({ email: savedEmail });
    }
  }, [token]);

  const login = (newToken: string, email: string) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_email', email);
    setToken(newToken);
    setUser({ email });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
