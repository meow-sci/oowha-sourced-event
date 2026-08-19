import { CommandApi } from '../api/commandApi';
import { QueryApi } from '../api/queryApi';
import { eventCount, processCommand } from '../commands/processCommand';
import { getDatabase, getProjectionVersion } from '../database/database';
import type { ProjectionVersion } from '../database/schema';
import type { DemoDatabase, SqlRow } from '../database/types';
import { dropProjections, ensureProjection, rebuildProjections } from '../projections/rebuild';
import { seedCommands } from './scenario';

export interface DemoSnapshot {
  eventCount: number;
  projectionVersion: ProjectionVersion;
  users: number;
  games: number;
  packages: number;
  chunks: number;
  recentEvents: SqlRow[];
}

export class DemoRuntime {
  readonly database: DemoDatabase;
  readonly commands: CommandApi;
  readonly queries: QueryApi;

  constructor(database: DemoDatabase) {
    this.database = database;
    this.commands = new CommandApi(database);
    this.queries = new QueryApi(database);
  }

  async snapshot(): Promise<DemoSnapshot> {
    const projectionVersion = await getProjectionVersion(this.database);
    const count = async (table: string): Promise<number> => {
      if (projectionVersion === 'none') return 0;
      const row = (await this.database.get(`SELECT COUNT(*) AS count FROM ${table}`)) as SqlRow;
      return Number(row.count);
    };
    return {
      eventCount: await eventCount(this.database),
      projectionVersion,
      users: await count('users'),
      games: await count('games'),
      packages: await count('packages'),
      chunks: await count('chunks'),
      recentEvents: (await this.database.all(
        'SELECT sequence, event_type, actor_user_id, occurred_at, payload_json FROM event_log ORDER BY sequence DESC LIMIT 8',
      )) as SqlRow[],
    };
  }

  async dropProjections(): Promise<void> {
    await dropProjections(this.database);
  }
  async rebuild(version: 'v1' | 'v2'): Promise<number> {
    return rebuildProjections(this.database, version);
  }

  async reset(): Promise<void> {
    await dropProjections(this.database);
    await this.database.run('DELETE FROM event_log');
    await rebuildProjections(this.database, 'v2');
    for (const command of seedCommands()) await processCommand(this.database, command);
  }
}

let runtimePromise: Promise<DemoRuntime> | undefined;

export function getRuntime(): Promise<DemoRuntime> {
  runtimePromise ??= createRuntime();
  return runtimePromise;
}

async function createRuntime(): Promise<DemoRuntime> {
  const database = await getDatabase();
  await ensureProjection(database);
  const runtime = new DemoRuntime(database);
  if ((await eventCount(database)) === 0) {
    for (const command of seedCommands()) await processCommand(database, command);
  }
  return runtime;
}
