import { api, ApiError } from '../../shared/api';

export interface CheckinRecord {
  id: string;
  ticketId: string;
  eventId: string;
  doormanId: string;
  checkedInAt: string;
}

export interface CheckinSuccess {
  checkin: CheckinRecord;
  eventCount: number;
}

export interface EventCount {
  eventId: string;
  count: number;
}

export interface RecentCheckins {
  eventId: string;
  items: CheckinRecord[];
}

export class CheckinApiError extends ApiError {
  constructor(
    status: number,
    code: string,
    message: string,
    public readonly details?: { checkedInAt?: string; firstEventId?: string; ticketId?: string },
  ) {
    super(status, code, message);
  }
}

export async function registerCheckin(
  token: string,
  input: { code: string; eventId: string },
): Promise<CheckinSuccess> {
  let response: Response;
  try {
    response = await fetch('/api/checkin', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: input.code.trim(), eventId: input.eventId }),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new CheckinApiError(
      0,
      'NETWORK',
      'No hay conexión con el servicio de portería. Revisa que esté encendido.',
    );
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorObj = (
      data as {
        error?: {
          code?: string;
          message?: string;
          details?: { checkedInAt?: string; firstEventId?: string; ticketId?: string };
        };
      } | null
    )?.error;

    throw new CheckinApiError(
      response.status,
      errorObj?.code ?? `HTTP_${response.status}`,
      errorObj?.message ??
        (response.status >= 500
          ? 'El servicio de portería no está disponible en este momento.'
          : 'No se pudo validar la entrada.'),
      errorObj?.details,
    );
  }

  return data as CheckinSuccess;
}

export function getEventCheckinCount(token: string, eventId: string, signal?: AbortSignal) {
  return api<EventCount>(`/api/checkin/events/${encodeURIComponent(eventId)}/count`, { token, signal });
}

export function listRecentCheckins(token: string, eventId: string, limit = 10, signal?: AbortSignal) {
  return api<RecentCheckins>(
    `/api/checkin/events/${encodeURIComponent(eventId)}/recent?limit=${limit}`,
    { token, signal },
  );
}
