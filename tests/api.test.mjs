import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api, ApiError } from '../src/shared/api.ts';

test('envía JSON, Bearer y la clave de idempotencia al crear una compra', async (t) => {
  const body = { eventId: 'evento-demo', quantity: 2 };
  const signal = new AbortController().signal;
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 'orden-demo' }));
  assert.deepEqual(await api('/api/orders', {
    method: 'POST', body, token: 'token-demo', signal, headers: { 'Idempotency-Key': 'compra-demo' },
  }), { id: 'orden-demo' });
  const [path, options] = fetch.mock.calls[0].arguments;
  assert.equal(path, '/api/orders');
  assert.equal(options.method, 'POST');
  assert.equal(options.signal, signal);
  assert.equal(options.headers.Authorization, 'Bearer token-demo');
  assert.equal(options.headers['Idempotency-Key'], 'compra-demo');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(options.body), body);
});

test('permite consultas públicas sin Authorization', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ items: [] }));
  await api('/api/events');
  const [, options] = fetch.mock.calls[0].arguments;
  assert.equal(options.method, 'GET');
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.body, undefined);
});

test('envía imágenes como FormData y deja que fetch genere el boundary', async (t) => {
  const form = new FormData();
  form.append('image', new Blob(['imagen-demo'], { type: 'image/png' }), 'portada.png');
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ url: '/portada.png' }));
  await api('/api/events/cover', { method: 'POST', token: 'token-demo', body: form });
  const [, options] = fetch.mock.calls[0].arguments;
  assert.equal(options.body, form);
  assert.equal(options.headers['Content-Type'], undefined);
  assert.equal(options.headers.Authorization, 'Bearer token-demo');
});

test('preserva el código y mensaje de error del backend', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { code: 'SOLD_OUT', message: 'No quedan cupos.' },
  }, { status: 409 }));
  await assert.rejects(api('/api/orders'), { status: 409, code: 'SOLD_OUT', message: 'No quedan cupos.' });
});

test('convierte errores HTML del proxy en un error de servicio', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Bad Gateway</html>', { status: 502 }));
  await assert.rejects(api('/api/events'), (error) => error instanceof ApiError && error.code === 'HTTP_502');
});

test('acepta respuestas sin cuerpo como al eliminar un recurso', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  assert.equal(await api('/api/events/demo', { method: 'DELETE' }), null);
});

test('traduce fallos de red', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(api('/api/events'), { status: 0, code: 'NETWORK' });
});

test('preserva la cancelación de una petición', async (t) => {
  const aborted = new DOMException('Cancelado', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => { throw aborted; });
  await assert.rejects(api('/api/events'), (error) => error === aborted);
});
