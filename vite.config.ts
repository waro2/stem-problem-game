/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-state': ['zustand'],
          'vendor-capacitor': ['@capacitor/core', '@capacitor/splash-screen', '@capacitor/status-bar'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-zod': ['zod'],
        },
      },
    },
  },
  test: {
    // Load tests run isolated via `npm run test:load` — excluding them here
    // prevents vitest's parallel test-file scheduling from inflating their
    // latency measurements (30+ concurrent HTTP servers skew results).
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.load.test.ts'],
  },
  resolve: {
    alias: {
      '@game': fileURLToPath(new URL('./src/game', import.meta.url)),
      '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
      '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
      '@i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@auth': fileURLToPath(new URL('./src/auth', import.meta.url)),
    },
  },
});
