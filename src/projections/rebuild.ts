import type { DomainEvent } from '../domain/events';
import { getProjectionVersion } from '../database/database';
import {
  createProjectionSchema,
  dropProjectionSchema,
  type ProjectionVersion,
} from '../database/schema';
import type { DemoDatabase, SqlRow } from '../database/types';
import { projectEvent } from './projectEvent';

interface EventLogRow extends SqlRow {
  sequence: number;
  event_id: string;
  event_type: DomainEvent['type'];
  occurred_at: string;
  actor_user_id: string;
  payload_json: string;
}

export async function dropProjections(database: DemoDatabase): Promise<void> {
  const drop = database.transactionAsync(async (transaction) => {
    await dropProjectionSchema(transaction);
    await transaction.run(
      "UPDATE projection_meta SET active_version = 'none', last_rebuilt_at = NULL WHERE singleton = 1",
    );
  });
  await drop.immediate();
}

export async function rebuildProjections(
  database: DemoDatabase,
  version: Exclude<ProjectionVersion, 'none'>,
): Promise<number> {
  const rebuild = database.transactionAsync(async (transaction) => {
    await dropProjectionSchema(transaction);
    await createProjectionSchema(transaction, version);
    const rows = (await transaction.all(
      'SELECT * FROM event_log ORDER BY sequence',
    )) as EventLogRow[];
    for (const row of rows) {
      await projectEvent(transaction, Number(row.sequence), eventFromRow(row), version);
    }
    await transaction.run(
      'UPDATE projection_meta SET active_version = ?, last_rebuilt_at = ? WHERE singleton = 1',
      version,
      new Date().toISOString(),
    );
    return rows.length;
  });
  return rebuild.immediate();
}

export async function ensureProjection(database: DemoDatabase): Promise<void> {
  if ((await getProjectionVersion(database)) === 'none') await rebuildProjections(database, 'v2');
}

function eventFromRow(row: EventLogRow): DomainEvent {
  return {
    eventId: String(row.event_id),
    type: row.event_type,
    occurredAt: String(row.occurred_at),
    actorUserId: String(row.actor_user_id),
    payload: JSON.parse(String(row.payload_json)) as DomainEvent['payload'],
  } as DomainEvent;
}
