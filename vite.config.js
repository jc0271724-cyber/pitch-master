import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pitch-master/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    strictPort: false,
    allowedHosts: 'all'
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    allowedHosts: 'all'
  }
});



