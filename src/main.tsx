import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import isolationWorkerUrl from './isolation-worker.ts?worker&url';
import App from './App';
import './index.css';

async function prepareIsolation(): Promise<boolean> {
  if (crossOriginIsolated) return true;
  if (!('serviceWorker' in navigator)) return true;
  await navigator.serviceWorker.register(isolationWorkerUrl, {
    scope: import.meta.env.BASE_URL,
    type: 'module',
  });
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
    );
    window.location.reload();
    return false;
  }
  window.location.reload();
  return false;
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <main style={{ padding: 24, color: '#e8eaed', background: '#0b0c0e', minHeight: '100vh' }}>
    Preparing isolated browser database…
  </main>,
);

if (await prepareIsolation())
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
