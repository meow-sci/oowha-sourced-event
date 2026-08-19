import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/oowha-sourced-event/',
  plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    host: '0.0.0.0',
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        // A service worker may only control pages below its own directory.
        // Keep this TypeScript-built worker at the Pages base root, not assets/.
        entryFileNames: (chunk) =>
          chunk.name === 'isolation-worker' ? 'isolation-worker.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: { environment: 'happy-dom' },
});
