import type { SqlExecutor } from './types';

export type ProjectionVersion = 'none' | 'v1' | 'v2';

export async function createPermanentSchema(executor: SqlExecutor): Promise<void> {
  await executor.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS event_log (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projection_meta (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      active_version TEXT NOT NULL,
      last_rebuilt_at TEXT
    );
    INSERT OR IGNORE INTO projection_meta(singleton, active_version) VALUES (1, 'none');
  `);
}

export async function dropProjectionSchema(executor: SqlExecutor): Promise<void> {
  await executor.exec(`
    DROP TABLE IF EXISTS user_action_audit;
    DROP TABLE IF EXISTS chunks;
    DROP TABLE IF EXISTS packages;
    DROP TABLE IF EXISTS game_owners;
    DROP TABLE IF EXISTS games;
    DROP TABLE IF EXISTS user_permissions;
    DROP TABLE IF EXISTS permissions;
    DROP TABLE IF EXISTS users;
  `);
}

export async function createProjectionSchema(
  executor: SqlExecutor,
  version: Exclude<ProjectionVersion, 'none'>,
): Promise<void> {
  await executor.exec(`
    CREATE TABLE users (user_id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
    CREATE TABLE permissions (permission TEXT PRIMARY KEY);
    CREATE TABLE user_permissions (
      user_id TEXT NOT NULL REFERENCES users(user_id),
      permission TEXT NOT NULL REFERENCES permissions(permission),
      granted_by TEXT NOT NULL,
      granted_at TEXT NOT NULL,
      PRIMARY KEY (user_id, permission)
    );
    CREATE TABLE games (game_id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE game_owners (
      game_id TEXT NOT NULL REFERENCES games(game_id),
      user_id TEXT NOT NULL REFERENCES users(user_id),
      PRIMARY KEY (game_id, user_id)
    );
    CREATE TABLE packages (
      package_id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(game_id),
      version TEXT NOT NULL,
      release_notes TEXT NOT NULL,
      published INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (game_id, version)
    );
    CREATE TABLE chunks (
      chunk_id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL REFERENCES packages(package_id),
      chunk_index INTEGER NOT NULL,
      size INTEGER NOT NULL,
      bytes BLOB NOT NULL,
      added_at TEXT NOT NULL,
      UNIQUE (package_id, chunk_index)
    );
  `);
  if (version === 'v2') {
    await executor.exec(`
      CREATE TABLE user_action_audit (
        event_sequence INTEGER PRIMARY KEY,
        event_id TEXT NOT NULL UNIQUE,
        actor_user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        summary TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
    `);
  }
}
