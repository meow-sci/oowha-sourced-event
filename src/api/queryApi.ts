import type { DemoDatabase } from '../database/types';
import { listChunksForGame, listGames } from '../queries/gameQueries';

/** Typed, query-only equivalents of GET /games and GET /games/:name/chunks. */
export class QueryApi {
  readonly #database: DemoDatabase;

  constructor(database: DemoDatabase) {
    this.#database = database;
  }

  async getGames(userId: string) {
    return listGames(this.#database, userId);
  }

  async getGameChunks(userId: string, gameName: string) {
    return listChunksForGame(this.#database, userId, gameName);
  }
}
