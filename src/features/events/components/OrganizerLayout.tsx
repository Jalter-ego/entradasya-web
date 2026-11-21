/**
 * Panel del organizador (P2), con la misma estructura que el Control Center de attendance:
 * barra lateral con navegación, barra superior con ubicación y perfil, contenido y pie.
 */
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../../shared/session';
import './organizer-layout.css';

const paths = {
  ticket: ['M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z', 'M14 8v10'],
  calendar: ['M3 5h18v16H3z', 'M16 3v4M8 3v4M3 10h18'],
  plus: ['M12 5v14', 'M5 12h14'],
  chevronRight: ['m9 5 7 7-7 7'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  logout: ['M9 4H4v16h5', 'M10 12h11', 'm17 8 4 4-4 4'],
} as const;

function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const NEW_EVENT = '/organizador/eventos/nuevo';
const MY_EVENTS = '/organizador/eventos';

/** Ubicación actual para la miga de pan: sección y, si corresponde, la página dentro de ella. */
function locate(pathname: string): { section: string; page?: string } {
  if (pathname === NEW_EVENT) return { section: 'Mis eventos', page: 'Crear evento' };
  if (pathname.startsWith(`${MY_EVENTS}/`)) return { section: 'Mis eventos', page: 'Editar evento' };
  return { section: 'Mis eventos' };
}

export function OrganizerLayout() {
  const { user, signOut } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { section, page } = locate(pathname);

  // "Mis eventos" queda activo también al editar un evento, pero no al crear uno.
  const navigation = [
    { to: MY_EVENTS, label: 'Mis eventos', icon: 'calendar', active: pathname.startsWith(MY_EVENTS) && pathname !== NEW_EVENT },
    { to: NEW_EVENT, label: 'Crear evento', icon: 'plus', active: pathname === NEW_EVENT },
  ] as const;

  const name = user?.email ?? 'Organizador';

  function logout() {
    signOut();
    navigate('/');
  }

  return (
    <div className="org-shell">
      <a className="org-skip" href="#panel-content">
        Ir al contenido
      </a>

      <aside className="org-sidebar">
        <Link className="org-brand" to={MY_EVENTS} aria-label="EntradasYa, panel del organizador">
          <Icon name="ticket" size={28} />
          <span>
            EntradasYa<span>.</span>
            <small>Panel del organizador</small>
          </span>
        </Link>

        <div className="org-navigation">
          <p className="org-nav-caption">Espacio de trabajo</p>
          <nav aria-label="Navegación del panel">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={item.active ? 'active' : undefined}
                aria-current={item.active ? 'page' : undefined}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                <Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </nav>
        </div>

        <div className="org-sidebar-bottom">
          <div className="org-sidebar-note">
            <Icon name="ticket" size={21} />
            <p>
              Crea tus eventos, arma
              <br />
              sus sectores y vende.
            </p>
          </div>
          <span className="org-local-mode">Pagos simulados · Proyecto académico</span>
          <Link className="org-home-link" to="/">
            Volver a la cartelera
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </aside>

      <div className="org-workspace">
        <div className="org-workspace-decoration" aria-hidden="true">
          <span className="org-workspace-mark">
            <Icon name="ticket" size={480} />
          </span>
          <span className="org-workspace-orbit" />
        </div>

        <header className="org-topbar">
          <nav className="org-breadcrumb" aria-label="Ubicación actual">
            <Link to={MY_EVENTS}>Organizador</Link>
            <Icon name="chevronRight" size={14} />
            {page ? (
              <>
                <Link to={MY_EVENTS}>{section}</Link>
                <Icon name="chevronRight" size={14} />
                <span aria-current="page">{page}</span>
              </>
            ) : (
              <span aria-current="page">{section}</span>
            )}
          </nav>

          <div className="org-profile">
            <span className="org-user-avatar" aria-hidden="true">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="org-user-details">
              <span>{name}</span>
              <small>Organizador de eventos</small>
            </div>
            <button type="button" className="org-logout" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}>
              <Icon name="logout" size={19} />
            </button>
          </div>
        </header>

        <main className="org-main" id="panel-content" tabIndex={-1}>
          <Outlet />
        </main>

        <footer className="org-footer">
          <span>
            EntradasYa<span className="org-footer-dot">.</span> Panel del organizador
          </span>
          <span>Gestión de eventos, sectores y cupos</span>
        </footer>
      </div>
    </div>
  );
}
