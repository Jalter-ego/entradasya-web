import '../orders.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateShort, formatMoney } from '../../../shared/format';
import { useSession } from '../../../shared/session';
import { EmptyState, ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { ordersApi, orderErrorMessage } from '../api';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

const PER_PAGE = 10;

/** /mis-compras — compras del cliente autenticado, de la más reciente a la más antigua. */
export function MyOrdersPage() {
  const { token, user } = useSession();
  const [page, setPage] = useState(1);
  const orders = useAsync((signal) => ordersApi.listMine(token!, page, PER_PAGE, signal), [token, user?.id, page]);

  return (
    <section className="page page--wide my-orders" aria-labelledby="my-orders-title">
      <div className="page-head">
        <div>
          <h1 id="my-orders-title">Mis compras</h1>
          <p className="muted">El estado de cada compra y el acceso a sus entradas.</p>
        </div>
        <Link className="btn btn--secondary" to="/mis-entradas">Mis entradas</Link>
      </div>

      {orders.status === 'loading' && !orders.data ? (
        <Spinner label="Cargando tus compras" />
      ) : orders.status === 'error' ? (
        <ErrorState message={orderErrorMessage(orders.error)} onRetry={orders.reload} />
      ) : orders.data!.items.length === 0 ? (
        <EmptyState title="Todavía no tienes compras">
          <p>Cuando compres entradas, aquí verás el estado de cada compra.</p>
          <Link className="btn btn--primary" to="/">Ver la cartelera</Link>
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Evento</th>
                  <th scope="col">Sector</th>
                  <th scope="col" className="num">Entradas</th>
                  <th scope="col" className="num">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.data!.items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="table__title">{o.event?.title ?? 'Evento'}</span>
                      <span className="table__sub">
                        {o.event ? formatDateShort(o.event.startsAt) : ''} · comprado el {formatDateShort(o.createdAt)}
                      </span>
                    </td>
                    <td>{o.sector?.name ?? '—'}</td>
                    <td className="num">{o.quantity}</td>
                    <td className="num">{o.totalMinor !== null && o.currency ? formatMoney(o.totalMinor, o.currency) : '—'}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="table__actions">
                      <Link className="btn btn--ghost btn--sm" to={`/compras/${o.id}`}>Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.data!.meta.lastPage > 1 && (
            <nav className="my-orders__pagination" aria-label="Páginas de mis compras">
              <button className="btn btn--secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span>Página {orders.data!.meta.currentPage} de {orders.data!.meta.lastPage}</span>
              <button className="btn btn--secondary" type="button" disabled={page >= orders.data!.meta.lastPage} onClick={() => setPage(page + 1)}>Siguiente</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
