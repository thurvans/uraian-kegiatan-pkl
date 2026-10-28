import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  clearSession,
  getStoredSession,
  isTokenValid,
  refreshAccessToken,
  saveSession,
  setToken
} from '../api.js';

const AuthContext = createContext(null);

function AppLoading() {
  return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center"><div className="relative mx-auto mb-4 h-12 w-12"><div className="absolute inset-0 rounded-2xl bg-blue-100"/><div className="absolute inset-2 animate-spin rounded-full border-2 border-blue-200 border-t-navy-900"/></div><p className="text-sm font-medium text-slate-600">Menyiapkan ruang kerja…</p></div></div>;
}

export function AuthProvider({ children }) {
  const initialSession = getStoredSession();
  const hasValidToken = Boolean(initialSession?.accessToken && isTokenValid(initialSession.accessToken));

  const [user, setUser] = useState(() => (hasValidToken ? initialSession.user : null));
  const [ready, setReady] = useState(() => hasValidToken);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const stored = getStoredSession();

      // Kasus 1: Access token masih valid (masa berlaku 30 menit)
      if (stored?.accessToken && isTokenValid(stored.accessToken)) {
        setToken(stored.accessToken);
        if (active) {
          if (stored.user) setUser(stored.user);
          setReady(true);
        }
        try {
          const me = await api('/auth/me');
          if (active && me?.data) {
            setUser(me.data);
            saveSession({ user: me.data });
          }
        } catch (err) {
          if (err?.status === 401 && active) {
            clearSession();
            setUser(null);
          }
        }
        return;
      }

      // Kasus 2: Access token kedaluwarsa atau belum ada, pulihkan via refresh token
      try {
        const result = await refreshAccessToken();
        if (active && result?.user) {
          setUser(result.user);
        }
      } catch {
        if (active) {
          clearSession();
          setUser(null);
        }
      } finally {
        if (active) setReady(true);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    login: async credentials => {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, false);
      const { accessToken, user: userData, refreshToken } = result.data;
      saveSession({ accessToken, user: userData, refreshToken });
      setUser(userData);
      return userData;
    },
    logout: async () => {
      const stored = getStoredSession();
      await api('/auth/logout', {
        method: 'POST',
        body: stored?.refreshToken ? JSON.stringify({ refreshToken: stored.refreshToken }) : undefined
      }).catch(() => {});
      clearSession();
      setUser(null);
    },
    updateUser: updates => {
      setUser(current => {
        if (!current) return current;
        const updated = { ...current, ...updates };
        saveSession({ user: updated });
        return updated;
      });
    }
  }), [user]);

  return <AuthContext.Provider value={value}>{ready ? children : <AppLoading />}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return context;
}
