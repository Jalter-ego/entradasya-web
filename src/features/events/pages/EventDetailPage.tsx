import '../events.css';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api';
import { dayAndMonth, formatDateLong, formatTime } from '../../../shared/format';
import { CalendarIcon, ClockIcon, PinIcon } from '../../../shared/icons';
import { useSession } from '../../../shared/session';
import { ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { eventsApi } from '../api';
import { categoryLabel } from '../catalog';
import { Poster } from '../components/Poster';
import { SectorPicker } from '../components/SectorPicker';
import { StatusBadge } from '../components/StatusBadge';

export function EventDetailPage() {
  const { id = '' } = useParams();
  const { token, user } = useSession();
  const event = useAsync((signal) => eventsApi.get(id, token, signal), [id, token]);

  if (event.status === 'loading' && !event.data) return <Spinner label="Cargando evento" />;

  if (event.status === 'error') {
    const notFound = event.error instanceof ApiError && event.error.status === 404;
    return (
      <section className="page page--narrow notice">
        {notFound ? (
          <>
            <h1>No encontramos este evento</h1>
            <p>Puede que ya no esté publicado o que el enlace sea incorrecto.</p>
            <Link className="btn btn--primary" to="/">
              Ver la cartelera
            </Link>
          </>
        ) : (
          <ErrorState message={event.error.message} onRetry={event.reload} />
        )}
      </section>
    );
  }

  const e = event.data!;
  const isOwner = user?.id === e.organizerId;
  const onSale = e.status === 'published' && new Date(e.startsAt).getTime() > Date.now();
  const { day, month } = dayAndMonth(e.startsAt);

  return (
    <article className="detail">
      <header className="detail__hero">
        <div className="detail__backdrop" aria-hidden="true">
          <Poster src={e.imageUrl} title="" />
        </div>
        <div className="page page--wide detail__hero-inner">
          <Link to="/" className="back-link">
            Volver a la cartelera
          </Link>
          <div className="detail__headline">
            <div className="detail__poster">
              <Poster src={e.imageUrl} title={e.title} />
            </div>
            <div>
              <div className="detail__badges">
                <span className="pill">{categoryLabel(e.category)}</span>
                {e.status !== 'published' && <StatusBadge status={e.status} />}
              </div>
              <h1 className="detail__title">{e.title}</h1>
              <p className="detail__meta">
                <span>
                  <CalendarIcon />
                  {formatDateLong(e.startsAt)}
                </span>
                <span>
                  <PinIcon />
                  {e.venue}, {e.city}
                </span>
              </p>
              {onSale && (
                <a href="#comprar" className="btn btn--primary">
                  Comprar entradas
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="page page--wide detail__layout">
        <div className="detail__main">
          <section className="panel function">
            <time className="function__date" dateTime={e.startsAt}>
              <span>{day}</span>
              {month}
            </time>
            <div>
              <h2 className="function__title">Función</h2>
              <p className="function__line">
                <CalendarIcon /> {formatDateLong(e.startsAt)}
              </p>
              <p className="function__line">
                <ClockIcon /> {formatTime(e.startsAt)} h
              </p>
              <p className="function__line">
                <PinIcon /> {e.venue}, {e.city}
              </p>
            </div>
          </section>

          {e.description && (
            <section className="detail__description">
              <h2>Sobre el evento</h2>
              {e.description.split(/\n{2,}/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </section>
          )}

          {isOwner && (
            <Link className="btn btn--secondary" to={`/organizador/eventos/${e.id}`}>
              Editar este evento
            </Link>
          )}
        </div>

        <aside id="comprar" className="detail__aside" aria-label="Comprar entradas">
          <SectorPicker event={e} />
        </aside>
      </div>
    </article>
  );
}
