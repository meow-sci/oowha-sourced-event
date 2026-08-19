import { connect } from '@tursodatabase/database-wasm/vite';
import { createPermanentSchema, type ProjectionVersion } from './schema';
import type { DemoDatabase, SqlRow } from './types';

let databasePromise: Promise<DemoDatabase> | undefined;

export function getDatabase(): Promise<DemoDatabase> {
  databasePromise ??= openDatabase();
  return databasePromise;
}

async function openDatabase(): Promise<DemoDatabase> {
  const database = await connect('oowha-event-sourcing.db');
  await createPermanentSchema(database);
  return database;
}

export async function getProjectionVersion(database: DemoDatabase): Promise<ProjectionVersion> {
  const row = (await database.get(
    'SELECT active_version FROM projection_meta WHERE singleton = 1',
  )) as SqlRow | undefined;
  const version = row?.active_version;
  return version === 'v1' || version === 'v2' ? version : 'none';
}
