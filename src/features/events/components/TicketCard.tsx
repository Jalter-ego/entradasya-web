import { Link } from 'react-router-dom';
import { dayAndMonth, formatMoney, formatTime } from '../../../shared/format';
import { PinIcon } from '../../../shared/icons';
import { availabilityOf, minPrice, totals, type EventItem } from '../api';
import { categoryLabel } from '../catalog';
import { Poster } from './Poster';

/**
 * Tarjeta con forma de entrada: afiche arriba, línea perforada, talón con la fecha
 * y pie con el precio desde. Toda la tarjeta es un enlace al detalle.
 */
export function TicketCard({ event }: { event: EventItem }) {
  const { day, month, weekday } = dayAndMonth(event.startsAt);
  const price = minPrice(event);
  const { available, capacity } = totals(event);
  const availability = availabilityOf(available, capacity);

  return (
    <article className="ticket">
      <Link to={`/eventos/${event.id}`} className="ticket__link">
        <div className="ticket__art">
          <Poster src={event.imageUrl} title={event.title} />
          {availability === 'soldOut' && <span className="tag tag--soldout">Agotado</span>}
          {availability === 'few' && <span className="tag tag--few">Últimos lugares</span>}
        </div>
        <div className="ticket__stub">
          <time className="ticket__date" dateTime={event.startsAt}>
            <span className="ticket__weekday">{weekday}</span>
            <span className="ticket__day">{day}</span>
            <span className="ticket__month">{month}</span>
          </time>
          <div className="ticket__body">
            <span className="ticket__category">{categoryLabel(event.category)}</span>
            <h3 className="ticket__title">{event.title}</h3>
            <p className="ticket__venue">
              <PinIcon />
              <span>
                {event.venue}, {formatTime(event.startsAt)}
                <strong>{event.city}</strong>
              </span>
            </p>
          </div>
        </div>
        <div className="ticket__foot">
          {price !== null ? (
            <p className="ticket__price">
              <span>Desde</span>
              <strong>{formatMoney(price, event.currency)}</strong>
            </p>
          ) : (
            <span />
          )}
          <span className="ticket__cta" aria-hidden="true">
            {availability === 'soldOut' ? 'Ver evento' : 'Ver entradas'}
          </span>
        </div>
      </Link>
    </article>
  );
}
