import { matchPath } from 'react-router-dom';
import type { Role } from './session';

export const roleLinks = {
  customer: [{ path: '/mis-compras', label: 'Mis compras' }, { path: '/mis-entradas', label: 'Mis entradas' }],
  organizer: [{ path: '/organizador/eventos', label: 'Mis eventos' }],
  doorman: [{ path: '/porteria', label: 'Portería' }],
};

const roleHome: Record<Role, string> = {
  customer: '/',
  organizer: '/organizador/eventos',
  doorman: '/porteria',
};

const privateRoutes: Record<Role, string[]> = {
  customer: ['/checkout', '/compras/:id'],
  organizer: ['/organizador', '/organizador/eventos/:id'],
  doorman: [],
};

export function afterLogin(role: Role, next: string | null): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\')) return roleHome[role];

  try {
    const url = new URL(next, window.location.origin);
    const allowedRoutes = ['/', '/eventos/:id', ...roleLinks[role].map((link) => link.path), ...privateRoutes[role]];
    if (url.origin === window.location.origin && allowedRoutes.some((route) => matchPath(route, url.pathname))) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    return roleHome[role];
  }
  return roleHome[role];
}
