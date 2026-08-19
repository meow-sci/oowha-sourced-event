# Architecture

The project deliberately favors visible boundaries over production infrastructure.

```text
typed API adapter
      │
      ▼
command processor ──► security query ──► read projections
      │                       │
      │ allowed               └── denied: stop, write nothing
      ▼
┌──────────── one Turso transaction ────────────┐
│ append immutable event_log row                │
│ invoke active projection handlers             │
└──────────────── commit together ──────────────┘
```

## Demarcation

- `src/api/`: the first typed application boundary behind imaginary REST routes. It contains no SQL.
- `src/commands/`: coordinates authorization and the atomic event-plus-projection write.
- `src/queries/`: performs reads exclusively against projections, including security decisions.
- `src/projections/`: owns projection schemas, event handlers, drop, and replay.
- `src/domain/`: command, event, and model vocabulary. It has no database or UI dependencies.
- `src/database/`: opens Turso OPFS, owns permanent tables, and exposes inspection helpers.
- `src/demo/`: seed scenario, load generation, and the UI-facing runtime.

## Permanent and disposable data

`event_log` and `projection_meta` are permanent. All other tables are disposable projections.

V1 contains users, permissions, user-permission links, games, game-owner links, packages, and chunks. V2 creates the same tables and adds `user_action_audit`. Rebuild reads every event in sequence and sends it through the selected projection handler set within one transaction.

## Authorization

- User creation is public self-registration.
- The trusted `system` actor creates initial platform grants.
- Game creation requires `games:create`.
- Package and chunk writes require `<game>:owner`.
- Game permission grants require `<game>:owner`.
- Chunk queries require `<game>:purchased` or `<game>:owner`.

The command processor asks `securityQueries.ts` to read `user_permissions` before constructing or appending an event. A denial therefore cannot appear in either the event log or a projection.
