import { api } from '../../shared/api';
import type { Role } from './session';

type Credentials = { email: string; password: string };
type AuthResponse = { token: string; user: { id: string; name: string; email: string; role: Role } };

export function login(body: Credentials) {
  return api<AuthResponse>('/api/auth/login', { method: 'POST', body });
}

export function register(body: Credentials & { name: string }) {
  return api<AuthResponse>('/api/auth/register', { method: 'POST', body });
}
