import type { ChunkId, GameId, PackageId, Permission, UserId } from './model';

export type DomainCommand =
  | { type: 'CreateUser'; actorUserId: UserId; userId: UserId; email: string }
  | { type: 'GrantPermission'; actorUserId: UserId; targetUserId: UserId; permission: Permission }
  | { type: 'CreateGame'; actorUserId: UserId; gameId: GameId; name: string; description: string }
  | {
      type: 'CreatePackage';
      actorUserId: UserId;
      packageId: PackageId;
      gameId: GameId;
      version: string;
      releaseNotes: string;
      published: boolean;
    }
  | {
      type: 'AddChunk';
      actorUserId: UserId;
      chunkId: ChunkId;
      packageId: PackageId;
      index: number;
      bytesBase64: string;
    };

export function describeCommand(command: DomainCommand): string {
  switch (command.type) {
    case 'CreateUser':
      return `${command.userId} registers ${command.email}`;
    case 'GrantPermission':
      return `${command.actorUserId} grants ${command.permission} to ${command.targetUserId}`;
    case 'CreateGame':
      return `${command.actorUserId} creates game ${command.name}`;
    case 'CreatePackage':
      return `${command.actorUserId} creates ${command.version} for ${command.gameId}`;
    case 'AddChunk':
      return `${command.actorUserId} adds chunk ${command.index} to ${command.packageId}`;
  }
}
