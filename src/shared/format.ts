const LOCALE = 'es-BO';

/** Importe en unidades menores -> texto con moneda (5000, BOB -> "Bs 50,00"). */
export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(minor / 100);
}

/** Texto del formulario ("50,5" o "50.5") -> unidades menores (5050). NaN si no es válido. */
export function parseMoney(text: string): number {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100);
}

export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function dayAndMonth(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    month: new Intl.DateTimeFormat(LOCALE, { month: 'short' }).format(d).replace('.', ''),
    weekday: new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(d).replace('.', ''),
  };
}

/** ISO (UTC) -> valor para <input type="datetime-local"> en hora local. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> (hora local) -> ISO en UTC. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}
