import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const service = (envName: string, port: number) => ({
  target: process.env[envName] ?? `http://127.0.0.1:${port}`,
  changeOrigin: true,
});

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': service('AUTH_URL', 3001),
      '/api/events': service('EVENTS_URL', 3002),
      '/api/orders': service('ORDERS_URL', 3003),
      '/api/tickets': service('TICKETS_URL', 3005),
      '/api/checkin': service('CHECKIN_URL', 3007),
    },
  },
});
