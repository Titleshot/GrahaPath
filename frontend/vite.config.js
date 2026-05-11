import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../folder'),
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/generate-chart': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/chat-v2': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/payment-proof': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/generate-chart': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/chat-v2': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/payment-proof': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
