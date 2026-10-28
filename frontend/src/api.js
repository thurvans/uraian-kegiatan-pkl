const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_CACHE_TTL_MS = 30_000;

const AUTH_STORAGE_KEY = 'uraian_pkl_auth';

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenValid(token, bufferSeconds = 15) {
  if (!token || typeof token !== 'string') return false;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 > Date.now() + bufferSeconds * 1000;
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession({ accessToken: newAccessToken, user, refreshToken }) {
  try {
    const current = getStoredSession() || {};
    const session = {
      accessToken: newAccessToken || current.accessToken || null,
      refreshToken: refreshToken !== undefined ? refreshToken : current.refreshToken || null,
      user: user || current.user || null
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    if (newAccessToken) setToken(newAccessToken);
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // abaikan jika localStorage dibatasi browser
  }
  setToken(null);
}

const initialSession = getStoredSession();
let accessToken = (initialSession?.accessToken && isTokenValid(initialSession.accessToken))
  ? initialSession.accessToken
  : null;
let refreshRequest = null;
let cacheGeneration = 0;
const responseCache = new Map();
const pendingRequests = new Map();

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function setToken(token) {
  const nextToken = token || null;
  if (accessToken !== nextToken) clearApiCache();
  accessToken = nextToken;
}

/**
 * Clears cached API reads. Cache entries are deliberately kept in memory only,
 * so authenticated responses never persist across a reload or browser session.
 */
export function clearApiCache() {
  cacheGeneration += 1;
  responseCache.clear();
  pendingRequests.clear();
}

function createSignal(signal, timeoutMs) {
  if (signal || !timeoutMs) return { signal, dispose: () => {} };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, dispose: () => window.clearTimeout(timer) };
}

async function parsePayload(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

export async function refreshAccessToken() {
  if (!refreshRequest) {
    const stored = getStoredSession();
    const headers = {};
    let body;
    if (stored?.refreshToken) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ refreshToken: stored.refreshToken });
    }

    refreshRequest = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body
    })
      .then(async response => {
        const payload = await parsePayload(response);
        if (!response.ok) {
          clearSession();
          throw new ApiError(payload?.message || 'Sesi telah berakhir.', { status: response.status });
        }
        saveSession({
          accessToken: payload.data.accessToken,
          refreshToken: payload.data.refreshToken,
          user: payload.data.user
        });
        return payload.data;
      })
      .catch(error => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export async function api(path, options = {}, retry = true) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    cacheTtl = DEFAULT_CACHE_TTL_MS,
    skipCache = false,
    signal: providedSignal,
    ...fetchOptions
  } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const canCache = method === 'GET' && !skipCache && !providedSignal && cacheTtl > 0;
  const cacheKey = canCache ? `${method}:${path}` : null;

  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.payload;
    if (cached) responseCache.delete(cacheKey);
    const pending = pendingRequests.get(cacheKey);
    if (pending) return pending;
  }

  const generationAtStart = cacheGeneration;
  const request = executeRequest();
  if (cacheKey) pendingRequests.set(cacheKey, request);

  try {
    const payload = await request;
    if (cacheKey && generationAtStart === cacheGeneration) {
      responseCache.set(cacheKey, { payload, expiresAt: Date.now() + cacheTtl });
    } else if (method !== 'GET') {
      clearApiCache();
    }
    return payload;
  } finally {
    if (cacheKey && pendingRequests.get(cacheKey) === request) pendingRequests.delete(cacheKey);
  }

  async function executeRequest() {
    const headers = new Headers(fetchOptions.headers);
    if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    const requestSignal = createSignal(providedSignal, timeout);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
        signal: requestSignal.signal,
        credentials: 'include'
      });
      if (response.status === 401 && retry && !['/auth/refresh', '/auth/login'].includes(path)) {
        await refreshAccessToken();
        return api(path, { ...options, skipCache: true }, false);
      }
      const payload = await parsePayload(response);
      if (!response.ok) {
        throw new ApiError(payload?.message || 'Permintaan gagal.', {
          status: response.status,
          code: payload?.code,
          details: payload?.errors
        });
      }
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new ApiError('Permintaan melewati batas waktu. Silakan coba lagi.', { code: 'REQUEST_TIMEOUT' });
      if (error instanceof ApiError) throw error;
      throw new ApiError('Tidak dapat terhubung ke server.', { code: 'NETWORK_ERROR', details: error });
    } finally {
      requestSignal.dispose();
    }
  }
}

function getDownloadName(response, fallbackName) {
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  try { return decodeURIComponent(encoded || plain || fallbackName); } catch { return fallbackName; }
}

export async function download(path, fallbackName) {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await fetch(`${API_BASE_URL}${path}`, { headers, credentials: 'include' });
  if (!response.ok) {
    const body = await parsePayload(response).catch(() => ({}));
    throw new ApiError(body?.message || 'Unduhan gagal.', { status: response.status });
  }
  const url = URL.createObjectURL(await response.blob());
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = getDownloadName(response, fallbackName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
