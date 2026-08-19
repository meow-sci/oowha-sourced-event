import {
  CommandHandlingSession,
  processCommand,
  type CommandResult,
} from '../commands/processCommand';
import type { DomainCommand } from '../domain/commands';
import type { DemoDatabase } from '../database/types';

/** Typed, in-process equivalent of the first application code behind POST /commands. */
export class CommandApi {
  readonly #database: DemoDatabase;

  constructor(database: DemoDatabase) {
    this.#database = database;
  }

  beginRequest(requestBody: DomainCommand): CommandHandlingSession {
    return new CommandHandlingSession(this.#database, requestBody);
  }

  async handleRequest(requestBody: DomainCommand): Promise<CommandResult> {
    return processCommand(this.#database, requestBody);
  }
}
