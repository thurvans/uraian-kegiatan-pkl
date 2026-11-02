import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  clearSession,
  getStoredSession,
  refreshAccessToken,
  saveSession
} from '../api.js';

const AuthContext = createContext(null);

function AppLoading() {
  return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center"><div className="relative mx-auto mb-4 h-12 w-12"><div className="absolute inset-0 rounded-2xl bg-blue-100"/><div className="absolute inset-2 animate-spin rounded-full border-2 border-blue-200 border-t-navy-900"/></div><p className="text-sm font-medium text-slate-600">Menyiapkan ruang kerja…</p></div></div>;
}

export function AuthProvider({ children }) {
  const initialSession = getStoredSession();
  const hasSavedUser = Boolean(initialSession?.user);

  const [user, setUser] = useState(() => (hasSavedUser ? initialSession.user : null));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      // Access tokens live only in memory. Reloads restore the session via HttpOnly cookie.
      try {
        const result = await refreshAccessToken();
        if (active && result?.user) {
          setUser(result.user);
        }
      } catch (err) {
        if (active && (err?.status === 401 || err?.status === 403)) {
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
      const { accessToken, user: userData } = result.data;
      saveSession({ accessToken, user: userData });
      setUser(userData);
      return userData;
    },
    logout: async () => {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
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
