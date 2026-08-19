import type { CommandApi } from '../api/commandApi';
import { encodeBytes } from '../domain/events';
import { GAME_ID, PACKAGE_ID } from './scenario';

export interface LoadProgress {
  completed: number;
  total: number;
  elapsedMs: number;
}

export async function generateLoad(
  api: CommandApi,
  count: number,
  report: (progress: LoadProgress) => void,
): Promise<void> {
  const startedAt = performance.now();
  for (let index = 0; index < count; index += 1) {
    if (index % 5 === 0) {
      await api.handleRequest({
        type: 'CreatePackage',
        actorUserId: 'user1',
        packageId: `load-package-${crypto.randomUUID()}`,
        gameId: GAME_ID,
        version: `load-${crypto.randomUUID()}`,
        releaseNotes: 'Generated load-test package.',
        published: index % 2 === 0,
      });
    } else {
      await api.handleRequest({
        type: 'AddChunk',
        actorUserId: 'user1',
        chunkId: `load-chunk-${crypto.randomUUID()}`,
        packageId: PACKAGE_ID,
        index: 1_000_000 + index + Math.floor(startedAt),
        bytesBase64: encodeBytes(
          Uint8Array.from({ length: 32 }, (_, byteIndex) => (index + byteIndex) % 256),
        ),
      });
    }
    if ((index + 1) % 25 === 0 || index + 1 === count) {
      report({ completed: index + 1, total: count, elapsedMs: performance.now() - startedAt });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
}
