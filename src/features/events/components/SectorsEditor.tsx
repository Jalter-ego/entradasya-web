import { useState } from 'react';
import { ApiError } from '../../../shared/api';
import { formatMoney, minorToInput, parseMoney } from '../../../shared/format';
import { errorMessage, eventsApi, type EventItem, type Sector, type SectorInput } from '../api';

export interface SectorDraft {
  key: string;
  name: string;
  price: string;
  capacity: string;
}

export const emptyDraft = (): SectorDraft => ({ key: crypto.randomUUID(), name: '', price: '', capacity: '' });

/** Valida una fila y devuelve el sector listo para la API, o el mensaje de error. */
export function parseDraft(d: SectorDraft): { value?: SectorInput; error?: string } {
  const name = d.name.trim();
  const priceMinor = parseMoney(d.price);
  const capacity = Number(d.capacity);
  if (!name) return { error: 'Escribe el nombre del sector.' };
  if (Number.isNaN(priceMinor)) return { error: 'El precio debe ser un número, por ejemplo 50 o 50,50.' };
  if (!Number.isInteger(capacity) || capacity < 1) return { error: 'La capacidad debe ser un número entero mayor que 0.' };
  return { value: { name, priceMinor, capacity } };
}

function SectorRowInputs({
  draft,
  currency,
  disabled,
  onChange,
}: {
  draft: SectorDraft;
  currency: string;
  disabled?: boolean;
  onChange: (d: SectorDraft) => void;
}) {
  return (
    <>
      <label className="field">
        <span className="field__label">Sector</span>
        <input
          className="input"
          value={draft.name}
          disabled={disabled}
          placeholder="Platea"
          maxLength={100}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field__label">{currency ? `Precio (${currency})` : "Precio"}</span>
        <input
          className="input"
          inputMode="decimal"
          value={draft.price}
          disabled={disabled}
          placeholder="50.00"
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field__label">Capacidad</span>
        <input
          className="input"
          type="number"
          min={1}
          step={1}
          value={draft.capacity}
          disabled={disabled}
          placeholder="100"
          onChange={(e) => onChange({ ...draft, capacity: e.target.value })}
        />
      </label>
    </>
  );
}

/** Sectores de un evento nuevo: se envían todos juntos al crear el evento. */
export function DraftSectors({
  drafts,
  currency,
  onChange,
}: {
  drafts: SectorDraft[];
  currency: string;
  onChange: (d: SectorDraft[]) => void;
}) {
  return (
    <div className="sector-list">
      {drafts.map((d, i) => (
        <div key={d.key} className="sector-row">
          <SectorRowInputs
            draft={d}
            currency={currency}
            onChange={(next) => onChange(drafts.map((x, j) => (j === i ? next : x)))}
          />
          <button
            type="button"
            className="btn btn--danger-ghost btn--sm sector-row__action"
            onClick={() => onChange(drafts.filter((_, j) => j !== i))}
          >
            Quitar
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--secondary" onClick={() => onChange([...drafts, emptyDraft()])}>
        Agregar sector
      </button>
    </div>
  );
}

/** Ejecuta una acción sobre el evento y muestra el resultado. Devuelve true si salió bien. */
export type RunAction = (successText: string, action: () => Promise<EventItem>) => Promise<boolean>;

export function describeError(err: unknown): string {
  if (err instanceof ApiError) return errorMessage(err.code, err.message);
  return 'No se pudo completar la acción.';
}

/** Sectores de un evento existente: cada cambio se guarda en el servidor. */
export function LiveSectors({ event, token, run }: { event: EventItem; token: string | null; run: RunAction }) {
  const locked = event.status === 'cancelled';
  const [newDraft, setNewDraft] = useState<SectorDraft | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function addSector() {
    if (!newDraft) return;
    const { value, error } = parseDraft(newDraft);
    if (!value) return setRowError(error!);
    setRowError(null);
    if (await run('Sector agregado.', () => eventsApi.addSector(token, event.id, value))) setNewDraft(null);
  }

  return (
    <div className="sector-list">
      {event.sectors.length === 0 && <p className="muted">Este evento todavía no tiene sectores.</p>}
      {event.sectors.map((s) => (
        // La key incluye los datos guardados: tras guardar, la fila se reinicia con los valores nuevos.
        <LiveSectorRow
          key={`${s.id}:${s.name}:${s.priceMinor}:${s.capacity}`}
          sector={s}
          event={event}
          token={token}
          locked={locked}
          run={run}
        />
      ))}

      {newDraft ? (
        <div className="sector-row sector-row--new">
          <SectorRowInputs draft={newDraft} currency={event.currency} onChange={setNewDraft} />
          <div className="sector-row__action sector-row__buttons">
            <button type="button" className="btn btn--primary btn--sm" onClick={addSector}>
              Guardar sector
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setNewDraft(null)}>
              Descartar
            </button>
          </div>
          {rowError && (
            <p className="form-error sector-row__error" role="alert">
              {rowError}
            </p>
          )}
        </div>
      ) : (
        !locked && (
          <button type="button" className="btn btn--secondary" onClick={() => setNewDraft(emptyDraft())}>
            Agregar sector
          </button>
        )
      )}
    </div>
  );
}

function LiveSectorRow({
  sector,
  event,
  token,
  locked,
  run,
}: {
  sector: Sector;
  event: EventItem;
  token: string | null;
  locked: boolean;
  run: RunAction;
}) {
  const original: SectorDraft = {
    key: sector.id,
    name: sector.name,
    price: minorToInput(sector.priceMinor),
    capacity: String(sector.capacity),
  };
  const [draft, setDraft] = useState(original);
  const [error, setError] = useState<string | null>(null);
  const committed = sector.capacity - sector.available;
  const dirty = draft.name !== original.name || draft.price !== original.price || draft.capacity !== original.capacity;

  async function save() {
    const { value, error: invalid } = parseDraft(draft);
    if (!value) return setError(invalid!);
    if (value.capacity < committed) {
      return setError(`La capacidad no puede ser menor a ${committed}: ya hay entradas reservadas.`);
    }
    setError(null);
    const patch: Partial<SectorInput> = {};
    if (value.name !== sector.name) patch.name = value.name;
    if (value.priceMinor !== sector.priceMinor) patch.priceMinor = value.priceMinor;
    if (value.capacity !== sector.capacity) patch.capacity = value.capacity;
    await run('Sector actualizado.', () => eventsApi.updateSector(token, event.id, sector.id, patch));
  }

  async function remove() {
    if (!window.confirm(`¿Borrar el sector "${sector.name}"?`)) return;
    await run('Sector borrado.', () => eventsApi.deleteSector(token, event.id, sector.id));
  }

  return (
    <div className="sector-row">
      <SectorRowInputs draft={draft} currency={event.currency} disabled={locked} onChange={setDraft} />
      <div className="sector-row__action sector-row__buttons">
        {dirty ? (
          <>
            <button type="button" className="btn btn--primary btn--sm" onClick={save}>
              Guardar
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDraft(original)}>
              Deshacer
            </button>
          </>
        ) : (
          !locked && (
            <button
              type="button"
              className="btn btn--danger-ghost btn--sm"
              onClick={remove}
              disabled={committed > 0}
              title={committed > 0 ? 'Tiene entradas reservadas' : undefined}
            >
              Borrar
            </button>
          )
        )}
      </div>
      <p className="sector-row__meta">
        {committed > 0
          ? `${committed} reservadas de ${sector.capacity}; quedan ${sector.available}.`
          : `Sin reservas todavía. Precio actual: ${formatMoney(sector.priceMinor, event.currency)}.`}
      </p>
      {error && (
        <p className="form-error sector-row__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
