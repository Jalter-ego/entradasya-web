import '../orders.css';
import { useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../../../shared/session';
import { ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { ordersApi, orderErrorMessage, type Order, type OrderResult } from '../api';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderSummary } from '../components/OrderSummary';
import { rejectionReason } from '../labels';

/** /compras/:id — resultado de la compra y recuperación de pasos pendientes. */
export function OrderResultPage() {
  const { id = '' } = useParams();
  const { token } = useSession();
  const location = useLocation();
  // La primera vez se usa la orden que devolvió el checkout; "Actualizar" siempre consulta al servidor.
  const initial = useRef((location.state as OrderResult | null)?.order?.id === id ? (location.state as OrderResult) : null);
  const order = useAsync((signal) => {
    const cached = initial.current;
    initial.current = null;
    return cached ? Promise.resolve(cached) : ordersApi.get(token!, id, signal);
  }, [id, token]);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (order.status === 'loading' && !order.data) return <Spinner label="Cargando tu compra" />;
  if (order.status === 'error' && !order.data) {
    return <section className="page page--narrow"><ErrorState message={orderErrorMessage(order.error)} onRetry={order.reload} /></section>;
  }

  const o = order.data!.order;

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      order.setData(await ordersApi.retry(token!, o.id));
    } catch (err) {
      setRetryError(orderErrorMessage(err));
    } finally {
      setRetrying(false);
    }
  }

  return (
    <section className="page page--medium order-result" aria-labelledby="order-title">
      <div className="page-head">
        <div>
          <h1 id="order-title">{title(o)}</h1>
          <OrderStatusBadge status={o.status} />
        </div>
        <Link className="btn btn--secondary" to="/mis-compras">Mis compras</Link>
      </div>

      <Outcome order={o} retrying={retrying} onRetry={retry} onRefresh={order.reload} />
      {retryError && <p className="form-error" role="alert">{retryError}</p>}

      <div className="panel">
        <OrderSummary order={o} />
      </div>
    </section>
  );
}

function title(order: Order): string {
  if (order.status === 'paid') return order.progress.tickets === 'issued' ? '¡Compra realizada!' : 'Pago aprobado';
  if (order.status === 'rejected') return 'No se pudo completar la compra';
  if (order.status === 'cancelled') return 'Compra cancelada';
  return 'Tu compra está en proceso';
}

function Outcome({ order, retrying, onRetry, onRefresh }: {
  order: Order; retrying: boolean; onRetry: () => void; onRefresh: () => void;
}) {
  const retryButton = (label: string) => (
    <button type="button" className="btn btn--primary" disabled={retrying} onClick={onRetry}>
      {retrying ? 'Reintentando…' : label}
    </button>
  );

  if (order.status === 'paid') {
    const mailIssue = order.progress.notification === 'failed' || order.progress.notification === 'unknown';
    if (order.progress.tickets !== 'issued') {
      return (
        <div className="order-result__box">
          <p>Tu pago fue aprobado. Tus entradas se están emitiendo; no se te cobrará de nuevo al reintentar.</p>
          <div className="order-result__actions">{retryButton('Reintentar emisión')}</div>
        </div>
      );
    }
    return (
      <div className="order-result__box order-result__box--ok">
        <p>Tus entradas están listas. Descárgalas y presenta el QR al ingresar.</p>
        {mailIssue && <p className="muted">No pudimos confirmar el envío del correo de confirmación, pero tus entradas ya están disponibles.</p>}
        <div className="order-result__actions">
          <Link className="btn btn--primary" to={`/mis-entradas?orderId=${order.id}`}>Ver mis entradas</Link>
          {mailIssue && (
            <button type="button" className="btn btn--secondary" disabled={retrying} onClick={onRetry}>
              Reenviar correo
            </button>
          )}
        </div>
      </div>
    );
  }

  if (order.status === 'rejected') {
    return (
      <div className="order-result__box order-result__box--error">
        <p>{rejectionReason(order)}</p>
        <div className="order-result__actions">
          <Link className="btn btn--primary" to={`/eventos/${order.eventId}`}>Volver al evento</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-result__box">
      <p>Uno de los pasos no respondió a tiempo. Tus lugares siguen reservados y no se cobrará dos veces.</p>
      <div className="order-result__actions">
        {retryButton('Reintentar')}
        <button type="button" className="btn btn--secondary" onClick={onRefresh}>Actualizar estado</button>
      </div>
    </div>
  );
}
