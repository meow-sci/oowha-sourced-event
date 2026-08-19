# Oowha! Sourced Event

An interactive, static event-sourcing demo. The entire application—including a persistent Turso relational database—runs in the browser.

## What it demonstrates

- Typed API adapters that hand requests to command or query modules.
- Projection-backed authorization before a command may write.
- A single database transaction that appends one immutable domain event and updates every active read projection.
- Disposable V1 and V2 projections rebuilt from the retained event log.
- A V2 user-action audit projection added without changing historical events.
- A load generator that uses the same command pipeline as the step-by-step walkthrough.
- A draggable, resizable raw table viewer.

See [Architecture](docs/architecture.md) for the module boundaries and database design.

## Development

```sh
pnpm install
pnpm dev
```

The Vite development server supplies cross-origin isolation headers. The static GitHub Pages build uses a small generated service worker to add those headers to same-origin responses, enabling Turso's threaded WASM runtime.

Validation:

```sh
pnpm fmt
pnpm lint
pnpm typecheck
pnpm build
```

Production base path: `/oowha-sourced-event/`  
Published URL: <https://meow.science.fail/oowha-sourced-event/>
