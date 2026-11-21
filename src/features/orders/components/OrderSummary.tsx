import { formatDateLong, formatMoney, formatTime } from '../../../shared/format';
import type { Order } from '../api';

/** Resumen de una orden con la copia del evento guardada al reservar. */
export function OrderSummary({ order }: { order: Order }) {
  return (
    <dl className="order-summary">
      {order.event && (
        <>
          <div>
            <dt>Evento</dt>
            <dd>{order.event.title}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{formatDateLong(order.event.startsAt)}, {formatTime(order.event.startsAt)} h</dd>
          </div>
          <div>
            <dt>Lugar</dt>
            <dd>{order.event.venue}, {order.event.city}</dd>
          </div>
        </>
      )}
      <div>
        <dt>Sector</dt>
        <dd>{order.sector?.name ?? '—'}</dd>
      </div>
      <div>
        <dt>Entradas</dt>
        <dd>{order.quantity}</dd>
      </div>
      <div>
        <dt>Total</dt>
        <dd>{order.totalMinor !== null && order.currency ? formatMoney(order.totalMinor, order.currency) : 'Por confirmar'}</dd>
      </div>
      <div>
        <dt>Pago</dt>
        <dd>Tarjeta de demo •••• {order.payment.last4}</dd>
      </div>
      <div>
        <dt>Código de compra</dt>
        <dd><code>{order.id}</code></dd>
      </div>
    </dl>
  );
}
