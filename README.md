# web

Interfaz única de EntradasYa: React 18 + Vite + TypeScript, con vistas por rol.

## Arranque

```bash
# Desde la raíz del repositorio entradasya-web
pnpm install
pnpm run dev          # http://localhost:5173
pnpm run build        # genera dist/ para que Nginx la sirva en la demo
```

En desarrollo, Vite reenvía cada API a su servicio con los puertos del plan: auth 3001, events 3002, orders 3003, tickets 3005 y checkin 3007. Para cambiar uno: `EVENTS_URL=http://127.0.0.1:4002 pnpm run dev`. En la demo, Nginx cumple ese papel.

## Pipeline de GitHub Actions

El workflow `.github/workflows/ci.yml` se ejecuta con cada **push a `develop`**. Usa Node.js 24.15.0 y pnpm 11.5.1, instala con `--frozen-lockfile`, comprueba tipos, ejecuta las pruebas y compila con Vite. No requiere bases de datos, servicios encendidos ni secretos de GitHub.

En **Actions → Web CI → ejecución → Artifacts** quedan disponibles durante 7 días:

- `web-build-<commit>-<intento>`: contenido de `dist/` (`index.html` y assets), listo para servir como sitio estático. Se publica cuando pasan todas las validaciones.
- `web-tests-<commit>-<intento>`: reporte `junit.xml`, también si las pruebas fallan y alcanzan a generar el reporte.

El artifact del frontend necesita un servidor configurado con fallback a `index.html` para las rutas de la SPA y proxy de `/api/*` hacia los servicios. El proxy de Vite solo aplica a `pnpm dev`; no se incorpora en `dist/`. Este pipeline genera artifacts; no despliega el sitio.

Para reproducir las validaciones localmente:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test             # también genera reports/junit.xml
pnpm build
```

Las pruebas usan Node y TypeScript sin dependencias adicionales. Verifican las llamadas JSON/multipart, Bearer, idempotencia enviada en cabeceras, errores de API y las descargas de tickets, con `fetch` simulado. No son pruebas de navegación en un navegador ni de integración con los otros servicios.

Al subir estos cambios a `develop`, GitHub ejecutará el workflow. Si la rama aún no existe en el remoto, el primer push puede hacerse con `git push -u origin develop` después de crear el commit.

## Estructura

```text
src/
├── App.tsx              # rutas
├── shared/              # piezas comunes
│   ├── api.ts           # fetch con el formato de error acordado
│   ├── session.ts       # acceso compartido a la sesión de P1
│   ├── Layout.tsx       # encabezado, pie y navegación por rol
│   └── ...
├── styles/global.css    # colores, tipografía y componentes base
└── features/
    ├── auth/            # P1: registro, login, sesión y rutas por rol
    ├── checkin/         # P6: portería, lectura QR, resultado y conteo
    ├── events/          # P2: cartelera, detalle, organizador
    ├── orders/          # P3: checkout, resultado y Mis compras
    ├── payments/        # P4: PaymentFields (pago de demo dentro del checkout)
    └── tickets/         # P5: Mis entradas y descarga autenticada
```

Cada integrante trabaja en `src/features/<su-feature>/` y agrega sus rutas en `App.tsx`.

## Feature auth (P1)

La pantalla `/login` usa `/api/auth/login` y `/api/auth/register`. Levantar [auth](../../services/auth/README.md) para ingresar o registrar un cliente.

| Cuenta | Rol |
|---|---|
| `organizador@demo.bo` | Organizador (dueño de los eventos de demo) |
| `cliente@demo.bo` | Cliente |
| `portero@demo.bo` | Portero |

Las cuentas de demo se habilitan con `pnpm run seed` en auth. Usar la contraseña elegida al sembrarlas.

El navegador conserva la sesión al recargar y la limpia al vencer el JWT o al cerrar sesión. `RequireRole` protege las vistas, y cada API comprueba la firma y autoriza la operación en el servidor.

## Feature events (P2)

| Ruta | Pantalla |
|---|---|
| `/` | Cartelera: carrusel de próximos eventos, búsqueda y filtros por categoría y ciudad. |
| `/eventos/:id` | Detalle: sectores con disponibilidad, cantidad (1 a 6) y total. «Continuar con la compra» lleva a `/checkout?eventId&sectorId&quantity`. |
| `/organizador/eventos` | Mis eventos: estado, lugares reservados, publicar y cancelar. |
| `/organizador/eventos/nuevo` | Crear evento con sus sectores (queda en borrador). |
| `/organizador/eventos/:id` | Editar datos, sectores y precios; ver ventas. |

### Lo que espera de otros

- **P1 (auth):** `useSession()` aporta el JWT y el rol del organizador. Events verifica el JWT con el PEM público de auth.
- **P3 (orders):** ✅ `/checkout` ya está implementado (ver la feature orders). El reporte `GET /api/orders/reports/events/:eventId` se adapta en `eventsApi.salesReport` a la forma de `SalesReport` que usa el panel: desenvuelve `data`, renombra `ordersPaid` → `paidOrders` y `sectors` → `bySector`, y usa la moneda del evento cuando no hay ventas. Si orders no responde, el panel muestra los lugares reservados.

## Feature orders (P3)

| Ruta | Pantalla |
|---|---|
| `/checkout?eventId&sectorId&quantity` | Resumen de la selección hecha en el detalle del evento, pago de demo y confirmación. Solo `role=customer`. |
| `/compras/:id` | Resultado: pagada (enlace a `/mis-entradas?orderId=`), rechazada (motivo y vuelta al evento) o en proceso (reintento). |
| `/mis-compras` | Compras del cliente con estado, total y paginación de 10. |

- **Idempotencia:** el checkout envía `Idempotency-Key`, que se genera en `features/orders/idempotency.ts`. Mientras la compra sea la misma (doble clic, timeout, recarga) se reutiliza la misma clave y el backend no crea otra orden ni cobra dos veces. Al cambiar la selección o el pago se genera otra clave, y se olvida al recibir la orden.
- **Precio:** el navegador nunca envía precio ni total; el total del checkout es solo de referencia.
- **Respuestas:** orders responde con un envoltorio `{ success, message, data, meta, requestId }`, y `features/orders/api.ts` lo desenvuelve. Los errores mantienen `{ error: { code, message } }`, así que `shared/api.ts` los traduce sin cambios.
- **Reintento:** en `/compras/:id`, "Reintentar" llama a `POST /api/orders/:id/retry`. Completa solo los pasos pendientes (emisión, correo, pago incierto) sin cobrar otra vez.
- **Pago (P4):** `CheckoutPage` usa `PaymentFields` de `features/payments`, con la interfaz `{ value, onChange, disabled }` y `value = { method: 'demo_card', last4 }`. Reemplazó al provisional `DemoPaymentFields`.
- **Cambios compartidos:** `shared/api.ts` acepta `headers` opcionales, y `shared/Layout.tsx` muestra «Mis compras» a los clientes.

## Feature payments (P4)

`features/payments/PaymentFields.tsx` es el componente de pago simulado que se monta dentro del formulario del checkout. No tiene rutas ni llama a ninguna API: devuelve `{ method: 'demo_card', last4 }` y el checkout lo envía a **orders** dentro de `POST /api/orders`. La web nunca llama a payments, que es interno.

| Terminación | Resultado |
|---|---|
| `1111` | Pago aprobado. |
| `0000` | Pago rechazado (para probar la liberación de cupos). |

No pide número de tarjeta, CVV ni importe: el total lo calcula orders con el precio de la reserva. Muestra una tarjeta de demo con el resultado esperado y se deshabilita mientras se procesa la compra. Estilos en `payments.css`, con los tokens de `global.css`.

## Feature tickets (P5)

| Ruta | Pantalla |
|---|---|
| `/mis-entradas` | Entradas del cliente autenticado; evento, fecha, lugar, sector, precio unitario, código y descarga individual de PDF. |
| `/mis-entradas?orderId=<UUID>` | La misma lista filtrada por una compra propia; enlace para volver a todas las entradas. |

El enlace aparece en el encabezado para `role=customer`. La página usa `GET /api/tickets/me` y descarga con `GET /api/tickets/:id/pdf`, enviando Bearer en ambos casos. El token no se incluye en URLs ni se usa la API interna desde el navegador. Hay paginación de 12 entradas, actualización manual y estados de carga, vacío y error. Cambiar de sesión cancela las peticiones y desmonta las entradas anteriores.

La etiqueta «Emitida» confirma la emisión; no indica si la entrada ya se utilizó. Ese dato lo administra checkin. El QR se muestra en el PDF emitido por tickets.

### Probar antes de que exista orders

Se puede probar esta pantalla con auth y tickets. La API interna de tickets permite preparar entradas de demo para `cliente@demo.bo`.

1. Configurar/migrar y levantar `services/tickets` siguiendo su README.
2. Configurar el PEM público de auth en tickets, con el mismo emisor y audiencia. Migrar auth y sembrar sus cuentas de demo.
3. Para crear dos entradas de demo **en el servicio local**, ejecutar desde `services/tickets`, en otra terminal con Node 22.11 o superior:

```bash
node --env-file=.env --input-type=module <<'NODE'
const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3005}/internal/tickets/issue`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.INTERNAL_TOKEN_ORDERS,
  },
  body: JSON.stringify({
    orderId: '40000000-0000-4000-8000-000000000005',
    customerId: '00000000-0000-4000-8000-000000000002',
    paymentStatus: 'approved',
    quantity: 2,
    unitPriceMinor: 5000,
    currency: 'BOB',
    event: {
      id: '20000000-0000-4000-8000-000000000001',
      title: 'Noche de Rock — demo de entradas',
      venue: 'Estadio Central',
      startsAt: '2026-12-20T23:00:00.000Z',
      organizerId: '00000000-0000-4000-8000-000000000001',
    },
    sector: { id: '30000000-0000-4000-8000-000000000001', name: 'General' },
  }),
});
const result = await response.json();
if (!response.ok) throw new Error(`${response.status}: ${result.error?.message ?? 'No se pudo emitir'}`);
console.log(`HTTP ${response.status}: ${result.items.length} entradas listas para el cliente de demo.`);
NODE
```

Este comando crea registros/PDF de prueba y simula la llamada de orders; no procesa una compra ni reserva cupos. Usa UUID y fecha fijos para que repetirlo conserve las mismas dos entradas. No cambiar el cuerpo con ese mismo `orderId`; para otro caso de prueba, usar un UUID de orden nuevo. La credencial interna se lee del `.env` del backend y nunca se publica en la configuración del frontend.

4. Levantar la web e iniciar sesión como `cliente@demo.bo` con la contraseña configurada al sembrar auth.
5. Abrir `/mis-entradas`, descargar ambos PDF y comprobar el QR. También puede usarse `/mis-entradas?orderId=40000000-0000-4000-8000-000000000005`.

Para P3: emitir usando el contrato de tickets y enlazar `/mis-entradas?orderId=<UUID>` desde el resultado de compra. P4 puede usar `/mis-entradas` como enlace en el correo; el usuario inicia sesión, sin JWT en la URL. P6 debe conservar `/api/tickets` al configurar Nginx y servir la SPA también en `/mis-entradas`.

### Verificación local del frontend

```bash
pnpm run typecheck
pnpm run build
pnpm test
```

Las pruebas de tickets usan el ejecutor de Node y el compilador TypeScript ya instalado, sin nuevas dependencias. Simulan `fetch` y verifican Bearer, filtro/paginación, respuesta binaria, errores 401/403/404/503, errores del proxy, archivo vacío, HTML inesperado, caída de red y cancelación. No reemplazan la comprobación manual con el backend y PostgreSQL.

## Feature checkin (P6)

| Ruta | Pantalla |
|---|---|
| `/porteria` | Portería (`role=doorman`): selector de evento publicado, entrada manual o lector QR (teclado / cámara opcional), resultado claro (`APROBADO`, `ALREADY_USED` con hora del primer ingreso, `WRONG_EVENT`, `INVALID_TICKET`) y conteo en vivo. |

El enlace aparece en el encabezado para `role=doorman`. Al iniciar sesión con la cuenta sembrada `portero@demo.bo`, la ruta inicial es `/porteria`.
