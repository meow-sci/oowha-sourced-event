import type { DomainCommand } from '../domain/commands';
import { encodeBytes } from '../domain/events';
import { SYSTEM_USER_ID } from '../domain/model';

export const DEMO_USER_IDS = ['user1', 'user2', 'user3'] as const;
export const GAME_ID = 'game-oowha';
export const GAME_NAME = 'oowha';
export const PACKAGE_ID = 'package-oowha-v0.0.42';

export function seedCommands(): DomainCommand[] {
  const chunk = (index: number): DomainCommand => ({
    type: 'AddChunk',
    actorUserId: 'user1',
    chunkId: `chunk-v42-${index}`,
    packageId: PACKAGE_ID,
    index,
    bytesBase64: encodeBytes(Uint8Array.from({ length: 12 }, (_, offset) => index * 20 + offset)),
  });
  return [
    { type: 'CreateUser', actorUserId: 'user1', userId: 'user1', email: 'user1@meow.science' },
    {
      type: 'GrantPermission',
      actorUserId: SYSTEM_USER_ID,
      targetUserId: 'user1',
      permission: 'games:create',
    },
    {
      type: 'GrantPermission',
      actorUserId: SYSTEM_USER_ID,
      targetUserId: 'user1',
      permission: `${GAME_NAME}:owner`,
    },
    {
      type: 'CreateGame',
      actorUserId: 'user1',
      gameId: GAME_ID,
      name: GAME_NAME,
      description: 'A tiny downloadable game used to make event sourcing tangible.',
    },
    {
      type: 'CreatePackage',
      actorUserId: 'user1',
      packageId: PACKAGE_ID,
      gameId: GAME_ID,
      version: 'v0.0.42',
      releaseNotes: 'The answer, now with cats.',
      published: false,
    },
    chunk(0),
    chunk(1),
    chunk(2),
    { type: 'CreateUser', actorUserId: 'user2', userId: 'user2', email: 'user2@meow.science' },
    {
      type: 'GrantPermission',
      actorUserId: 'user1',
      targetUserId: 'user2',
      permission: `${GAME_NAME}:purchased`,
    },
    { type: 'CreateUser', actorUserId: 'user3', userId: 'user3', email: 'user3@meow.science' },
    {
      type: 'GrantPermission',
      actorUserId: 'user1',
      targetUserId: 'user3',
      permission: `${GAME_NAME}:purchased`,
    },
  ];
}

export type DemoScenario = 'allowed-package' | 'denied-package' | 'grant-purchase' | 'add-chunk';

export function commandForScenario(scenario: DemoScenario): DomainCommand {
  const suffix = crypto.randomUUID().slice(0, 8);
  switch (scenario) {
    case 'allowed-package':
      return {
        type: 'CreatePackage',
        actorUserId: 'user1',
        packageId: `package-demo-${suffix}`,
        gameId: GAME_ID,
        version: `v0.0.${Date.now().toString().slice(-4)}`,
        releaseNotes: 'Created through the visual command pipeline.',
        published: false,
      };
    case 'denied-package':
      return {
        type: 'CreatePackage',
        actorUserId: 'user2',
        packageId: `package-denied-${suffix}`,
        gameId: GAME_ID,
        version: `denied-${suffix}`,
        releaseNotes: 'This event must never be appended.',
        published: false,
      };
    case 'grant-purchase':
      return {
        type: 'GrantPermission',
        actorUserId: 'user1',
        targetUserId: 'user3',
        permission: `${GAME_NAME}:purchased`,
      };
    case 'add-chunk':
      return {
        type: 'AddChunk',
        actorUserId: 'user1',
        chunkId: `chunk-demo-${suffix}`,
        packageId: PACKAGE_ID,
        index: Number(Date.now().toString().slice(-6)),
        bytesBase64: encodeBytes(Uint8Array.from([79, 79, 87, 72, 65])),
      };
  }
}
