import '../events.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../../shared/api';
import { formatDateShort, formatTime } from '../../../shared/format';
import { useSession } from '../../../shared/session';
import { EmptyState, ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { errorMessage, eventsApi, totals, type EventItem } from '../api';
import { StatusBadge } from '../components/StatusBadge';

export function OrganizerEventsPage() {
  const { token } = useSession();
  const events = useAsync((signal) => eventsApi.listMine(token, signal), [token]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function run(event: EventItem, action: 'publish' | 'cancel') {
    if (action === 'cancel' && !window.confirm(`¿Cancelar "${event.title}"? Ya no se podrán comprar entradas.`)) {
      return;
    }
    setBusyId(event.id);
    setFeedback(null);
    try {
      const updated = await eventsApi[action](token, event.id);
      events.setData((events.data ?? []).map((e) => (e.id === updated.id ? updated : e)));
      setFeedback({ kind: 'ok', text: action === 'publish' ? `"${event.title}" publicado.` : `"${event.title}" cancelado.` });
    } catch (err) {
      const e = err as ApiError;
      setFeedback({ kind: 'error', text: errorMessage(e.code, e.message) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page page--wide">
      <div className="page-head">
        <h1>Mis eventos</h1>
        <Link to="/organizador/eventos/nuevo" className="btn btn--primary">
          Crear evento
        </Link>
      </div>

      {feedback && (
        <p className={`flash flash--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
          {feedback.text}
        </p>
      )}

      {events.status === 'error' ? (
        <ErrorState message={events.error.message} onRetry={events.reload} />
      ) : !events.data ? (
        <Spinner label="Cargando tus eventos" />
      ) : events.data.length === 0 ? (
        <EmptyState title="Aún no creaste eventos">
          <p>Crea tu primer evento, agrega sus sectores y publícalo para empezar a vender.</p>
          <Link to="/organizador/eventos/nuevo" className="btn btn--primary">
            Crear evento
          </Link>
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Evento</th>
                <th scope="col">Fecha</th>
                <th scope="col">Estado</th>
                <th scope="col" className="num">
                  Reservadas
                </th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.data.map((event) => {
                const { capacity, committed } = totals(event);
                const pct = capacity ? Math.round((committed / capacity) * 100) : 0;
                return (
                  <tr key={event.id}>
                    <td>
                      <Link to={`/organizador/eventos/${event.id}`} className="table__title">
                        {event.title}
                      </Link>
                      <span className="table__sub">{event.venue}, {event.city}</span>
                    </td>
                    <td>
                      {formatDateShort(event.startsAt)}
                      <span className="table__sub">{formatTime(event.startsAt)}</span>
                    </td>
                    <td>
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="num">
                      {committed} de {capacity}
                      <span className="meter" aria-hidden="true">
                        <span style={{ width: `${pct}%` }} />
                      </span>
                    </td>
                    <td>
                      <div className="table__actions">
                      <Link to={`/organizador/eventos/${event.id}`} className="btn btn--secondary btn--sm">
                        Editar
                      </Link>
                      {event.status === 'draft' && (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={busyId === event.id}
                          onClick={() => run(event, 'publish')}
                        >
                          Publicar
                        </button>
                      )}
                      {event.status !== 'cancelled' && (
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          disabled={busyId === event.id}
                          onClick={() => run(event, 'cancel')}
                        >
                          Cancelar
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
