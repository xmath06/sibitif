const API_BASE = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API_PREFIX = '/api/v1';

export const API_URL = `${API_BASE}${API_PREFIX}`;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(message: string, status: number, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let isRefreshing = false;
let pendingRefresh: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Global fetch wrapper.
 * - Selalu mengirim cookies HTTP-only (credentials: 'include').
 * - Bila dapat 401, coba refresh token sekali lalu ulangi request.
 * - Bila refresh gagal -> redirect ke /login (hanya di browser).
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { query, headers, ...rest } = options;
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const run = async (): Promise<Response> =>
    fetch(url.toString(), {
      ...rest,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(rest.body && !(rest.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...headers
      }
    });

  let res = await run();

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      pendingRefresh = doRefresh();
    }
    const ok = await pendingRefresh!;
    isRefreshing = false;
    pendingRefresh = null;

    if (ok) {
      res = await run(); // retry sekali dengan cookie baru
    } else {
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new ApiError('Sesi berakhir, silakan login kembali', 401, 'UNAUTHORIZED');
    }
  }

  if (!res.ok) {
    let payload: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      payload.error?.message ?? `Request gagal (${res.status})`,
      res.status,
      payload.error?.code ?? 'HTTP_ERROR',
      payload.error?.details
    );
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T = unknown>(path: string, query?: Record<string, string | number | undefined>) =>
    apiFetch<T>(path, { method: 'GET', query }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  upload: <T = unknown>(path: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch<T>(path, { method: 'POST', body: fd });
  }
};
