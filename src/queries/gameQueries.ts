import type { DemoDatabase, SqlRow } from '../database/types';
import { hasPermission } from './securityQueries';

export interface GameListItem {
  gameId: string;
  name: string;
  description: string;
  canDownload: boolean;
}

export interface ChunkListItem {
  chunkId: string;
  packageVersion: string;
  index: number;
  size: number;
}

export async function listGames(database: DemoDatabase, userId: string): Promise<GameListItem[]> {
  const rows = (await database.all(
    'SELECT game_id, name, description FROM games ORDER BY name',
  )) as SqlRow[];
  const result: GameListItem[] = [];
  for (const row of rows) {
    const name = String(row.name);
    const canDownload =
      (await hasPermission(database, userId, `${name}:purchased`)) ||
      (await hasPermission(database, userId, `${name}:owner`));
    result.push({
      gameId: String(row.game_id),
      name,
      description: String(row.description),
      canDownload,
    });
  }
  return result;
}

export async function listChunksForGame(
  database: DemoDatabase,
  userId: string,
  gameName: string,
): Promise<ChunkListItem[]> {
  const purchased = await hasPermission(database, userId, `${gameName}:purchased`);
  const owner = await hasPermission(database, userId, `${gameName}:owner`);
  if (!purchased && !owner)
    throw new Error(`403: ${userId} needs ${gameName}:purchased or ${gameName}:owner`);
  const rows = (await database.all(
    `SELECT chunks.chunk_id, packages.version, chunks.chunk_index, chunks.size
     FROM chunks
     JOIN packages ON packages.package_id = chunks.package_id
     JOIN games ON games.game_id = packages.game_id
     WHERE games.name = ?
     ORDER BY packages.version, chunks.chunk_index`,
    gameName,
  )) as SqlRow[];
  return rows.map((row) => ({
    chunkId: String(row.chunk_id),
    packageVersion: String(row.version),
    index: Number(row.chunk_index),
    size: Number(row.size),
  }));
}
