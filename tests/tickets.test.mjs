import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchTicketPdf, listMyTickets, ticketErrorMessage } from '../src/features/tickets/api.ts';
import { ApiError } from '../src/shared/api.ts';

test('lista entradas con Bearer, paginación y filtro por compra', async (t) => {
  const page = { items: [{ id: 'entrada-demo' }], limit: 12, offset: 24 };
  const signal = new AbortController().signal;
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(page));
  assert.deepEqual(await listMyTickets('token-demo', { limit: 12, offset: 24, orderId: 'orden /&demo' }, signal), page);
  const [path, options] = fetch.mock.calls[0].arguments;
  const url = new URL(path, 'http://localhost');
  assert.equal(url.pathname, '/api/tickets/me');
  assert.equal(url.searchParams.get('orderId'), 'orden /&demo');
  assert.equal(url.searchParams.get('limit'), '12');
  assert.equal(url.searchParams.get('offset'), '24');
  assert.equal(options.headers.Authorization, 'Bearer token-demo');
  assert.equal(options.signal, signal);
});

test('omite el filtro al consultar todas las entradas', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ items: [] }));
  await listMyTickets('token-demo', { limit: 12, offset: 0 });
  assert.equal(new URL(fetch.mock.calls[0].arguments[0], 'http://localhost').searchParams.has('orderId'), false);
});

test('descarga el PDF binario desde una ruta propia con Bearer y sin caché', async (t) => {
  const bytes = new Uint8Array([37, 80, 68, 70, 45, 0, 255]);
  const signal = new AbortController().signal;
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(bytes, {
    headers: { 'Content-Type': 'application/pdf; charset=binary' },
  }));
  const blob = await fetchTicketPdf('entrada/demo?token=x', 'token-demo', signal);
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  const [path, options] = fetch.mock.calls[0].arguments;
  assert.equal(path, '/api/tickets/entrada%2Fdemo%3Ftoken%3Dx/pdf');
  assert.equal(options.headers.Authorization, 'Bearer token-demo');
  assert.equal(options.headers.Accept, 'application/pdf');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.signal, signal);
});

for (const [status, message] of [
  [401, 'Tu sesión no es válida o ha vencido. Vuelve a iniciar sesión.'],
  [403, 'Necesitas una cuenta de cliente para consultar tus entradas.'],
  [404, 'No encontramos esta entrada para tu cuenta.'],
  [503, 'No se pudieron preparar las entradas. Intenta nuevamente en unos momentos.'],
]) {
  test(`traduce HTTP ${status} al descargar una entrada`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({
      error: { code: 'TICKET_ERROR', message: 'Error del servicio.' },
    }, { status }));
    await assert.rejects(fetchTicketPdf('demo', 'token-demo'), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      assert.equal(error.code, 'TICKET_ERROR');
      assert.equal(ticketErrorMessage(error), message);
      return true;
    });
  });
}

test('maneja un error no JSON del proxy durante la descarga', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Bad Gateway', { status: 502 }));
  await assert.rejects(fetchTicketPdf('demo', 'token-demo'), { status: 502, code: 'HTTP_502' });
});

for (const [description, body, type] of [
  ['HTML inesperado', '<html>Login</html>', 'text/html'],
  ['un PDF vacío', '', 'application/pdf'],
]) {
  test(`rechaza ${description} aunque el servidor responda HTTP 200`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(body, { headers: { 'Content-Type': type } }));
    await assert.rejects(fetchTicketPdf('demo', 'token-demo'), { status: 502, code: 'INVALID_PDF' });
  });
}

test('traduce un fallo de red al descargar el PDF', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(fetchTicketPdf('demo', 'token-demo'), { status: 0, code: 'NETWORK' });
});

test('preserva la cancelación de una descarga', async (t) => {
  const aborted = new DOMException('Cancelado', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => { throw aborted; });
  await assert.rejects(fetchTicketPdf('demo', 'token-demo'), (error) => error === aborted);
});
