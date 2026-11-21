import { useEffect, useRef, useState } from 'react';
import { formatDateLong, formatMoney, formatTime } from '../../../shared/format';
import { fetchTicketPdf, ticketErrorMessage, type Ticket } from '../api';

export function OwnedTicketCard({ ticket, token }: { ticket: Ticket; token: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function download() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setDownloading(true);
    setError(null);
    try {
      const blob = await fetchTicketPdf(ticket.id, token, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `entrada-${ticket.id}.pdf`;
      try {
        document.body.append(link);
        link.click();
      } finally {
        link.remove();
        // Dejar que el navegador inicie la descarga antes de liberar el blob.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(ticketErrorMessage(err));
    } finally {
      if (!controller.signal.aborted) setDownloading(false);
      if (request.current === controller) request.current = null;
    }
  }

  return (
    <article className="owned-ticket" aria-labelledby={`ticket-${ticket.id}`}>
      <div className="owned-ticket__heading">
        <span className="owned-ticket__number">Entrada {ticket.ticketNumber} de {ticket.quantity}</span>
        <span className="owned-ticket__issued">Emitida</span>
      </div>
      <h2 id={`ticket-${ticket.id}`}>{ticket.event.title}</h2>
      <time className="owned-ticket__date" dateTime={ticket.event.startsAt}>
        {formatDateLong(ticket.event.startsAt)} · {formatTime(ticket.event.startsAt)} h
      </time>
      <dl className="owned-ticket__facts">
        <div><dt>Lugar</dt><dd>{ticket.event.venue}</dd></div>
        <div><dt>Sector</dt><dd>{ticket.sector.name}</dd></div>
        <div><dt>Precio por entrada</dt><dd>{formatMoney(ticket.unitPriceMinor, ticket.currency)}</dd></div>
      </dl>
      <details className="owned-ticket__details">
        <summary>Ver código y referencia de compra</summary>
        <dl>
          <div><dt>Código de entrada</dt><dd><code>{ticket.code}</code></dd></div>
          <div><dt>Compra</dt><dd><code>{ticket.orderId}</code></dd></div>
        </dl>
      </details>
      <div className="owned-ticket__download">
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={downloading}
          aria-label={`Descargar PDF de ${ticket.event.title}, entrada ${ticket.ticketNumber} de ${ticket.quantity}`}
          aria-busy={downloading}
          onClick={download}
        >
          {downloading ? 'Preparando PDF…' : error ? 'Reintentar descarga' : 'Descargar PDF'}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </article>
  );
}
