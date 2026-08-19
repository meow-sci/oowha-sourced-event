import type { ChunkId, GameId, PackageId, Permission, UserId } from './model';

interface EventMetadata {
  eventId: string;
  occurredAt: string;
  actorUserId: UserId;
}

export type DomainEvent =
  | (EventMetadata & { type: 'UserCreated'; payload: { userId: UserId; email: string } })
  | (EventMetadata & {
      type: 'PermissionGranted';
      payload: { targetUserId: UserId; permission: Permission };
    })
  | (EventMetadata & {
      type: 'GameCreated';
      payload: { gameId: GameId; name: string; description: string; ownerUserId: UserId };
    })
  | (EventMetadata & {
      type: 'PackageCreated';
      payload: {
        packageId: PackageId;
        gameId: GameId;
        version: string;
        releaseNotes: string;
        published: boolean;
      };
    })
  | (EventMetadata & {
      type: 'ChunkAdded';
      payload: {
        chunkId: ChunkId;
        packageId: PackageId;
        index: number;
        size: number;
        bytesBase64: string;
      };
    });

export interface StoredEvent {
  sequence: number;
  event: DomainEvent;
}

export function decodeBytes(encoded: string): Uint8Array {
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
}

export function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
