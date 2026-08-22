import type { User } from '../types';

export const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface SignInResponse {
  accessToken: string;
  user: User;
  /** True when the account still uses the HR-issued one-time password */
  mustChangePassword?: boolean;
}

// The access token lives only in memory; the 7-day refresh token is an
// httpOnly cookie the browser attaches automatically (credentials: 'include').
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data: SignInResponse = await res.json();
    accessToken = data.accessToken;
    return accessToken;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

// Single-flight refresh: concurrent 401s share one /auth/refresh call
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  // The 15-min access token expired — exchange the refresh cookie and retry once.
  // (Only for requests we sent a token on; failed sign-ins must not trigger this.)
  if (res.status === 401 && !retried && accessToken) {
    const renewed = await refreshAccessToken();
    if (renewed) return request<T>(path, options, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Request failed: ${res.status}`, body.code);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// There is no public sign-up: HR/Admin create accounts via POST /api/employees

// Authenticated file download (CSV/PDF) — same token injection + refresh retry
export async function download(path: string): Promise<{ blob: Blob; filename: string }> {
  let res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (res.status === 401 && accessToken) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      res = await fetch(`${BASE_URL}${path}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${renewed}` },
      });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Download failed: ${res.status}`, body.code);
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  return { blob: await res.blob(), filename: match?.[1] ?? 'download' };
}

/** Trigger a browser save for a downloaded blob */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const authApi = {
  signIn: (payload: { email: string; password: string }) =>
    api.post<SignInResponse>('/auth/signin', payload),
  signOut: () => api.post<{ message: string }>('/auth/signout'),
  me: () => api.get<{ user: User }>('/auth/me'),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/change-password', payload),
};
