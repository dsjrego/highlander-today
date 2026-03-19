import {
  ACTIONS,
  canPerformAction,
  isAdmin,
  isEditor,
  isStaff,
  requirePermission,
  type PermissionUser,
} from '@/lib/permissions';

function createPermissionUser(
  overrides: Partial<PermissionUser> = {}
): PermissionUser {
  return {
    id: 'user-1',
    trust_level: 'TRUSTED',
    role: 'READER',
    community_id: 'community-1',
    ...overrides,
  };
}

describe('TR-002: Role-Based Permissions', () => {
  describe('permission matrix', () => {
    it('denies all actions for suspended users', () => {
      const suspendedUser = createPermissionUser({
        trust_level: 'SUSPENDED',
        role: 'ADMIN',
      });

      expect(canPerformAction(suspendedUser, ACTIONS.CREATE_ARTICLE)).toBe(false);
      expect(canPerformAction(suspendedUser, ACTIONS.MANAGE_USERS)).toBe(false);
      expect(canPerformAction(suspendedUser, ACTIONS.DELETE_USER)).toBe(false);
    });

    it('allows registered readers to create marketplace content but not edit it', () => {
      const registeredReader = createPermissionUser({
        trust_level: 'REGISTERED',
        role: 'READER',
      });

      expect(canPerformAction(registeredReader, ACTIONS.CREATE_MARKETPLACE)).toBe(true);
      expect(canPerformAction(registeredReader, ACTIONS.CREATE_COMMENT)).toBe(true);
      expect(canPerformAction(registeredReader, ACTIONS.EDIT_MARKETPLACE)).toBe(false);
      expect(canPerformAction(registeredReader, ACTIONS.DELETE_MARKETPLACE)).toBe(false);
    });

    it('allows trusted contributors to delete their own content class of actions', () => {
      const trustedContributor = createPermissionUser({
        trust_level: 'TRUSTED',
        role: 'CONTRIBUTOR',
      });

      expect(canPerformAction(trustedContributor, ACTIONS.DELETE_ARTICLE)).toBe(true);
      expect(canPerformAction(trustedContributor, ACTIONS.DELETE_EVENT)).toBe(true);
      expect(canPerformAction(trustedContributor, ACTIONS.DELETE_MARKETPLACE)).toBe(true);
      expect(canPerformAction(trustedContributor, ACTIONS.MODERATE_COMMENT)).toBe(false);
      expect(canPerformAction(trustedContributor, ACTIONS.MANAGE_USERS)).toBe(false);
    });

    it('allows staff writers to publish but not review articles', () => {
      const staffWriter = createPermissionUser({
        trust_level: 'TRUSTED',
        role: 'STAFF_WRITER',
      });

      expect(canPerformAction(staffWriter, ACTIONS.PUBLISH_ARTICLE)).toBe(true);
      expect(canPerformAction(staffWriter, ACTIONS.PUBLISH_EVENT)).toBe(true);
      expect(canPerformAction(staffWriter, ACTIONS.REVIEW_ARTICLE)).toBe(false);
      expect(canPerformAction(staffWriter, ACTIONS.MANAGE_USERS)).toBe(false);
    });

    it('allows editors to review articles and curate homepage without admin powers', () => {
      const editor = createPermissionUser({
        trust_level: 'TRUSTED',
        role: 'EDITOR',
      });

      expect(canPerformAction(editor, ACTIONS.REVIEW_ARTICLE)).toBe(true);
      expect(canPerformAction(editor, ACTIONS.CURATE_HOMEPAGE)).toBe(true);
      expect(canPerformAction(editor, ACTIONS.BAN_USER)).toBe(false);
      expect(canPerformAction(editor, ACTIONS.DELETE_USER)).toBe(false);
    });

    it('allows admins to manage trust and moderation but not super-admin-only deletion', () => {
      const admin = createPermissionUser({
        trust_level: 'TRUSTED',
        role: 'ADMIN',
      });

      expect(canPerformAction(admin, ACTIONS.BAN_USER)).toBe(true);
      expect(canPerformAction(admin, ACTIONS.REVOKE_TRUST)).toBe(true);
      expect(canPerformAction(admin, ACTIONS.VIEW_AUDIT_LOG)).toBe(true);
      expect(canPerformAction(admin, ACTIONS.DELETE_USER)).toBe(false);
    });

    it('allows super admins to perform every high privilege action', () => {
      const superAdmin = createPermissionUser({
        trust_level: 'TRUSTED',
        role: 'SUPER_ADMIN',
      });

      expect(canPerformAction(superAdmin, ACTIONS.BAN_USER)).toBe(true);
      expect(canPerformAction(superAdmin, ACTIONS.MANAGE_SETTINGS)).toBe(true);
      expect(canPerformAction(superAdmin, ACTIONS.DELETE_USER)).toBe(true);
    });
  });

  describe('guards and role helpers', () => {
    it('requirePermission throws for missing user', () => {
      expect(() => requirePermission(null, ACTIONS.CREATE_ARTICLE)).toThrow(
        'User not found'
      );
    });

    it('requirePermission throws for suspended users', () => {
      const suspendedUser = createPermissionUser({
        trust_level: 'SUSPENDED',
      });

      expect(() =>
        requirePermission(suspendedUser, ACTIONS.CREATE_ARTICLE)
      ).toThrow('User account is suspended');
    });

    it('requirePermission throws when action is not permitted', () => {
      const reader = createPermissionUser({
        trust_level: 'TRUSTED',
        role: 'READER',
      });

      expect(() =>
        requirePermission(reader, ACTIONS.MANAGE_USERS)
      ).toThrow(`User does not have permission to perform action: ${ACTIONS.MANAGE_USERS}`);
    });

    it('role helpers identify editor, staff, and admin boundaries correctly', () => {
      const reader = createPermissionUser({ role: 'READER' });
      const editor = createPermissionUser({ role: 'EDITOR' });
      const admin = createPermissionUser({ role: 'ADMIN' });

      expect(isStaff(reader)).toBe(false);
      expect(isEditor(reader)).toBe(false);
      expect(isAdmin(reader)).toBe(false);

      expect(isStaff(editor)).toBe(true);
      expect(isEditor(editor)).toBe(true);
      expect(isAdmin(editor)).toBe(false);

      expect(isStaff(admin)).toBe(true);
      expect(isEditor(admin)).toBe(true);
      expect(isAdmin(admin)).toBe(true);
    });
  });
});
