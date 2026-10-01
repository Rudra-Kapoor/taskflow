import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Where the dev server forwards API + WebSocket traffic (override when the API runs elsewhere).
const apiTarget = process.env.VITE_DEV_API_TARGET || 'http://localhost:5000';

const proxy = {
  '/api': { target: apiTarget, changeOrigin: true },
  '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
};

/** Groups large, rarely-changing dependencies into long-lived cacheable vendor chunks. */
const VENDOR_CHUNKS = [
  [
    'react-vendor',
    /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/,
  ],
  ['tanstack', /[\\/]node_modules[\\/]@tanstack[\\/]/],
  [
    'dnd',
    /[\\/]node_modules[\\/](@hello-pangea|redux|react-redux|css-box-model|raf-schd|memoize-one|use-memo-one)[\\/]/,
  ],
  ['date-fns', /[\\/]node_modules[\\/]date-fns[\\/]/],
  ['forms', /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/],
  [
    'socket',
    /[\\/]node_modules[\\/](socket\.io-client|socket\.io-parser|engine\.io-client|engine\.io-parser|@socket\.io)[\\/]/,
  ],
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const match = VENDOR_CHUNKS.find(([, pattern]) => pattern.test(id));
          return match ? match[0] : undefined;
        },
      },
    },
  },
});
