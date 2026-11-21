import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../shared/api';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from '../../shared/icons';
import { login, register } from './api';
import { afterLogin } from './navigation';
import { useSession } from './session';
import './login.css';

export function LoginPage() {
  const { signIn, user } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function changeMode(registerMode: boolean) {
    setRegistering(registerMode);
    setShowPassword(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const credentials = { email: String(fields.get('email')).trim(), password: String(fields.get('password')) };
    setSending(true);
    setError(null);
    try {
      const response = registering
        ? await register({ ...credentials, name: String(fields.get('name')).trim() })
        : await login(credentials);
      if (!signIn(response.token)) throw new Error('Token inválido');
      navigate(afterLogin(response.user.role, next), { replace: true });
    } catch (problem) {
      if (problem instanceof ApiError && problem.status > 0 && problem.status < 500 && problem.status !== 404) {
        setError(problem.message);
      } else {
        setError('El servicio de cuentas no está disponible. Intenta más tarde.');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__glow" aria-hidden="true" />
      <Link to="/" className="auth__brand" aria-label="EntradasYa, volver a la cartelera">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M4 8h24v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z" />
        </svg>
        EntradasYa
      </Link>

      <main className="auth__card">
        <div className="auth__tabs" role="group" aria-label="Acceso">
          <button type="button" aria-pressed={!registering} disabled={sending} onClick={() => changeMode(false)}>
            Iniciar sesión
          </button>
          <button type="button" aria-pressed={registering} disabled={sending} onClick={() => changeMode(true)}>
            Registrarse
          </button>
        </div>

        {user && (
          <p className="auth__notice">
            Ya iniciaste sesión como <strong>{user.email}</strong>.{' '}
            <Link to={afterLogin(user.role, next)}>Continuar</Link>
          </p>
        )}

        <form key={String(registering)} onSubmit={submit} className="auth__form">
          {registering && (
            <label className="field">
              <span className="field__label">Nombre</span>
              <div className="input-icon">
                <UserIcon />
                <input className="input" name="name" autoComplete="name" placeholder="Tu nombre" required maxLength={120} />
              </div>
            </label>
          )}
          <label className="field">
            <span className="field__label">Correo</span>
            <div className="input-icon">
              <MailIcon />
              <input className="input" name="email" type="email" autoComplete="username" placeholder="tu@correo.com" required maxLength={254} />
            </div>
          </label>
          <label className="field">
            <span className="field__label">Contraseña</span>
            <div className="input-icon">
              <LockIcon />
              <input
                className="input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={registering ? 'new-password' : 'current-password'}
                placeholder={registering ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                minLength={registering ? 8 : undefined}
                maxLength={128}
                required
              />
              <button
                type="button"
                className="input-icon__toggle"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={sending}>
            {registering ? (sending ? 'Creando cuenta…' : 'Crear cuenta') : (sending ? 'Ingresando…' : 'Iniciar sesión')}
          </button>
        </form>
      </main>

      <Link to="/" className="auth__back">Volver a la cartelera</Link>
    </div>
  );
}
