import '../orders.css';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api';
import { formatDateLong, formatMoney, formatTime } from '../../../shared/format';
import { useSession } from '../../../shared/session';
import { ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { eventsApi } from '../../events/api';
import { ordersApi, orderErrorMessage, type DemoPayment, type OrderCreate } from '../api';
import { PaymentFields } from '../../payments/PaymentFields';
import { checkoutKey, forgetCheckoutKey } from '../idempotency';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** /checkout?eventId&sectorId&quantity — llega desde el detalle del evento (SectorPicker de P2). */
export function CheckoutPage() {
  const [params] = useSearchParams();
  const eventId = params.get('eventId') ?? '';
  const sectorId = params.get('sectorId') ?? '';
  const quantity = Number(params.get('quantity'));
  const valid = UUID.test(eventId) && UUID.test(sectorId) && Number.isInteger(quantity) && quantity >= 1 && quantity <= 6;

  if (!valid) {
    return (
      <section className="page page--narrow notice">
        <h1>No pudimos preparar tu compra</h1>
        <p>El enlace de compra no es válido. Elige de nuevo el sector y la cantidad.</p>
        <Link className="btn btn--primary" to="/">Ver la cartelera</Link>
      </section>
    );
  }
  return <Checkout eventId={eventId} sectorId={sectorId} quantity={quantity} />;
}

function Checkout({ eventId, sectorId, quantity }: { eventId: string; sectorId: string; quantity: number }) {
  const { token } = useSession();
  const navigate = useNavigate();
  const event = useAsync((signal) => eventsApi.get(eventId, token, signal), [eventId, token]);
  const [payment, setPayment] = useState<DemoPayment>({ method: 'demo_card', last4: '1111' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (event.status === 'loading' && !event.data) return <Spinner label="Preparando tu compra" />;
  if (event.status === 'error') {
    return <section className="page page--narrow"><ErrorState message={event.error.message} onRetry={event.reload} /></section>;
  }

  const e = event.data!;
  const sector = e.sectors.find((s) => s.id === sectorId);
  if (!sector) {
    return (
      <section className="page page--narrow notice">
        <h1>Este sector ya no está disponible</h1>
        <Link className="btn btn--primary" to={`/eventos/${eventId}`}>Volver al evento</Link>
      </section>
    );
  }

  async function confirm() {
    if (submitting || !token) return;
    setSubmitting(true);
    setError(null);
    const body: OrderCreate = { eventId, sectorId, quantity, payment };
    // Misma compra => misma clave, aunque el usuario reintente tras un timeout o recargue.
    const key = checkoutKey(JSON.stringify(body));
    try {
      const result = await ordersApi.create(token, key, body);
      forgetCheckoutKey();
      navigate(`/compras/${result.order.id}`, { replace: true, state: result });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'IDEMPOTENCY_CONFLICT') forgetCheckoutKey();
      setError(orderErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <section className="page page--medium checkout" aria-labelledby="checkout-title">
      <Link to={`/eventos/${eventId}`} className="back-link">Volver al evento</Link>
      <h1 id="checkout-title">Confirmar compra</h1>

      <div className="checkout__layout">
        <form
          className="form-card"
          onSubmit={(ev) => {
            ev.preventDefault();
            void confirm();
          }}
        >
          <PaymentFields value={payment} onChange={setPayment} disabled={submitting} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting ? 'Procesando tu compra…' : error ? 'Reintentar compra' : 'Pagar y confirmar'}
          </button>
          {submitting && <p className="field__hint" role="status">Estamos reservando tus lugares y procesando el pago. No cierres esta página.</p>}
        </form>

        <aside className="panel checkout__summary" aria-label="Resumen">
          <h2 className="panel__title">{e.title}</h2>
          <dl className="order-summary">
            <div>
              <dt>Fecha</dt>
              <dd>{formatDateLong(e.startsAt)}, {formatTime(e.startsAt)} h</dd>
            </div>
            <div>
              <dt>Lugar</dt>
              <dd>{e.venue}, {e.city}</dd>
            </div>
            <div>
              <dt>Sector</dt>
              <dd>{sector.name}</dd>
            </div>
            <div>
              <dt>Entradas</dt>
              <dd>{quantity} × {formatMoney(sector.priceMinor, e.currency)}</dd>
            </div>
            <div className="order-summary__total">
              <dt>Total</dt>
              <dd>{formatMoney(sector.priceMinor * quantity, e.currency)}</dd>
            </div>
          </dl>
          <p className="field__hint">El precio final lo confirma el servidor al reservar tus lugares.</p>
        </aside>
      </div>
    </section>
  );
}
