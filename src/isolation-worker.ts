export {};

interface LifetimeEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface RequestEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response>): void;
}
interface IsolationWorker {
  addEventListener(type: 'install' | 'activate', listener: (event: LifetimeEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: RequestEvent) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
}

const worker = self as unknown as IsolationWorker;

worker.addEventListener('install', (event) => event.waitUntil(worker.skipWaiting()));
worker.addEventListener('activate', (event) => event.waitUntil(worker.clients.claim()));
worker.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then(async (response) => {
      if (response.type === 'opaque') return response;
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      return new Response(await response.blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }),
  );
});
