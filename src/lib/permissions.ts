import { TrustLevel, UserRole } from './constants';
import { db } from './db';

/**
 * Action constants for permission checking
 */
export const ACTIONS = {
  // Article actions
  CREATE_ARTICLE: 'CREATE_ARTICLE',
  EDIT_ARTICLE: 'EDIT_ARTICLE',
  DELETE_ARTICLE: 'DELETE_ARTICLE',
  PUBLISH_ARTICLE: 'PUBLISH_ARTICLE',
  REVIEW_ARTICLE: 'REVIEW_ARTICLE',

  // Event actions
  CREATE_EVENT: 'CREATE_EVENT',
  EDIT_EVENT: 'EDIT_EVENT',
  DELETE_EVENT: 'DELETE_EVENT',
  PUBLISH_EVENT: 'PUBLISH_EVENT',

  // Marketplace actions
  CREATE_MARKETPLACE: 'CREATE_MARKETPLACE',
  EDIT_MARKETPLACE: 'EDIT_MARKETPLACE',
  DELETE_MARKETPLACE: 'DELETE_MARKETPLACE',

  // Help Wanted actions
  CREATE_HELP_WANTED: 'CREATE_HELP_WANTED',
  EDIT_HELP_WANTED: 'EDIT_HELP_WANTED',
  DELETE_HELP_WANTED: 'DELETE_HELP_WANTED',
  REVIEW_HELP_WANTED: 'REVIEW_HELP_WANTED',

  // Roadmap idea actions
  CREATE_ROADMAP_IDEA: 'CREATE_ROADMAP_IDEA',
  EDIT_ROADMAP_IDEA: 'EDIT_ROADMAP_IDEA',
  DELETE_ROADMAP_IDEA: 'DELETE_ROADMAP_IDEA',
  REVIEW_ROADMAP_IDEA: 'REVIEW_ROADMAP_IDEA',
  RANK_ROADMAP_IDEA: 'RANK_ROADMAP_IDEA',

  // Comment actions
  CREATE_COMMENT: 'CREATE_COMMENT',
  EDIT_COMMENT: 'EDIT_COMMENT',
  DELETE_COMMENT: 'DELETE_COMMENT',
  MODERATE_COMMENT: 'MODERATE_COMMENT',

  // User management
  MANAGE_USERS: 'MANAGE_USERS',
  BAN_USER: 'BAN_USER',
  VOUCH_USER: 'VOUCH_USER',
  REVOKE_TRUST: 'REVOKE_TRUST',

  // Admin actions
  MANAGE_COMMUNITY: 'MANAGE_COMMUNITY',
  MANAGE_MODERATORS: 'MANAGE_MODERATORS',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  CURATE_HOMEPAGE: 'CURATE_HOMEPAGE',
  DELETE_USER: 'DELETE_USER',
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];

/**
 * User type for permission checking
 */
export interface PermissionUser {
  id: string;
  trust_level: string;
  role: string;
  community_id?: string;
}

/**
 * Permission matrix mapping (trustLevel, role) -> Set of allowed actions
 * Based on AUTHORIZATION_AND_PERMISSIONS table from spec
 */
const permissionMatrix: Map<string, Set<Action>> = new Map();

// ANONYMOUS + READER
permissionMatrix.set('ANONYMOUS-READER', new Set([
  ACTIONS.CREATE_COMMENT,
]));

// REGISTERED + READER
permissionMatrix.set('REGISTERED-READER', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.VOUCH_USER,
]));

// REGISTERED + CONTRIBUTOR
permissionMatrix.set('REGISTERED-CONTRIBUTOR', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.EDIT_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.EDIT_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.EDIT_MARKETPLACE,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.VOUCH_USER,
]));

// TRUSTED + READER
permissionMatrix.set('TRUSTED-READER', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.EDIT_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.EDIT_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.EDIT_MARKETPLACE,
  ACTIONS.CREATE_HELP_WANTED,
  ACTIONS.EDIT_HELP_WANTED,
  ACTIONS.DELETE_HELP_WANTED,
  ACTIONS.CREATE_ROADMAP_IDEA,
  ACTIONS.EDIT_ROADMAP_IDEA,
  ACTIONS.DELETE_ROADMAP_IDEA,
  ACTIONS.RANK_ROADMAP_IDEA,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.DELETE_COMMENT,
  ACTIONS.VOUCH_USER,
]));

// TRUSTED + CONTRIBUTOR
permissionMatrix.set('TRUSTED-CONTRIBUTOR', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.EDIT_ARTICLE,
  ACTIONS.DELETE_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.EDIT_EVENT,
  ACTIONS.DELETE_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.EDIT_MARKETPLACE,
  ACTIONS.DELETE_MARKETPLACE,
  ACTIONS.CREATE_HELP_WANTED,
  ACTIONS.EDIT_HELP_WANTED,
  ACTIONS.DELETE_HELP_WANTED,
  ACTIONS.CREATE_ROADMAP_IDEA,
  ACTIONS.EDIT_ROADMAP_IDEA,
  ACTIONS.DELETE_ROADMAP_IDEA,
  ACTIONS.RANK_ROADMAP_IDEA,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.DELETE_COMMENT,
  ACTIONS.VOUCH_USER,
]));

// TRUSTED + STAFF_WRITER
permissionMatrix.set('TRUSTED-STAFF_WRITER', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.EDIT_ARTICLE,
  ACTIONS.DELETE_ARTICLE,
  ACTIONS.PUBLISH_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.EDIT_EVENT,
  ACTIONS.DELETE_EVENT,
  ACTIONS.PUBLISH_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.EDIT_MARKETPLACE,
  ACTIONS.DELETE_MARKETPLACE,
  ACTIONS.CREATE_HELP_WANTED,
  ACTIONS.EDIT_HELP_WANTED,
  ACTIONS.DELETE_HELP_WANTED,
  ACTIONS.REVIEW_HELP_WANTED,
  ACTIONS.CREATE_ROADMAP_IDEA,
  ACTIONS.EDIT_ROADMAP_IDEA,
  ACTIONS.DELETE_ROADMAP_IDEA,
  ACTIONS.REVIEW_ROADMAP_IDEA,
  ACTIONS.RANK_ROADMAP_IDEA,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.DELETE_COMMENT,
  ACTIONS.MODERATE_COMMENT,
  ACTIONS.VOUCH_USER,
]));

// TRUSTED + EDITOR
permissionMatrix.set('TRUSTED-EDITOR', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.EDIT_ARTICLE,
  ACTIONS.DELETE_ARTICLE,
  ACTIONS.PUBLISH_ARTICLE,
  ACTIONS.REVIEW_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.EDIT_EVENT,
  ACTIONS.DELETE_EVENT,
  ACTIONS.PUBLISH_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.EDIT_MARKETPLACE,
  ACTIONS.DELETE_MARKETPLACE,
  ACTIONS.CREATE_HELP_WANTED,
  ACTIONS.EDIT_HELP_WANTED,
  ACTIONS.DELETE_HELP_WANTED,
  ACTIONS.REVIEW_HELP_WANTED,
  ACTIONS.CREATE_ROADMAP_IDEA,
  ACTIONS.EDIT_ROADMAP_IDEA,
  ACTIONS.DELETE_ROADMAP_IDEA,
  ACTIONS.REVIEW_ROADMAP_IDEA,
  ACTIONS.RANK_ROADMAP_IDEA,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.DELETE_COMMENT,
  ACTIONS.MODERATE_COMMENT,
  ACTIONS.MANAGE_USERS,
  ACTIONS.VOUCH_USER,
  ACTIONS.CURATE_HOMEPAGE,
]));

// TRUSTED + ADMIN
permissionMatrix.set('TRUSTED-ADMIN', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.EDIT_ARTICLE,
  ACTIONS.DELETE_ARTICLE,
  ACTIONS.PUBLISH_ARTICLE,
  ACTIONS.REVIEW_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.EDIT_EVENT,
  ACTIONS.DELETE_EVENT,
  ACTIONS.PUBLISH_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.EDIT_MARKETPLACE,
  ACTIONS.DELETE_MARKETPLACE,
  ACTIONS.CREATE_HELP_WANTED,
  ACTIONS.EDIT_HELP_WANTED,
  ACTIONS.DELETE_HELP_WANTED,
  ACTIONS.REVIEW_HELP_WANTED,
  ACTIONS.CREATE_ROADMAP_IDEA,
  ACTIONS.EDIT_ROADMAP_IDEA,
  ACTIONS.DELETE_ROADMAP_IDEA,
  ACTIONS.REVIEW_ROADMAP_IDEA,
  ACTIONS.RANK_ROADMAP_IDEA,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.DELETE_COMMENT,
  ACTIONS.MODERATE_COMMENT,
  ACTIONS.MANAGE_USERS,
  ACTIONS.BAN_USER,
  ACTIONS.VOUCH_USER,
  ACTIONS.REVOKE_TRUST,
  ACTIONS.MANAGE_COMMUNITY,
  ACTIONS.MANAGE_MODERATORS,
  ACTIONS.VIEW_AUDIT_LOG,
  ACTIONS.CURATE_HOMEPAGE,
]));

// TRUSTED + SUPER_ADMIN
permissionMatrix.set('TRUSTED-SUPER_ADMIN', new Set([
  ACTIONS.CREATE_ARTICLE,
  ACTIONS.EDIT_ARTICLE,
  ACTIONS.DELETE_ARTICLE,
  ACTIONS.PUBLISH_ARTICLE,
  ACTIONS.REVIEW_ARTICLE,
  ACTIONS.CREATE_EVENT,
  ACTIONS.EDIT_EVENT,
  ACTIONS.DELETE_EVENT,
  ACTIONS.PUBLISH_EVENT,
  ACTIONS.CREATE_MARKETPLACE,
  ACTIONS.EDIT_MARKETPLACE,
  ACTIONS.DELETE_MARKETPLACE,
  ACTIONS.CREATE_HELP_WANTED,
  ACTIONS.EDIT_HELP_WANTED,
  ACTIONS.DELETE_HELP_WANTED,
  ACTIONS.REVIEW_HELP_WANTED,
  ACTIONS.CREATE_ROADMAP_IDEA,
  ACTIONS.EDIT_ROADMAP_IDEA,
  ACTIONS.DELETE_ROADMAP_IDEA,
  ACTIONS.REVIEW_ROADMAP_IDEA,
  ACTIONS.RANK_ROADMAP_IDEA,
  ACTIONS.CREATE_COMMENT,
  ACTIONS.EDIT_COMMENT,
  ACTIONS.DELETE_COMMENT,
  ACTIONS.MODERATE_COMMENT,
  ACTIONS.MANAGE_USERS,
  ACTIONS.BAN_USER,
  ACTIONS.VOUCH_USER,
  ACTIONS.REVOKE_TRUST,
  ACTIONS.MANAGE_COMMUNITY,
  ACTIONS.MANAGE_MODERATORS,
  ACTIONS.VIEW_AUDIT_LOG,
  ACTIONS.MANAGE_SETTINGS,
  ACTIONS.CURATE_HOMEPAGE,
  ACTIONS.DELETE_USER,
]));

// SUSPENDED users have no permissions
// No entry needed - checked explicitly in functions

/**
 * Get allowed actions for a user based on trust level and role
 */
function getAllowedActions(user: PermissionUser): Set<Action> {
  // Suspended users have no permissions
  if (user.trust_level === TrustLevel.SUSPENDED) {
    return new Set();
  }

  const key = `${user.trust_level}-${user.role}`;
  return permissionMatrix.get(key) || new Set();
}

/**
 * Check if a user can perform an action
 * @param user - User with trust level and role
 * @param action - Action to check
 * @returns true if user can perform action
 */
export function canPerformAction(user: PermissionUser, action: Action): boolean {
  if (!user || user.trust_level === TrustLevel.SUSPENDED) {
    return false;
  }

  const allowedActions = getAllowedActions(user);
  return allowedActions.has(action);
}

/**
 * Require permission - throws if user cannot perform action
 * @param user - User with trust level and role
 * @param action - Action to check
 * @throws Error if user cannot perform action
 */
export function requirePermission(user: PermissionUser | null, action: Action): asserts user is PermissionUser {
  if (!user) {
    throw new Error('User not found');
  }

  if (user.trust_level === TrustLevel.SUSPENDED) {
    throw new Error('User account is suspended');
  }

  if (!canPerformAction(user, action)) {
    throw new Error(
      `User does not have permission to perform action: ${action}`
    );
  }
}

/**
 * Check if user is an editor (EDITOR role or higher)
 */
export function isEditor(user: PermissionUser): boolean {
  return [UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
    user.role as UserRole
  );
}

/**
 * Check if user is an admin (ADMIN role or higher)
 */
export function isAdmin(user: PermissionUser): boolean {
  return [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
    user.role as UserRole
  );
}

/**
 * Check if user is staff (STAFF_WRITER role or higher)
 */
export function isStaff(user: PermissionUser): boolean {
  return [
    UserRole.STAFF_WRITER,
    UserRole.EDITOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ].includes(user.role as UserRole);
}

/**
 * Maps legacy permission strings (e.g. 'articles:create') to Action constants.
 * Used by checkPermission() for backwards compatibility with existing route handlers.
 */
const legacyPermissionMap: Record<string, Action> = {
  'upload:create':       ACTIONS.CREATE_MARKETPLACE,
  'articles:create':     ACTIONS.CREATE_ARTICLE,
  'articles:edit':       ACTIONS.EDIT_ARTICLE,
  'articles:delete':     ACTIONS.DELETE_ARTICLE,
  'articles:approve':    ACTIONS.REVIEW_ARTICLE,
  'events:create':       ACTIONS.CREATE_EVENT,
  'events:edit':         ACTIONS.EDIT_EVENT,
  'events:delete':       ACTIONS.DELETE_EVENT,
  'events:approve':      ACTIONS.PUBLISH_EVENT,
  'marketplace:create':  ACTIONS.CREATE_MARKETPLACE,
  'help-wanted:create':  ACTIONS.CREATE_HELP_WANTED,
  'help-wanted:edit':    ACTIONS.EDIT_HELP_WANTED,
  'help-wanted:delete':  ACTIONS.DELETE_HELP_WANTED,
  'help-wanted:approve': ACTIONS.REVIEW_HELP_WANTED,
  'roadmap:create':      ACTIONS.CREATE_ROADMAP_IDEA,
  'roadmap:edit':        ACTIONS.EDIT_ROADMAP_IDEA,
  'roadmap:delete':      ACTIONS.DELETE_ROADMAP_IDEA,
  'roadmap:approve':     ACTIONS.REVIEW_ROADMAP_IDEA,
  'roadmap:rank':        ACTIONS.RANK_ROADMAP_IDEA,
  'comments:create':     ACTIONS.CREATE_COMMENT,
  'comments:delete':     ACTIONS.DELETE_COMMENT,
  'comments:moderate':   ACTIONS.MODERATE_COMMENT,
  'users:vouch':         ACTIONS.VOUCH_USER,
  'users:block':         ACTIONS.BAN_USER,
  'users:view':          ACTIONS.CREATE_COMMENT,   // any registered user
  'messages:access':     ACTIONS.CREATE_COMMENT,   // any registered user
  'messages:send':       ACTIONS.CREATE_COMMENT,   // any registered user
  'trust:ban':           ACTIONS.BAN_USER,
  'trust:unban':         ACTIONS.BAN_USER,
  'trust:revoke':        ACTIONS.REVOKE_TRUST,
  'trust:reinstate':     ACTIONS.REVOKE_TRUST,
  'trust:graph':         ACTIONS.VIEW_AUDIT_LOG,
  'audit:view':          ACTIONS.VIEW_AUDIT_LOG,
  'homepage:pin':        ACTIONS.CURATE_HOMEPAGE,
  'settings:view':       ACTIONS.MANAGE_SETTINGS,
  'settings:update':     ACTIONS.MANAGE_SETTINGS,
  'users:delete':        ACTIONS.DELETE_USER,
};

/**
 * Legacy permission check — takes a role string and a 'resource:action' permission string.
 * Uses TRUSTED trust level since all authenticated API routes require at minimum a trusted user.
 * Prefer canPerformAction() for new code.
 */
export function checkPermission(userRole: string, permission: string): boolean {
  const action = legacyPermissionMap[permission];
  if (!action) return false;
  const user: PermissionUser = {
    id: '',
    trust_level: TrustLevel.TRUSTED,
    role: userRole,
  };
  return canPerformAction(user, action);
}

/**
 * Get user's permission summary
 */
export async function getUserPermissions(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      trustLevel: true,
      memberships: {
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!user) {
    return null;
  }

  const permissionUser: PermissionUser = {
    id: user.id,
    trust_level: user.trustLevel,
    role: user.memberships[0]?.role ?? UserRole.READER,
  };

  return {
    ...permissionUser,
    allowedActions: getAllowedActions(permissionUser),
    isEditor: isEditor(permissionUser),
    isAdmin: isAdmin(permissionUser),
    isStaff: isStaff(permissionUser),
  };
}
