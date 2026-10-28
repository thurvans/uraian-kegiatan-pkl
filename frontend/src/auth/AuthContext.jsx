import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken } from '../api.js';

const AuthContext = createContext(null);

function AppLoading() {
  return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center"><div className="relative mx-auto mb-4 h-12 w-12"><div className="absolute inset-0 rounded-2xl bg-blue-100"/><div className="absolute inset-2 animate-spin rounded-full border-2 border-blue-200 border-t-navy-900"/></div><p className="text-sm font-medium text-slate-600">Menyiapkan ruang kerja…</p></div></div>;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const refreshed = await api('/auth/refresh', { method: 'POST' }, false);
        setToken(refreshed.data.accessToken);
        const me = await api('/auth/me');
        if (active) setUser(me.data);
      } catch {
        setToken(null);
      } finally {
        if (active) setReady(true);
      }
    }
    restoreSession();
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    login: async credentials => {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, false);
      setToken(result.data.accessToken);
      setUser(result.data.user);
      return result.data.user;
    },
    logout: async () => {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      setToken(null);
      setUser(null);
    },
    updateUser: updates => setUser(current => current ? { ...current, ...updates } : current)
  }), [user]);

  return <AuthContext.Provider value={value}>{ready ? children : <AppLoading />}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return context;
}
