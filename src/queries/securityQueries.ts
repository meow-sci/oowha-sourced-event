import type { DomainCommand } from '../domain/commands';
import { SYSTEM_USER_ID } from '../domain/model';
import type { DemoDatabase, SqlRow } from '../database/types';

export interface AuthorizationDecision {
  allowed: boolean;
  requiredPermission: string | null;
  explanation: string;
}

export async function authorizeCommand(
  database: DemoDatabase,
  command: DomainCommand,
): Promise<AuthorizationDecision> {
  if (command.type === 'CreateUser') {
    return { allowed: true, requiredPermission: null, explanation: 'Self-registration is public.' };
  }
  if (command.actorUserId === SYSTEM_USER_ID) {
    return {
      allowed: true,
      requiredPermission: null,
      explanation: 'The trusted bootstrap actor bypasses domain authorization.',
    };
  }

  const requiredPermission = await permissionForCommand(database, command);
  if (!requiredPermission) {
    return {
      allowed: false,
      requiredPermission: null,
      explanation: 'Only the trusted system actor can grant platform permissions.',
    };
  }
  const allowed = await hasPermission(database, command.actorUserId, requiredPermission);
  return {
    allowed,
    requiredPermission,
    explanation: allowed
      ? `${command.actorUserId} has ${requiredPermission} in the user_permissions projection.`
      : `${command.actorUserId} does not have ${requiredPermission} in the user_permissions projection.`,
  };
}

export async function hasPermission(
  database: DemoDatabase,
  userId: string,
  permission: string,
): Promise<boolean> {
  const row = (await database.get(
    'SELECT 1 AS present FROM user_permissions WHERE user_id = ? AND permission = ?',
    userId,
    permission,
  )) as SqlRow | undefined;
  return row !== undefined;
}

async function permissionForCommand(
  database: DemoDatabase,
  command: Exclude<DomainCommand, { type: 'CreateUser' }>,
): Promise<string | null> {
  switch (command.type) {
    case 'GrantPermission': {
      const separator = command.permission.indexOf(':');
      return separator > 0 && !command.permission.startsWith('games:')
        ? `${command.permission.slice(0, separator)}:owner`
        : null;
    }
    case 'CreateGame':
      return 'games:create';
    case 'CreatePackage': {
      const row = (await database.get(
        'SELECT name FROM games WHERE game_id = ?',
        command.gameId,
      )) as SqlRow | undefined;
      return row ? `${String(row.name)}:owner` : null;
    }
    case 'AddChunk': {
      const row = (await database.get(
        `SELECT games.name FROM packages
         JOIN games ON games.game_id = packages.game_id
         WHERE packages.package_id = ?`,
        command.packageId,
      )) as SqlRow | undefined;
      return row ? `${String(row.name)}:owner` : null;
    }
  }
}
