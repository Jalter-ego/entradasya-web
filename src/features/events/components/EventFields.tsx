import { isoToLocalInput, localInputToIso } from '../../../shared/format';
import type { EventInput } from '../api';
import { CATEGORIES, CITIES, categoryLabel } from '../catalog';
import { EventCoverField, isManagedCover } from './EventCoverField';

export interface EventFieldValues {
  title: string;
  description: string;
  venue: string;
  city: string;
  category: string;
  startsAt: string; // valor de datetime-local
  imageUrl: string;
}

export function toFieldValues(e?: EventInput): EventFieldValues {
  return {
    title: e?.title ?? '',
    description: e?.description ?? '',
    venue: e?.venue ?? '',
    city: e?.city ?? '',
    category: e?.category ?? '',
    startsAt: e ? isoToLocalInput(e.startsAt) : '',
    imageUrl: e?.imageUrl ?? '',
  };
}

export function toEventInput(v: EventFieldValues): EventInput {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    venue: v.venue.trim(),
    city: v.city,
    category: v.category,
    startsAt: localInputToIso(v.startsAt),
    imageUrl: v.imageUrl.trim() || null,
  };
}

/** Devuelve el mensaje de error de cada campo, o un objeto vacío si todo está bien. */
export function validateFields(
  v: EventFieldValues,
  { requireFutureDate = true }: { requireFutureDate?: boolean } = {},
): Partial<Record<keyof EventFieldValues, string>> {
  const errors: Partial<Record<keyof EventFieldValues, string>> = {};
  if (!v.title.trim()) errors.title = 'Escribe el nombre del evento.';
  if (!v.venue.trim()) errors.venue = 'Indica dónde se realiza.';
  if (!v.city) errors.city = 'Elige la ciudad.';
  if (!v.category) errors.category = 'Elige una categoría.';
  if (!v.startsAt) errors.startsAt = 'Elige la fecha y la hora.';
  else if (requireFutureDate && new Date(v.startsAt).getTime() <= Date.now()) errors.startsAt = 'La fecha debe ser futura.';
  if (v.imageUrl.trim() && !isManagedCover(v.imageUrl.trim()) && !/^https?:\/\/\S+$/i.test(v.imageUrl.trim())) {
    errors.imageUrl = 'Usa un enlace que empiece con http:// o https://';
  }
  return errors;
}

interface Props {
  values: EventFieldValues;
  errors: Partial<Record<keyof EventFieldValues, string>>;
  disabled?: boolean;
  onChange: (values: EventFieldValues) => void;
  coverFile: File | null;
  onCoverFileChange: (file: File | null) => void;
}

export function EventFields({ values, errors, disabled, onChange, coverFile, onCoverFileChange }: Props) {
  const set = (key: keyof EventFieldValues) => (e: { target: { value: string } }) =>
    onChange({ ...values, [key]: e.target.value });

  const field = (key: keyof EventFieldValues, label: string, input: JSX.Element, hint?: string) => (
    <label className={`field ${errors[key] ? 'field--invalid' : ''}`}>
      <span className="field__label">{label}</span>
      {input}
      {errors[key] ? (
        <span className="field__error">{errors[key]}</span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </label>
  );

  return (
    <fieldset className="fields" disabled={disabled}>
      {field(
        'title',
        'Nombre del evento',
        <input className="input" value={values.title} onChange={set('title')} maxLength={200} />,
      )}
      <div className="fields__row">
        {field(
          'startsAt',
          'Fecha y hora',
          <input className="input" type="datetime-local" value={values.startsAt} onChange={set('startsAt')} />,
        )}
        {field('venue', 'Lugar', <input className="input" value={values.venue} onChange={set('venue')} maxLength={200} />)}
      </div>
      <div className="fields__row">
        {field(
          'city',
          'Ciudad',
          <select className="input" value={values.city} onChange={set('city')}>
            <option value="" disabled>
              Elige una ciudad
            </option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>,
        )}
        {field(
          'category',
          'Categoría',
          <select className="input" value={values.category} onChange={set('category')}>
            <option value="" disabled>
              Elige una categoría
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>,
        )}
      </div>
      <EventCoverField imageUrl={values.imageUrl} file={coverFile} onFileChange={onCoverFileChange}
        error={errors.imageUrl} onUrlChange={(imageUrl) => onChange({ ...values, imageUrl })} />
      {field(
        'description',
        'Descripción',
        <textarea className="input" rows={5} value={values.description} onChange={set('description')} maxLength={5000} />,
        'Opcional. Deja una línea en blanco para separar párrafos.',
      )}
    </fieldset>
  );
}
