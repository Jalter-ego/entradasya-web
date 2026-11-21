import { ApiError } from '../../../shared/api';
import { formatMoney } from '../../../shared/format';
import { useAsync } from '../../../shared/useAsync';
import { eventsApi, totals, type EventItem } from '../api';

/**
 * Ventas e ingresos del evento. Los datos vienen del reporte de orders (P3), nunca de su base.
 * Mientras orders no exista, muestra los cupos reservados que conoce events.
 */
export function SalesPanel({ event, token }: { event: EventItem; token: string | null }) {
  const report = useAsync((signal) => eventsApi.salesReport(token, event.id, event.currency, signal), [event.id, token]);
  const { capacity, committed } = totals(event);

  const unavailable =
    report.status === 'error' &&
    (!(report.error instanceof ApiError) || report.error.status === 0 || report.error.status === 404 || report.error.status >= 500);

  return (
    <section className="panel" aria-labelledby="sales-title">
      <h2 id="sales-title" className="panel__title">
        Ventas
      </h2>

      {report.status === 'success' ? (
        <>
          <dl className="stats">
            <div>
              <dt>Ingresos</dt>
              <dd className="stats__big">{formatMoney(report.data.revenueMinor, report.data.currency)}</dd>
            </div>
            <div>
              <dt>Entradas vendidas</dt>
              <dd className="stats__big">
                {report.data.ticketsSold}
                <small> de {capacity}</small>
              </dd>
            </div>
            <div>
              <dt>Compras pagadas</dt>
              <dd className="stats__big">{report.data.paidOrders}</dd>
            </div>
          </dl>
          {report.data.bySector && report.data.bySector.length > 0 && (
            <table className="table table--compact">
              <thead>
                <tr>
                  <th scope="col">Sector</th>
                  <th scope="col" className="num">
                    Vendidas
                  </th>
                  <th scope="col" className="num">
                    Ingresos
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.data.bySector.map((row) => (
                  <tr key={row.sectorId}>
                    <td>{row.sectorName ?? event.sectors.find((s) => s.id === row.sectorId)?.name ?? 'Sector'}</td>
                    <td className="num">{row.ticketsSold}</td>
                    <td className="num">{formatMoney(row.revenueMinor, report.data.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : report.status === 'loading' ? (
        <p className="muted">Cargando el reporte de ventas…</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>Lugares reservados</dt>
              <dd className="stats__big">
                {committed}
                <small> de {capacity}</small>
              </dd>
            </div>
          </dl>
          <p className="muted">
            {unavailable
              ? 'Los ingresos y las compras pagadas aparecerán cuando el servicio de órdenes esté disponible. Los lugares reservados incluyen compras que todavía se están procesando.'
              : report.error.message}
          </p>
        </>
      )}
    </section>
  );
}
