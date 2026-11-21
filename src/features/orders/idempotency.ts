/**
 * Idempotency-Key estable por compra: mientras el cuerpo sea el mismo (doble clic, timeout,
 * recarga de la página) se reutiliza la misma clave; si cambia la selección o el pago, es otra compra.
 * Se olvida al recibir la orden. sessionStorage puede fallar (modo privado): queda la copia en memoria.
 */
const STORAGE_KEY = 'entradasya.orders.checkout';
let memory: { fingerprint: string; key: string } | null = null;

function newKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function read(): { fingerprint: string; key: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : memory;
  } catch {
    return memory;
  }
}

export function checkoutKey(fingerprint: string): string {
  const saved = read();
  if (saved?.fingerprint === fingerprint) return saved.key;
  memory = { fingerprint, key: newKey() };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* sin almacenamiento: vale la copia en memoria */
  }
  return memory.key;
}

export function forgetCheckoutKey(): void {
  memory = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada que limpiar */
  }
}
