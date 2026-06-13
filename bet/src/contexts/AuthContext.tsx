import React, { createContext, useContext, useState, useEffect } from 'react';

interface Usuario {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  accessToken: string | null;
  csrfToken: string | null;
  user: Usuario | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [csrfToken, setCsrfToken] = useState<string | null>(localStorage.getItem('csrfToken'));
  const [user, setUser] = useState<Usuario | null>(null);

  const atualizarTokens = (newAccessToken: string, newCsrfToken: string) => {
    setAccessToken(newAccessToken);
    setCsrfToken(newCsrfToken);
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('csrfToken', newCsrfToken);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!accessToken || !csrfToken) {
      throw new Error('Usuário não autenticado');
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
      'Authorization': `Bearer ${accessToken}`,
      'X-CSRF-Token': csrfToken, // agora csrfToken é string garantida (não nulo)
      'Content-Type': 'application/json',
    };

    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    const newCsrf = response.headers.get('X-New-CSRF-Token');
    if (newCsrf && accessToken) {
      setCsrfToken(newCsrf);
      localStorage.setItem('csrfToken', newCsrf);
    }

    if (response.status === 401) {
      const refreshOk = await attemptRefresh();
      if (refreshOk) {
        const newHeaders: Record<string, string> = {
          ...(options.headers as Record<string, string> || {}),
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-CSRF-Token': localStorage.getItem('csrfToken')!,
          'Content-Type': 'application/json',
        };
        response = await fetch(url, { ...options, headers: newHeaders, credentials: 'include' });
      } else {
        await logout();
        throw new Error('Sessão expirada, faça login novamente');
      }
    }

    return response;
  };

  const attemptRefresh = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      atualizarTokens(data.accessToken, data.csrfToken);
      return true;
    } catch {
      return false;
    }
  };

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, senha: password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro no login');
    atualizarTokens(data.accessToken, data.csrfToken);
    setUser(data.usuario);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setAccessToken(null);
    setCsrfToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('csrfToken');
  };

  useEffect(() => {
    if (accessToken && csrfToken) {
      fetchWithAuth('/api/auth/perfil')
        .then(res => res.json())
        .then(data => setUser(data))
        .catch(() => logout());
    }
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, csrfToken, user, login, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
