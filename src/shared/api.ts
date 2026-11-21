/** Error con el formato acordado: { error: { code, message }, requestId }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  /** Cabeceras adicionales, por ejemplo Idempotency-Key en la compra. */
  headers?: Record<string, string>;
}

/** Llama a una API pública a través del gateway (/api/...). */
export async function api<T>(path: string, { method = 'GET', body, token, signal, headers }: RequestOptions = {}): Promise<T> {
  let res: Response;
  const multipart = body instanceof FormData;
  try {
    res = await fetch(path, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: multipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK', 'No hay conexión con el servidor. Revisa que el servicio esté encendido.');
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      error?.code ?? `HTTP_${res.status}`,
      error?.message ?? (res.status >= 500 ? 'El servicio no está disponible en este momento.' : 'La solicitud no se pudo completar.'),
    );
  }
  return data as T;
}
