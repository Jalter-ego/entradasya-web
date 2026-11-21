import { api, ApiError } from '../../shared/api';

export type OrderStatus = 'pending' | 'paid' | 'rejected' | 'cancelled';

export interface DemoPayment {
  method: 'demo_card';
  last4: '0000' | '1111';
}

/** Orden según contracts/orders.openapi.yaml (schema Order). */
export interface Order {
  id: string;
  status: OrderStatus;
  eventId: string;
  sectorId: string;
  quantity: number;
  unitPriceMinor: number | null;
  totalMinor: number | null;
  currency: string | null;
  event: { id: string; title: string; venue: string; city: string; startsAt: string } | null;
  sector: { id: string; name: string } | null;
  payment: { method: 'demo_card'; last4: string; transactionId: string | null };
  progress: {
    reservation: 'not_started' | 'pending' | 'active' | 'release_pending' | 'released' | 'failed';
    payment: 'not_started' | 'pending' | 'unknown' | 'approved' | 'rejected';
    tickets: 'not_started' | 'pending' | 'issued';
    notification: 'not_started' | 'pending' | 'sent' | 'failed' | 'unknown';
  };
  lastError: { step: 'reservation' | 'payment' | 'tickets' | 'notification'; code: string } | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

/** Envoltorio de orders: { success, message, data, meta, requestId }. Los errores los traduce shared/api. */
interface Envelope<T> {
  success: true;
  message: string;
  data: T;
  meta: PaginationMeta | null;
  requestId: string;
}

export interface OrderCreate {
  eventId: string;
  sectorId: string;
  quantity: number;
  payment: DemoPayment;
}

export interface OrderResult {
  order: Order;
  message: string;
}

const base = '/api/orders';
const toResult = (body: Envelope<Order>): OrderResult => ({ order: body.data, message: body.message });

export const ordersApi = {
  /** La misma Idempotency-Key para la misma compra: repetirla nunca crea otra orden ni cobra dos veces. */
  create: (token: string, idempotencyKey: string, body: OrderCreate) =>
    api<Envelope<Order>>(base, { method: 'POST', token, body, headers: { 'Idempotency-Key': idempotencyKey } }).then(toResult),
  get: (token: string, id: string, signal?: AbortSignal) =>
    api<Envelope<Order>>(`${base}/${encodeURIComponent(id)}`, { token, signal }).then(toResult),
  retry: (token: string, id: string) =>
    api<Envelope<Order>>(`${base}/${encodeURIComponent(id)}/retry`, { method: 'POST', token }).then(toResult),
  listMine: (token: string, page: number, perPage: number, signal?: AbortSignal) =>
    api<Envelope<Order[]>>(`${base}/me?page=${page}&perPage=${perPage}`, { token, signal })
      .then((body) => ({ items: body.data, meta: body.meta! })),
};

export function orderErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'No hay conexión con el servidor. Tu compra no se perdió: vuelve a intentarlo.';
    if (error.status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.';
    if (error.status === 403) return 'Necesitas una cuenta de cliente para comprar.';
    if (error.status === 404) return 'No encontramos esta compra en tu cuenta.';
    if (error.code === 'IDEMPOTENCY_CONFLICT') return 'Esta compra cambió mientras se procesaba. Revisa los datos y vuelve a confirmar.';
    if (error.code === 'VALIDATION_ERROR') return 'Revisa los datos de la compra.';
    if (error.status >= 500) return 'El servicio de compras no responde. Tu compra no se perdió: vuelve a intentarlo.';
    return error.message;
  }
  return 'No se pudo completar la solicitud. Intenta nuevamente.';
}
