import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateLong, formatMoney, formatTime } from '../../../shared/format';
import { CalendarIcon, ChevronLeft, ChevronRight, PinIcon } from '../../../shared/icons';
import { minPrice, type EventItem } from '../api';
import { Poster } from './Poster';

const AUTOPLAY_MS = 7000;

/**
 * Carrusel de próximos eventos a todo el ancho: el afiche al centro sobre su propia versión
 * desenfocada, con el título y los datos encima. Avanza solo cada 7 s, se detiene al pasar
 * el mouse o enfocar, y no avanza si la persona prefiere menos movimiento.
 */
export function FeaturedEvent({ events }: { events: EventItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const count = events.length;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2 || reducedMotion.current) return;
    const timer = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, count, go]);

  const event = events[index % Math.max(count, 1)];
  if (!event) return null;
  const price = minPrice(event);

  return (
    <section
      className="hero"
      aria-roledescription="carrusel"
      aria-label="Próximos eventos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero__stage" key={event.id}>
        <div className="hero__backdrop" aria-hidden="true">
          <Poster src={event.imageUrl} title="" />
        </div>
        <div className="hero__poster">
          <Poster src={event.imageUrl} title={event.title} />
        </div>
        <div className="hero__info">
          <h1 className="hero__title">{event.title}</h1>
          <p className="hero__meta">
            <span>
              <CalendarIcon />
              {formatDateLong(event.startsAt)}, {formatTime(event.startsAt)}
            </span>
            <span>
              <PinIcon />
              {event.venue}, {event.city}
            </span>
          </p>
          <div className="hero__actions">
            <Link to={`/eventos/${event.id}`} className="btn btn--primary btn--lg">
              Comprar entradas
            </Link>
            {price !== null && <span className="hero__price">Desde {formatMoney(price, event.currency)}</span>}
          </div>
        </div>
      </div>

      {count > 1 && (
        <>
          <button type="button" className="hero__arrow hero__arrow--prev" aria-label="Evento anterior" onClick={() => go(-1)}>
            <ChevronLeft />
          </button>
          <button type="button" className="hero__arrow hero__arrow--next" aria-label="Evento siguiente" onClick={() => go(1)}>
            <ChevronRight />
          </button>
          <div className="hero__dots" role="group" aria-label="Elegir evento destacado">
            {events.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className="hero__dot"
                aria-label={e.title}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
