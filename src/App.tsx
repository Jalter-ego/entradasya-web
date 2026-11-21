import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { RequireRole } from './features/auth/RequireRole';
import { SessionProvider } from './features/auth/session';
import { OrganizerLayout } from './features/events/components/OrganizerLayout';
import { CheckinPage } from './features/checkin/pages/CheckinPage';
import { CatalogPage } from './features/events/pages/CatalogPage';
import { EventDetailPage } from './features/events/pages/EventDetailPage';
import { EventFormPage } from './features/events/pages/EventFormPage';
import { OrganizerEventsPage } from './features/events/pages/OrganizerEventsPage';
import { CheckoutPage } from './features/orders/pages/CheckoutPage';
import { MyOrdersPage } from './features/orders/pages/MyOrdersPage';
import { OrderResultPage } from './features/orders/pages/OrderResultPage';
import { MyTicketsPage } from './features/tickets/pages/MyTicketsPage';
import { Layout } from './shared/Layout';

function NotFound() {
  return (
    <section className="page page--narrow notice">
      <h1>Esta página no existe</h1>
      <p>Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <Link className="btn btn--primary" to="/">
        Ver la cartelera
      </Link>
    </section>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route index element={<CatalogPage />} />
            <Route path="eventos/:id" element={<EventDetailPage />} />
            <Route path="checkout" element={<RequireRole role="customer"><CheckoutPage /></RequireRole>} />
            <Route path="compras/:id" element={<RequireRole role="customer"><OrderResultPage /></RequireRole>} />
            <Route path="mis-compras" element={<RequireRole role="customer"><MyOrdersPage /></RequireRole>} />
            <Route path="mis-entradas" element={<RequireRole role="customer"><MyTicketsPage /></RequireRole>} />
            <Route path="porteria" element={<RequireRole role="doorman"><CheckinPage /></RequireRole>} />
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Panel del organizador (P2): marco propio con barra lateral. */}
          <Route
            path="organizador"
            element={
              <RequireRole role="organizer">
                <OrganizerLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="eventos" replace />} />
            <Route path="eventos" element={<OrganizerEventsPage />} />
            <Route path="eventos/nuevo" element={<EventFormPage />} />
            <Route path="eventos/:id" element={<EventFormPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
