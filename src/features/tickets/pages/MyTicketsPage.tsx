import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api';
import { useSession } from '../../../shared/session';
import { EmptyState, ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { listMyTickets, ticketErrorMessage } from '../api';
import { OwnedTicketCard } from '../components/OwnedTicketCard';
import '../tickets.css';

const PAGE_SIZE = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function MyTicketsPage() {
  const { token, user } = useSession();
  const [params] = useSearchParams();
  const orderId = params.get('orderId') ?? undefined;
  if (!token || !user) return null; // La ruta pública aplica RequireRole antes de montar esta pantalla.

  return (
    <section className="page page--wide my-tickets" aria-labelledby="my-tickets-title">
      <div className="page-head">
        <div>
          <h1 id="my-tickets-title">Mis entradas</h1>
          <p className="muted">Descarga tus entradas y presenta el QR del PDF al ingresar.</p>
        </div>
        <Link className="btn btn--secondary" to="/">Ver cartelera</Link>
      </div>
      {orderId !== undefined && (
        <div className="my-tickets__filter">
          <p>Entradas de la compra <code>{orderId}</code></p>
          <Link to="/mis-entradas">Ver todas mis entradas</Link>
        </div>
      )}
      {orderId !== undefined && !UUID.test(orderId) ? (
        <ErrorState message="El identificador de compra del enlace no es válido." />
      ) : (
        // Desmontar los datos y cancelar descargas al cambiar sesión o filtro.
        <TicketList key={`${user.id}:${token}:${orderId ?? ''}`} token={token} orderId={orderId} />
      )}
    </section>
  );
}

function TicketList({ token, orderId }: { token: string; orderId?: string }) {
  const [offset, setOffset] = useState(0);
  // Pedir una fila extra permite saber si hay otra página sin requerir un total nuevo en la API.
  const tickets = useAsync(
    (signal) => listMyTickets(token, { limit: PAGE_SIZE + 1, offset, orderId }, signal),
    [token, orderId, offset],
  );

  if (tickets.status === 'loading') return <Spinner label="Cargando tus entradas" />;
  if (tickets.status === 'error') {
    const needsLogin = tickets.error instanceof ApiError && tickets.error.status === 401;
    const next = `/mis-entradas${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`;
    return (
      <>
        <ErrorState message={ticketErrorMessage(tickets.error)} onRetry={tickets.reload} />
        {needsLogin && (
          <p className="my-tickets__login">
            <Link className="btn btn--primary" to={`/login?next=${encodeURIComponent(next)}`}>Iniciar sesión</Link>
          </p>
        )}
      </>
    );
  }

  const items = tickets.data.items.slice(0, PAGE_SIZE);
  const hasNext = tickets.data.items.length > PAGE_SIZE;
  return (
    <>
      <div className="my-tickets__toolbar">
        <p className="muted" role="status">
          {items.length > 0 ? `Mostrando entradas ${offset + 1}–${offset + items.length}` : 'Sin entradas en esta página'}
        </p>
        <button className="btn btn--ghost" type="button" onClick={tickets.reload}>Actualizar</button>
      </div>
      {items.length === 0 ? (
        <EmptyState title={offset > 0 ? 'No hay más entradas' : orderId ? 'No hay entradas de esta compra' : 'Todavía no tienes entradas'}>
          <p>
            {offset > 0
              ? 'Vuelve a la página anterior para consultar tus entradas.'
              : orderId
                ? 'Las entradas aparecerán cuando termine su emisión para tu cuenta. Puedes actualizar la lista en unos momentos.'
                : 'Cuando completes una compra, aquí encontrarás tus entradas y sus PDF.'}
          </p>
        </EmptyState>
      ) : (
        <div className="my-tickets__grid">
          {items.map((ticket) => <OwnedTicketCard key={ticket.id} ticket={ticket} token={token} />)}
        </div>
      )}
      {(offset > 0 || hasNext) && (
        <nav className="my-tickets__pagination" aria-label="Páginas de mis entradas">
          <button className="btn btn--secondary" type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Anterior
          </button>
          <span>Página {Math.floor(offset / PAGE_SIZE) + 1}</span>
          <button className="btn btn--secondary" type="button" disabled={!hasNext} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Siguiente
          </button>
        </nav>
      )}
      <p className="my-tickets__note muted">El PDF incluye tu código QR. El uso de cada entrada se verifica en portería.</p>
    </>
  );
}
