const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;
const API_URL =
  typeof configuredApiUrl === 'string' && configuredApiUrl
    ? configuredApiUrl
    : 'http://localhost:3000';

export function isRetryableApiError(error: unknown) {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('ritmo_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status === 401) {
    localStorage.removeItem('ritmo_token');
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : typeof data.message === 'string'
        ? data.message
        : 'No se pudo completar la solicitud';
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
