export type UserId = string;
export type GameId = string;
export type PackageId = string;
export type ChunkId = string;
export type Permission = string;

export const SYSTEM_USER_ID = 'system';

export interface User {
  id: UserId;
  email: string;
  permissions: Permission[];
}
export interface Game {
  id: GameId;
  name: string;
  description: string;
  ownerIds: UserId[];
}
export interface Package {
  id: PackageId;
  gameId: GameId;
  version: string;
  releaseNotes: string;
  published: boolean;
}
export interface Chunk {
  id: ChunkId;
  packageId: PackageId;
  index: number;
  size: number;
  bytes: Uint8Array;
}
