import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { formatDateShort, formatTime } from '../../../shared/format';
import { useSession } from '../../../shared/session';
import { EmptyState, ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { eventsApi, type EventItem } from '../../events/api';
import {
  CheckinApiError,
  getEventCheckinCount,
  listRecentCheckins,
  registerCheckin,
  type CheckinRecord,
} from '../api';
import { CameraScanner, isCameraScannerSupported } from '../components/CameraScanner';
import '../checkin.css';

type ScanOutcome =
  | {
      kind: 'authorized';
      title: string;
      message: string;
      ticketId: string;
      at: string;
      code: string;
    }
  | {
      kind: 'already_used';
      title: string;
      message: string;
      firstEntryAt?: string;
      code: string;
    }
  | {
      kind: 'wrong_event';
      title: string;
      message: string;
      code: string;
    }
  | {
      kind: 'invalid' | 'error';
      title: string;
      message: string;
      code: string;
    };

function formatLocalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const seconds = new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${formatDateShort(iso)} a las ${seconds}`;
}

export function CheckinPage() {
  const { token, user } = useSession();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<
    { id: string; code: string; status: 'ok' | 'rejected'; label: string; time: string }[]
  >([]);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const eventsState = useAsync((signal) => eventsApi.listPublished(signal), []);

  useEffect(() => {
    if (eventsState.status === 'success' && eventsState.data.length > 0 && !selectedEventId) {
      setSelectedEventId(eventsState.data[0].id);
    }
  }, [eventsState.status, eventsState.data, selectedEventId]);

  const countState = useAsync(
    (signal) => {
      if (!token || !selectedEventId) return Promise.resolve({ eventId: '', count: 0 });
      return getEventCheckinCount(token, selectedEventId, signal);
    },
    [token, selectedEventId],
  );

  const recentState = useAsync(
    (signal) => {
      if (!token || !selectedEventId) return Promise.resolve({ eventId: '', items: [] as CheckinRecord[] });
      return listRecentCheckins(token, selectedEventId, 10, signal);
    },
    [token, selectedEventId],
  );

  useEffect(() => {
    if (selectedEventId) {
      setOutcome(null);
      setSessionHistory([]);
      codeInputRef.current?.focus();
    }
  }, [selectedEventId]);

  const submitCode = useCallback(
    async (rawCode: string) => {
      if (!token || !selectedEventId || submitting) return;
      const cleanCode = rawCode.trim();
      if (!cleanCode) {
        setOutcome({
          kind: 'invalid',
          title: 'Código requerido',
          message: 'Escanea el código QR o escribe el código de la entrada.',
          code: '',
        });
        codeInputRef.current?.focus();
        return;
      }

      setSubmitting(true);
      try {
        const res = await registerCheckin(token, { code: cleanCode, eventId: selectedEventId });
        countState.setData({ eventId: selectedEventId, count: res.eventCount });
        recentState.reload();
        setOutcome({
          kind: 'authorized',
          title: 'Ingreso autorizado',
          message: `Entrada registrada correctamente (${formatLocalDateTime(res.checkin.checkedInAt)}).`,
          ticketId: res.checkin.ticketId,
          at: res.checkin.checkedInAt,
          code: cleanCode,
        });
        setSessionHistory((prev) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            code: cleanCode,
            status: 'ok',
            label: 'Autorizado',
            time: formatTime(res.checkin.checkedInAt),
          },
          ...prev.slice(0, 9),
        ]);
        setCode('');
      } catch (err) {
        let nextOutcome: ScanOutcome;
        let historyLabel = 'Rechazado';

        if (err instanceof CheckinApiError) {
          if (err.code === 'ALREADY_USED') {
            const firstAt = err.details?.checkedInAt;
            nextOutcome = {
              kind: 'already_used',
              title: 'Entrada ya utilizada',
              message: firstAt
                ? `Este QR ya registró un ingreso el ${formatLocalDateTime(firstAt)}.`
                : err.message,
              firstEntryAt: firstAt,
              code: cleanCode,
            };
            historyLabel = 'Ya utilizada';
          } else if (err.code === 'WRONG_EVENT') {
            nextOutcome = {
              kind: 'wrong_event',
              title: 'Evento incorrecto',
              message: 'La entrada es válida, pero pertenece a otro evento.',
              code: cleanCode,
            };
            historyLabel = 'Otro evento';
          } else if (err.code === 'INVALID_TICKET') {
            nextOutcome = {
              kind: 'invalid',
              title: 'Entrada inválida',
              message: 'No existe ninguna entrada emitida con ese código.',
              code: cleanCode,
            };
            historyLabel = 'Inválida';
          } else {
            nextOutcome = {
              kind: 'error',
              title: 'No se pudo validar',
              message: err.message,
              code: cleanCode,
            };
            historyLabel = err.code;
          }
        } else {
          nextOutcome = {
            kind: 'error',
            title: 'Error inesperado',
            message: 'No se pudo completar la validación. Intenta nuevamente.',
            code: cleanCode,
          };
        }

        setOutcome(nextOutcome);
        setSessionHistory((prev) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            code: cleanCode,
            status: 'rejected',
            label: historyLabel,
            time: formatTime(new Date().toISOString()),
          },
          ...prev.slice(0, 9),
        ]);
        setCode('');
      } finally {
        setSubmitting(false);
        window.setTimeout(() => codeInputRef.current?.focus(), 0);
      }
    },
    [token, selectedEventId, submitting, countState, recentState],
  );

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void submitCode(code);
  }

  if (!token || !user) return null;

  const events: EventItem[] = eventsState.status === 'success' ? eventsState.data : [];
  const selectedEvent = events.find((ev) => ev.id === selectedEventId) ?? null;

  return (
    <section className="page page--wide checkin-page" aria-labelledby="checkin-title">
      <div className="page-head">
        <div>
          <h1 id="checkin-title">Portería</h1>
          <p className="muted">
            Selecciona el evento y escanea o ingresa el código de cada entrada. Cada QR permite un único ingreso.
          </p>
        </div>
      </div>

      {eventsState.status === 'loading' && <Spinner label="Cargando eventos disponibles" />}
      {eventsState.status === 'error' && (
        <ErrorState
          message="No se pudieron cargar los eventos publicados. Verifica que el servicio events esté activo."
          onRetry={eventsState.reload}
        />
      )}

      {eventsState.status === 'success' && events.length === 0 && (
        <EmptyState title="No hay eventos publicados">
          <p>Cuando un organizador publique un evento, podrás seleccionarlo aquí para controlar el ingreso.</p>
        </EmptyState>
      )}

      {eventsState.status === 'success' && events.length > 0 && (
        <div className="checkin-layout">
          <div className="checkin-main">
            <div className="panel checkin-event-bar">
              <label className="field">
                <span className="field__label">Evento en puerta</span>
                <select
                  className="input"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} — {formatDateShort(ev.startsAt)} ({ev.venue})
                    </option>
                  ))}
                </select>
              </label>

              {selectedEvent && (
                <p className="checkin-event-meta muted">
                  <strong>{selectedEvent.venue}</strong> · {selectedEvent.city} ·{' '}
                  {formatDateShort(selectedEvent.startsAt)} {formatTime(selectedEvent.startsAt)}
                </p>
              )}
            </div>

            <form className="panel checkin-scanner" onSubmit={handleFormSubmit} noValidate>
              <div className="checkin-scanner__header">
                <h2>Validar entrada</h2>
                {isCameraScannerSupported() && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setCameraOpen((v) => !v)}
                  >
                    {cameraOpen ? 'Ocultar cámara' : 'Usar cámara'}
                  </button>
                )}
              </div>

              <CameraScanner
                active={cameraOpen}
                onDetected={(scanned) => {
                  setCode(scanned);
                  void submitCode(scanned);
                }}
                onClose={() => setCameraOpen(false)}
              />

              <label className="field">
                <span className="field__label">Código QR / código de entrada</span>
                <span className="field__hint">
                  Listo para lector USB (actúa como teclado + Enter) o escritura manual.
                </span>
                <div className="checkin-input-row">
                  <input
                    ref={codeInputRef}
                    className="input checkin-code-input"
                    type="text"
                    autoComplete="off"
                    autoFocus
                    placeholder="Escanea o pega el código aquí..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={submitting}
                  />
                  <button type="submit" className="btn btn--primary btn--lg" disabled={submitting || !selectedEventId}>
                    {submitting ? 'Validando…' : 'Registrar ingreso'}
                  </button>
                </div>
              </label>
            </form>

            {outcome && (
              <div
                className={`checkin-result checkin-result--${outcome.kind}`}
                role="status"
                aria-live="polite"
              >
                <div className="checkin-result__badge">
                  {outcome.kind === 'authorized' ? 'APROBADO' : outcome.kind === 'wrong_event' ? 'OTRO EVENTO' : 'RECHAZADO'}
                </div>
                <h2>{outcome.title}</h2>
                <p className="checkin-result__message">{outcome.message}</p>
                {outcome.kind === 'already_used' && outcome.firstEntryAt && (
                  <p className="checkin-result__highlight">
                    Primer ingreso registrado: <strong>{formatLocalDateTime(outcome.firstEntryAt)}</strong>
                  </p>
                )}
                {outcome.kind === 'authorized' && (
                  <p className="checkin-result__meta">
                    Ticket: <code>{outcome.ticketId}</code>
                  </p>
                )}
                {outcome.code && (
                  <p className="checkin-result__meta">
                    Código leído: <code>{outcome.code}</code>
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className="checkin-sidebar">
            <div className="panel checkin-counter">
              <div className="checkin-counter__head">
                <span className="field__label">Ingresos registrados</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    countState.reload();
                    recentState.reload();
                  }}
                >
                  Actualizar
                </button>
              </div>
              {countState.status === 'loading' && countState.data === undefined ? (
                <p className="muted">Consultando…</p>
              ) : countState.status === 'error' ? (
                <p className="form-error">No se pudo leer el conteo</p>
              ) : (
                <p className="checkin-counter__value" aria-live="polite">
                  {countState.data?.count ?? 0}
                </p>
              )}
              <p className="muted checkin-counter__hint">Total confirmado en base de datos para este evento.</p>
            </div>

            <div className="panel checkin-history">
              <h3>Últimos escaneos (sesión)</h3>
              {sessionHistory.length === 0 ? (
                <p className="muted">Todavía no escaneaste entradas en esta sesión.</p>
              ) : (
                <ul className="checkin-history__list">
                  {sessionHistory.map((item) => (
                    <li key={item.id} className={`checkin-history__item checkin-history__item--${item.status}`}>
                      <div>
                        <strong>{item.label}</strong>
                        <code title={item.code}>{item.code.slice(0, 14)}{item.code.length > 14 ? '…' : ''}</code>
                      </div>
                      <span className="muted">{item.time}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {recentState.status === 'success' && recentState.data.items.length > 0 && (
              <div className="panel checkin-history">
                <h3>Últimos ingresos en puerta</h3>
                <ul className="checkin-history__list">
                  {recentState.data.items.map((rec) => (
                    <li key={rec.id} className="checkin-history__item checkin-history__item--ok">
                      <div>
                        <strong>Ticket</strong>
                        <code>{rec.ticketId.slice(0, 8)}…</code>
                      </div>
                      <span className="muted">{formatTime(rec.checkedInAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
