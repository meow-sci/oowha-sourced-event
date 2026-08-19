import type { DomainCommand } from '../domain/commands';
import type { DomainEvent } from '../domain/events';
import { getProjectionVersion } from '../database/database';
import type { DemoDatabase, SqlRow } from '../database/types';
import { projectEvent } from '../projections/projectEvent';
import { authorizeCommand, type AuthorizationDecision } from '../queries/securityQueries';

export interface CommandResult {
  sequence: number;
  event: DomainEvent;
}

export class CommandHandlingSession {
  readonly #database: DemoDatabase;
  readonly command: DomainCommand;
  #decision: AuthorizationDecision | undefined;
  #committed = false;

  constructor(database: DemoDatabase, command: DomainCommand) {
    this.#database = database;
    this.command = command;
  }

  async authorize(): Promise<AuthorizationDecision> {
    this.#decision ??= await authorizeCommand(this.#database, this.command);
    return this.#decision;
  }

  async commit(): Promise<CommandResult> {
    if (this.#committed) throw new Error('This command session has already committed.');
    const decision = await this.authorize();
    if (!decision.allowed) throw new Error(`403: ${decision.explanation}`);
    const version = await getProjectionVersion(this.#database);
    if (version === 'none')
      throw new Error('Read projections are unavailable. Rebuild V1 or V2 first.');
    const event = eventFromCommand(this.command);
    const commit = this.#database.transactionAsync(async (transaction) => {
      const insert = await transaction.run(
        `INSERT INTO event_log(event_id, event_type, occurred_at, actor_user_id, payload_json)
         VALUES (?, ?, ?, ?, ?)`,
        event.eventId,
        event.type,
        event.occurredAt,
        event.actorUserId,
        JSON.stringify(event.payload),
      );
      const sequence = Number(insert.lastInsertRowid);
      await projectEvent(transaction, sequence, event, version);
      return { sequence, event };
    });
    const result = await commit.immediate();
    this.#committed = true;
    return result;
  }
}

export async function processCommand(
  database: DemoDatabase,
  command: DomainCommand,
): Promise<CommandResult> {
  return new CommandHandlingSession(database, command).commit();
}

function eventFromCommand(command: DomainCommand): DomainEvent {
  const metadata = {
    eventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    actorUserId: command.actorUserId,
  };
  switch (command.type) {
    case 'CreateUser':
      return {
        ...metadata,
        type: 'UserCreated',
        payload: { userId: command.userId, email: command.email },
      };
    case 'GrantPermission':
      return {
        ...metadata,
        type: 'PermissionGranted',
        payload: { targetUserId: command.targetUserId, permission: command.permission },
      };
    case 'CreateGame':
      return {
        ...metadata,
        type: 'GameCreated',
        payload: {
          gameId: command.gameId,
          name: command.name,
          description: command.description,
          ownerUserId: command.actorUserId,
        },
      };
    case 'CreatePackage':
      return {
        ...metadata,
        type: 'PackageCreated',
        payload: {
          packageId: command.packageId,
          gameId: command.gameId,
          version: command.version,
          releaseNotes: command.releaseNotes,
          published: command.published,
        },
      };
    case 'AddChunk':
      return {
        ...metadata,
        type: 'ChunkAdded',
        payload: {
          chunkId: command.chunkId,
          packageId: command.packageId,
          index: command.index,
          size: atob(command.bytesBase64).length,
          bytesBase64: command.bytesBase64,
        },
      };
  }
}

export async function eventCount(database: DemoDatabase): Promise<number> {
  const row = (await database.get('SELECT COUNT(*) AS count FROM event_log')) as SqlRow;
  return Number(row.count);
}
