const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;
const API_URL =
  typeof configuredApiUrl === 'string' && configuredApiUrl
    ? configuredApiUrl
    : 'http://localhost:3000';

export function isRetryableApiError(error: unknown) {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
}

export function formatUserFriendlyErrorMessage(raw: string): string {
  if (!raw) return 'No se pudo completar la solicitud.';

  const technicalTranslations: [RegExp, string][] = [
    [/id_categoria_rutina\s+(debe ser|es obligatorio)/i, 'Debes seleccionar una categoría para la rutina.'],
    [/id_categoria_rutina/i, 'La categoría seleccionada no es válida.'],
    [/musculos\s+(debe ser|es obligatorio|debe contener|no puede estar vac[ií]o)/i, 'Debes seleccionar al menos un músculo objetivo.'],
    [/equipos\s+(debe ser|es obligatorio)/i, 'El equipo seleccionado no es válido.'],
    [/id_ejercicio_estandar|id_ejercicio_personalizado|id_ejercicio/i, 'Debes seleccionar un ejercicio válido.'],
    [/repeticiones\s+(debe ser mayor a 0|es obligatorio)/i, 'El número de repeticiones debe ser al menos 1.'],
    [/series\s+(debe ser mayor a 0|es obligatorio)/i, 'El número de series debe ser al menos 1.'],
    [/peso_objetivo.*negativo/i, 'El peso objetivo no puede ser un número negativo.'],
    [/peso_objetivo/i, 'El peso objetivo debe ser un número válido.'],
    [/orden\s+(debe ser mayor a 0|es obligatorio)/i, 'El orden del ejercicio debe ser válido.'],
    [/duracion_minutos.*negativo/i, 'La duración no puede ser negativa.'],
    [/link_apoyo|link_informacion|url_imagen.*(formato|url|http)/i, 'El enlace introducido no tiene un formato válido (debe incluir http:// o https://).'],
  ];

  for (const [pattern, translation] of technicalTranslations) {
    if (pattern.test(raw)) {
      return translation;
    }
  }

  return raw
    .replace(/id_categoria_rutina/g, 'categoría')
    .replace(/id_ejercicio_personalizado/g, 'ejercicio personalizado')
    .replace(/id_ejercicio_estandar/g, 'ejercicio estándar')
    .replace(/id_ejercicio/g, 'ejercicio')
    .replace(/id_alumno/g, 'alumno')
    .replace(/id_usuario/g, 'usuario')
    .replace(/peso_objetivo/g, 'peso objetivo')
    .replace(/link_apoyo/g, 'enlace de apoyo')
    .replace(/link_informacion/g, 'enlace informativo')
    .replace(/url_imagen/g, 'URL de imagen');
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
    const rawMessage = Array.isArray(data.message)
      ? data.message.join(', ')
      : typeof data.message === 'string'
        ? data.message
        : 'No se pudo completar la solicitud';
    const message = formatUserFriendlyErrorMessage(rawMessage);
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
