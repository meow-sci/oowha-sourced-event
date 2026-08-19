import { decodeBytes, type DomainEvent } from '../domain/events';
import type { ProjectionVersion } from '../database/schema';
import type { SqlExecutor } from '../database/types';

export async function projectEvent(
  executor: SqlExecutor,
  sequence: number,
  event: DomainEvent,
  version: Exclude<ProjectionVersion, 'none'>,
): Promise<void> {
  switch (event.type) {
    case 'UserCreated':
      await executor.run(
        'INSERT INTO users(user_id, email, created_at) VALUES (?, ?, ?)',
        event.payload.userId,
        event.payload.email,
        event.occurredAt,
      );
      break;
    case 'PermissionGranted':
      await executor.run(
        'INSERT OR IGNORE INTO permissions(permission) VALUES (?)',
        event.payload.permission,
      );
      await executor.run(
        `INSERT INTO user_permissions(user_id, permission, granted_by, granted_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, permission) DO UPDATE SET granted_by = excluded.granted_by, granted_at = excluded.granted_at`,
        event.payload.targetUserId,
        event.payload.permission,
        event.actorUserId,
        event.occurredAt,
      );
      break;
    case 'GameCreated':
      await executor.run(
        'INSERT INTO games(game_id, name, description, created_at) VALUES (?, ?, ?, ?)',
        event.payload.gameId,
        event.payload.name,
        event.payload.description,
        event.occurredAt,
      );
      await executor.run(
        'INSERT INTO game_owners(game_id, user_id) VALUES (?, ?)',
        event.payload.gameId,
        event.payload.ownerUserId,
      );
      break;
    case 'PackageCreated':
      await executor.run(
        `INSERT INTO packages(package_id, game_id, version, release_notes, published, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        event.payload.packageId,
        event.payload.gameId,
        event.payload.version,
        event.payload.releaseNotes,
        event.payload.published ? 1 : 0,
        event.occurredAt,
      );
      break;
    case 'ChunkAdded':
      await executor.run(
        `INSERT INTO chunks(chunk_id, package_id, chunk_index, size, bytes, added_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        event.payload.chunkId,
        event.payload.packageId,
        event.payload.index,
        event.payload.size,
        decodeBytes(event.payload.bytesBase64),
        event.occurredAt,
      );
      break;
  }

  if (version === 'v2') await projectAuditEntry(executor, sequence, event);
}

async function projectAuditEntry(
  executor: SqlExecutor,
  sequence: number,
  event: DomainEvent,
): Promise<void> {
  const audit = describeAuditEntry(event);
  await executor.run(
    `INSERT INTO user_action_audit(
      event_sequence, event_id, actor_user_id, action, summary, resource_type, resource_id, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    sequence,
    event.eventId,
    event.actorUserId,
    event.type,
    audit.summary,
    audit.resourceType,
    audit.resourceId,
    event.occurredAt,
  );
}

function describeAuditEntry(event: DomainEvent): {
  summary: string;
  resourceType: string;
  resourceId: string;
} {
  switch (event.type) {
    case 'UserCreated':
      return {
        summary: `${event.payload.userId} created an account`,
        resourceType: 'user',
        resourceId: event.payload.userId,
      };
    case 'PermissionGranted':
      return {
        summary: `${event.actorUserId} granted ${event.payload.permission} to ${event.payload.targetUserId}`,
        resourceType: 'permission',
        resourceId: event.payload.permission,
      };
    case 'GameCreated':
      return {
        summary: `${event.actorUserId} created ${event.payload.name}`,
        resourceType: 'game',
        resourceId: event.payload.gameId,
      };
    case 'PackageCreated':
      return {
        summary: `${event.actorUserId} created package ${event.payload.version}`,
        resourceType: 'package',
        resourceId: event.payload.packageId,
      };
    case 'ChunkAdded':
      return {
        summary: `${event.actorUserId} added chunk ${event.payload.index}`,
        resourceType: 'chunk',
        resourceId: event.payload.chunkId,
      };
  }
}
