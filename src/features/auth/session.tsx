import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Role = 'customer' | 'organizer' | 'doorman';

interface SessionUser {
  id: string;
  role: Role;
  email: string;
  expiresAt: number;
}

interface SessionValue {
  token: string | null;
  user: SessionUser | null;
  signIn: (token: string) => boolean;
  signOut: () => void;
}

const STORAGE_KEY = 'entradasya.token';
const SessionContext = createContext<SessionValue | null>(null);
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Lee los claims para navegar y mostrar la sesión. Cada API verifica la firma y autoriza. */
function decode(token: string): SessionUser | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3 || segments.some((part) => !/^[\w-]+$/.test(part))) return null;
    const payload = atob(segments[1].replace(/-/g, '+').replace(/_/g, '/'));
    const { sub, role, email, exp } = JSON.parse(new TextDecoder().decode(Uint8Array.from(payload, (char) => char.charCodeAt(0))));
    if (typeof sub !== 'string' || !uuid.test(sub) || typeof email !== 'string' || !email) return null;
    if (role !== 'customer' && role !== 'organizer' && role !== 'doorman') return null;
    if (typeof exp !== 'number' || !Number.isSafeInteger(exp * 1000) || exp * 1000 <= Date.now()) return null;
    return { id: sub, role, email, expiresAt: exp * 1000 };
  } catch {
    return null;
  }
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(token: string | null) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión dura hasta recargar.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readStored);
  const user = useMemo(() => token ? decode(token) : null, [token]);

  const signIn = useCallback((next: string) => {
    if (!decode(next)) return false;
    writeStored(next);
    setToken(next);
    return true;
  }, []);

  const signOut = useCallback(() => {
    writeStored(null);
    setToken(null);
  }, []);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.storageArea === window.localStorage && (event.key === STORAGE_KEY || event.key === null)) {
        setToken(readStored());
      }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const expiresAt = user?.expiresAt;
  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function checkExpiry() {
      clearTimeout(timer);
      const remaining = (expiresAt ?? 0) - Date.now();
      if (remaining > 0) {
        timer = setTimeout(checkExpiry, Math.min(remaining, 2 ** 31 - 1));
      } else {
        if (readStored() === token) writeStored(null);
        setToken((current) => current === token ? null : current);
      }
    }
    checkExpiry();
    window.addEventListener('focus', checkExpiry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', checkExpiry);
    };
  }, [token, expiresAt]);

  const value = useMemo<SessionValue>(() => ({ token: user ? token : null, user, signIn, signOut }), [token, user, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return context;
}
