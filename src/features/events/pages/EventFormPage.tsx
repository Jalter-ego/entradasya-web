import '../events.css';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api';
import { useSession } from '../../../shared/session';
import { ErrorState, Spinner } from '../../../shared/States';
import { useAsync } from '../../../shared/useAsync';
import { eventsApi, type EventInput, type EventItem } from '../api';
import {
  EventFields,
  toEventInput,
  toFieldValues,
  validateFields,
  type EventFieldValues,
} from '../components/EventFields';
import { SalesPanel } from '../components/SalesPanel';
import {
  DraftSectors,
  LiveSectors,
  describeError,
  emptyDraft,
  parseDraft,
  type RunAction,
  type SectorDraft,
} from '../components/SectorsEditor';
import { StatusBadge } from '../components/StatusBadge';
import { coverFileError } from '../components/EventCoverField';

type Flash = { kind: 'ok' | 'error'; text: string } | null;

export function EventFormPage() {
  const { id } = useParams();
  return id ? <EditEvent id={id} /> : <CreateEvent />;
}

// ------------------------------------------------------------------ crear

function CreateEvent() {
  const { token } = useSession();
  const navigate = useNavigate();
  const [values, setValues] = useState<EventFieldValues>(toFieldValues());
  const [drafts, setDrafts] = useState<SectorDraft[]>([emptyDraft()]);
  const [errors, setErrors] = useState<ReturnType<typeof validateFields>>({});
  const [flash, setFlash] = useState<Flash>(null);
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fieldErrors = validateFields(coverFile ? { ...values, imageUrl: '' } : values);
    const imageError = coverFileError(coverFile);
    if (imageError) fieldErrors.imageUrl = imageError;
    setErrors(fieldErrors);
    const parsed = drafts.map(parseDraft);
    const sectorError = parsed.find((p) => p.error)?.error;
    const names = parsed.map((p) => p.value?.name.toLowerCase());
    const duplicated = new Set(names).size !== names.length;

    if (Object.keys(fieldErrors).length || sectorError || duplicated) {
      setFlash({
        kind: 'error',
        text: sectorError ?? (duplicated ? 'Cada sector debe tener un nombre distinto.' : 'Revisa los campos marcados.'),
      });
      return;
    }

    setSaving(true);
    setFlash(null);
    try {
      const created = await eventsApi.create(token, {
        ...toEventInput(values),
        ...(coverFile ? { imageUrl: null } : {}),
        sectors: parsed.map((p) => p.value!),
      });
      if (coverFile) {
        setUploading(true);
        try {
          await eventsApi.uploadCover(token, created.id, coverFile);
        } catch (err) {
          navigate(`/organizador/eventos/${created.id}`, { state: {
            created: true,
            coverError: `El borrador se guardó, pero no se pudo subir la portada: ${describeError(err)} Vuelve a seleccionar el archivo y guarda los cambios.`,
          } });
          return;
        }
      }
      navigate(`/organizador/eventos/${created.id}`, { state: { created: true } });
    } catch (err) {
      setFlash({ kind: 'error', text: describeError(err) });
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <section className="page page--medium">
      <Link to="/organizador/eventos" className="back-link">
        Volver a mis eventos
      </Link>
      <h1>Crear evento</h1>
      <p className="muted">El evento se guarda como borrador. Nadie lo ve hasta que lo publiques.</p>

      <form onSubmit={submit} className="form-stack" noValidate>
        <div className="panel">
          <h2 className="panel__title">Datos del evento</h2>
          <EventFields values={values} errors={errors} disabled={saving} onChange={setValues}
            coverFile={coverFile} onCoverFileChange={setCoverFile} />
        </div>
        <div className="panel">
          <h2 className="panel__title">Sectores y precios</h2>
          <DraftSectors drafts={drafts} currency="" onChange={setDrafts} />
        </div>
        {flash && (
          <p className={`flash flash--${flash.kind}`} role="alert">
            {flash.text}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
            {uploading ? 'Subiendo portada…' : saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    </section>
  );
}

// ------------------------------------------------------------------ editar

function EditEvent({ id }: { id: string }) {
  const { token, user } = useSession();
  const event = useAsync((signal) => eventsApi.get(id, token, signal), [id, token]);

  if (event.status === 'error') {
    const notFound = event.error instanceof ApiError && event.error.status === 404;
    return (
      <section className="page page--narrow notice">
        {notFound ? <h1>No encontramos este evento</h1> : <ErrorState message={event.error.message} onRetry={event.reload} />}
        <Link to="/organizador/eventos" className="btn btn--secondary">
          Volver a mis eventos
        </Link>
      </section>
    );
  }
  if (!event.data) return <Spinner label="Cargando evento" />;
  if (event.data.organizerId !== user?.id) {
    return (
      <section className="page page--narrow notice">
        <h1>Este evento pertenece a otro organizador</h1>
        <Link to="/organizador/eventos" className="btn btn--secondary">
          Volver a mis eventos
        </Link>
      </section>
    );
  }
  return <EditEventForm key={event.data.id} initial={event.data} token={token} />;
}

function EditEventForm({ initial, token }: { initial: EventItem; token: string | null }) {
  const locationState = useLocation().state as { created?: boolean; coverError?: string } | null;
  const justCreated = locationState?.created === true;
  const [event, setEvent] = useState(initial);
  const [values, setValues] = useState(toFieldValues(initial));
  const [errors, setErrors] = useState<ReturnType<typeof validateFields>>({});
  const [flash, setFlash] = useState<Flash>(
    locationState?.coverError ? { kind: 'error', text: locationState.coverError } :
      justCreated ? { kind: 'ok', text: 'Borrador guardado. Revisa los sectores y publícalo cuando esté listo.' } : null,
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = event.status === 'cancelled';

  const run: RunAction = async (successText, action) => {
    setBusy(true);
    setFlash(null);
    try {
      const updated = await action();
      setEvent(updated);
      setFlash({ kind: 'ok', text: successText });
      return true;
    } catch (err) {
      setFlash({ kind: 'error', text: describeError(err) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    // La fecha solo se valida (y se envía) si el organizador la cambió: así se puede
    // corregir el título de un evento cuya fecha ya pasó.
    const dateChanged = values.startsAt !== toFieldValues(event).startsAt;
    const fieldErrors = validateFields(coverFile ? { ...values, imageUrl: '' } : values, { requireFutureDate: dateChanged });
    const imageError = coverFileError(coverFile);
    if (imageError) fieldErrors.imageUrl = imageError;
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    const next = toEventInput(values);
    const patch: Partial<EventInput> = {};
    (Object.keys(next) as (keyof EventInput)[]).forEach((k) => {
      if (k === 'startsAt' && !dateChanged) return;
      if (k === 'imageUrl' && coverFile) return;
      if (next[k] !== event[k]) (patch as Record<string, unknown>)[k] = next[k];
    });
    if (Object.keys(patch).length === 0 && !coverFile) {
      setFlash({ kind: 'ok', text: 'No hay cambios para guardar.' });
      return;
    }
    const ok = await run('Cambios guardados.', async () => {
      let updated = event;
      if (Object.keys(patch).length) {
        updated = await eventsApi.update(token, event.id, patch);
        setEvent(updated);
      }
      if (coverFile) {
        try { updated = await eventsApi.uploadCover(token, event.id, coverFile); }
        catch (err) {
          throw new Error(`No se pudo subir la portada: ${describeError(err)} ${Object.keys(patch).length ? 'Los demás datos ya se guardaron. ' : ''}Puedes reintentar con Guardar cambios.`);
        }
        setCoverFile(null);
        setValues((previous) => ({ ...previous, imageUrl: updated.imageUrl ?? '' }));
      }
      return updated;
    });
    if (ok) setErrors({});
  }

  function cancelEvent() {
    if (!window.confirm(`¿Cancelar "${event.title}"? Ya no se podrán comprar entradas y no se puede deshacer.`)) return;
    run('Evento cancelado.', () => eventsApi.cancel(token, event.id));
  }

  return (
    <section className="page page--medium">
      <Link to="/organizador/eventos" className="back-link">
        Volver a mis eventos
      </Link>

      <div className="page-head">
        <div>
          <StatusBadge status={event.status} />
          <h1>{event.title}</h1>
        </div>
        <div className="page-head__actions">
          {event.status === 'published' && (
            <Link to={`/eventos/${event.id}`} className="btn btn--secondary">
              Ver como público
            </Link>
          )}
          {event.status === 'draft' && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => run('Evento publicado. Ya aparece en la cartelera.', () => eventsApi.publish(token, event.id))}
            >
              Publicar
            </button>
          )}
          {!locked && (
            <button type="button" className="btn btn--danger-ghost" disabled={busy} onClick={cancelEvent}>
              Cancelar evento
            </button>
          )}
        </div>
      </div>

      {flash && (
        <p className={`flash flash--${flash.kind}`} role={flash.kind === 'error' ? 'alert' : 'status'}>
          {flash.text}
        </p>
      )}

      <div className="form-stack">
        {event.status !== 'draft' && <SalesPanel event={event} token={token} />}

        <form className="panel" onSubmit={saveDetails} noValidate>
          <h2 className="panel__title">Datos del evento</h2>
          <EventFields values={values} errors={errors} disabled={busy || locked} onChange={setValues}
            coverFile={coverFile} onCoverFileChange={setCoverFile} />
          {!locked && (
            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </form>

        <div className="panel">
          <h2 className="panel__title">Sectores y precios</h2>
          <p className="muted">
            Si cambias un precio, las compras ya hechas conservan el precio anterior.
          </p>
          <LiveSectors event={event} token={token} run={run} />
        </div>
      </div>
    </section>
  );
}
