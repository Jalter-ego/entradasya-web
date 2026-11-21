import '../events.css';
import { useMemo, useState } from 'react';
import { SearchIcon } from '../../../shared/icons';
import { ErrorState, EmptyState } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { eventsApi, type EventItem } from '../api';
import { CATEGORIES, CITIES, categoryLabel } from '../catalog';
import { FeaturedEvent } from '../components/FeaturedEvent';
import { TicketCard } from '../components/TicketCard';

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matches(event: EventItem, query: string, category: string, city: string) {
  if (category && event.category !== category) return false;
  if (city && event.city !== city) return false;
  if (!query) return true;
  const q = normalize(query);
  return [event.title, event.venue, event.city].some((field) => normalize(field).includes(q));
}

export function CatalogPage() {
  const events = useAsync((signal) => eventsApi.listPublished(signal), []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  const all = events.data ?? [];
  // Solo se ofrecen filtros que tienen al menos un evento.
  const categories = useMemo(() => CATEGORIES.filter((c) => all.some((e) => e.category === c)), [all]);
  const cities = useMemo(() => CITIES.filter((c) => all.some((e) => e.city === c)), [all]);
  const visible = useMemo(
    () => all.filter((e) => matches(e, query.trim(), category, city)),
    [all, query, category, city],
  );
  const filtering = query.trim() !== '' || category !== '' || city !== '';

  function clearFilters() {
    setQuery('');
    setCategory('');
    setCity('');
  }

  return (
    <div className="page page--wide">
      {all.length > 0 && <FeaturedEvent events={all.slice(0, 6)} />}

      <section className="catalog" aria-labelledby="catalog-title">
        <div className="catalog__head">
          <h2 id="catalog-title" className="catalog__title">
            Cartelera
          </h2>
          <label className="search">
            <span className="visually-hidden">Buscar por evento, lugar o ciudad</span>
            <SearchIcon />
            <input
              type="search"
              placeholder="Evento, lugar o ciudad"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {categories.length > 1 && (
          <div className="chips" role="group" aria-label="Filtrar por categoría">
            <button type="button" className="chip" aria-pressed={category === ''} onClick={() => setCategory('')}>
              Todos
            </button>
            {categories.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        )}
        {cities.length > 1 && (
          <div className="chips chips--quiet" role="group" aria-label="Filtrar por ciudad">
            <button type="button" className="chip" aria-pressed={city === ''} onClick={() => setCity('')}>
              Todas las ciudades
            </button>
            {cities.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={city === c} onClick={() => setCity(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {events.status === 'error' ? (
          <ErrorState message={events.error.message} onRetry={events.reload} />
        ) : events.status === 'loading' && !events.data ? (
          <div className="ticket-grid" aria-busy="true" aria-label="Cargando eventos">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="ticket ticket--skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          filtering ? (
            <EmptyState title="No hay eventos con esos filtros">
              <p>Prueba con otra palabra, otra categoría u otra ciudad.</p>
              <button type="button" className="btn btn--secondary" onClick={clearFilters}>
                Ver todos los eventos
              </button>
            </EmptyState>
          ) : (
            <EmptyState title="Todavía no hay eventos a la venta">
              <p>Vuelve pronto: los organizadores están preparando nuevas fechas.</p>
            </EmptyState>
          )
        ) : (
          <div className="ticket-grid">
            {visible.map((event) => (
              <TicketCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
