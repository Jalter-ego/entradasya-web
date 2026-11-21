import { api, ApiError } from '../../shared/api';

export interface Ticket {
  id: string;
  orderId: string;
  customerId: string;
  ticketNumber: number;
  quantity: number;
  code: string;
  event: { id: string; title: string; venue: string; startsAt: string; organizerId?: string };
  sector: { id: string; name: string };
  unitPriceMinor: number;
  currency: string;
  paymentStatus: 'approved';
  pdfUrl: string;
  createdAt: string;
}

export interface TicketPage {
  items: Ticket[];
  limit: number;
  offset: number;
}

export function listMyTickets(
  token: string,
  { limit, offset, orderId }: { limit: number; offset: number; orderId?: string },
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (orderId) params.set('orderId', orderId);
  return api<TicketPage>(`/api/tickets/me?${params}`, { token, signal });
}

/** El PDF requiere Bearer; navegar a pdfUrl no adjunta el token de la sesión. */
export async function fetchTicketPdf(id: string, token: string, signal?: AbortSignal): Promise<Blob> {
  let response: Response;
  try {
    // Construir una ruta propia: nunca enviar el JWT a una URL suministrada por un registro.
    response = await fetch(`/api/tickets/${encodeURIComponent(id)}/pdf`, {
      headers: { Accept: 'application/pdf', Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK', 'No hay conexión con el servidor de entradas. Intenta nuevamente.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      response.status,
      data?.error?.code ?? `HTTP_${response.status}`,
      data?.error?.message ?? 'No se pudo descargar el PDF. Intenta nuevamente.',
    );
  }

  if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/pdf') {
    throw new ApiError(502, 'INVALID_PDF', 'El servidor no devolvió un PDF. Intenta nuevamente.');
  }
  const blob = await response.blob();
  if (blob.size === 0) throw new ApiError(502, 'INVALID_PDF', 'El PDF está vacío. Intenta nuevamente.');
  return blob;
}

export function ticketErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión no es válida o ha vencido. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'Necesitas una cuenta de cliente para consultar tus entradas.';
    if (error.status === 404) return 'No encontramos esta entrada para tu cuenta.';
    if (error.status === 503) return 'No se pudieron preparar las entradas. Intenta nuevamente en unos momentos.';
    return error.message;
  }
  return 'No se pudo completar la solicitud. Intenta nuevamente.';
}
