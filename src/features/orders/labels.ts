import type { Order, OrderStatus } from './api';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'En proceso',
  paid: 'Pagada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const REJECTION_LABEL: Record<string, string> = {
  SOLD_OUT: 'No quedan cupos suficientes en el sector elegido.',
  EVENT_NOT_AVAILABLE: 'El evento ya no está a la venta.',
  EVENT_NOT_FOUND: 'El evento o el sector ya no existen.',
  PAYMENT_REJECTED: 'El pago fue rechazado. No se cobró nada y los lugares se liberaron.',
};

export function rejectionReason(order: Order): string {
  return REJECTION_LABEL[order.lastError?.code ?? ''] ?? 'La compra no se pudo completar.';
}
