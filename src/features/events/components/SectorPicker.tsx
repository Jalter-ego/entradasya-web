import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '../../../shared/format';
import { availabilityOf, type EventItem } from '../api';

const MAX_PER_ORDER = 6;

/**
 * Caja de compra: sector + cantidad (1 a 6) + total. El precio final lo calcula
 * el servidor; aquí solo se muestra como referencia.
 */
export function SectorPicker({ event }: { event: EventItem }) {
  const navigate = useNavigate();
  const firstAvailable = event.sectors.find((s) => s.available > 0);
  const [sectorId, setSectorId] = useState(firstAvailable?.id ?? '');
  const [quantity, setQuantity] = useState(1);

  const sector = event.sectors.find((s) => s.id === sectorId);
  const maxQuantity = Math.min(MAX_PER_ORDER, sector?.available ?? 0);
  const safeQuantity = Math.min(quantity, Math.max(maxQuantity, 1));
  const onSale = event.status === 'published' && new Date(event.startsAt).getTime() > Date.now();

  if (!onSale) {
    return (
      <div className="buybox buybox--closed">
        <p>{event.status === 'cancelled' ? 'Este evento fue cancelado.' : 'La venta de este evento está cerrada.'}</p>
      </div>
    );
  }

  function continueToCheckout() {
    if (!sector) return;
    const params = new URLSearchParams({ eventId: event.id, sectorId: sector.id, quantity: String(safeQuantity) });
    navigate(`/checkout?${params}`);
  }

  return (
    <form
      className="buybox"
      onSubmit={(e) => {
        e.preventDefault();
        continueToCheckout();
      }}
    >
      <fieldset className="sectors">
        <legend className="buybox__heading">Elige tu sector</legend>
        {event.sectors.map((s) => {
          const availability = availabilityOf(s.available, s.capacity);
          return (
            <label key={s.id} className={`sector ${availability === 'soldOut' ? 'sector--disabled' : ''}`}>
              <input
                type="radio"
                name="sector"
                value={s.id}
                checked={s.id === sectorId}
                disabled={availability === 'soldOut'}
                onChange={() => {
                  setSectorId(s.id);
                  setQuantity(1);
                }}
              />
              <span className="sector__name">{s.name}</span>
              <span className="sector__price">{formatMoney(s.priceMinor, event.currency)}</span>
              <span className={`sector__availability sector__availability--${availability}`}>
                {availability === 'soldOut'
                  ? 'Agotado'
                  : availability === 'few'
                    ? `Quedan ${s.available}`
                    : 'Disponible'}
              </span>
            </label>
          );
        })}
      </fieldset>

      {sector ? (
        <>
          <div className="buybox__row">
            <span id="qty-label">Cantidad</span>
            <div className="stepper" role="group" aria-labelledby="qty-label">
              <button
                type="button"
                aria-label="Quitar una entrada"
                disabled={safeQuantity <= 1}
                onClick={() => setQuantity(safeQuantity - 1)}
              >
                −
              </button>
              <output aria-live="polite">{safeQuantity}</output>
              <button
                type="button"
                aria-label="Agregar una entrada"
                disabled={safeQuantity >= maxQuantity}
                onClick={() => setQuantity(safeQuantity + 1)}
              >
                +
              </button>
            </div>
          </div>
          <p className="buybox__hint">Hasta {MAX_PER_ORDER} entradas por compra.</p>
          <div className="buybox__total">
            <span>Total</span>
            <strong>{formatMoney(sector.priceMinor * safeQuantity, event.currency)}</strong>
          </div>
          <button type="submit" className="btn btn--primary btn--lg btn--block">
            Continuar con la compra
          </button>
        </>
      ) : (
        <p className="buybox__soldout">Todas las entradas de este evento se vendieron.</p>
      )}
    </form>
  );
}
