const AclRepository = require('../../infrastructure/persistence/acl_repository');
const PermissionRepository = require('../../infrastructure/persistence/permission_repository');

class AclService {
    constructor() {
        this.acl_repository = new AclRepository();
        this.permission_repository = new PermissionRepository();
        this.permission_cache = new Map(); // Cache for permission lookups
    }

    /**
	 * Check if principal can perform action on resource
	 * This is the core authorization method
	 * 
	 * @param {string} principal_id - User or service account ID
	 * @param {string} principal_type - 'user' or 'service_account'
	 * @param {string} resource - Resource type (e.g., 'post', 'user', 'system_settings')
	 * @param {string} action - Action (e.g., 'read', 'write', 'delete')
	 * @param {object} context - Additional context for condition evaluation
	 * @param {string} context.scope - Optional scope (e.g., 'channel', 'account')
	 * @param {string} context.scope_id - Optional scope ID
	 * @param {boolean} context.is_root - Whether user is root (bypasses all checks)
	 * @param {object} context.resource_data - Resource-specific data for condition evaluation
	 * @returns {boolean}
	 */
    async can(principal_id, principal_type, resource, action, context = {}) {
        // Root users bypass all permission checks
        if (context.is_root === true) {
            return true;
        }

        // Get all permissions for the principal
        const permissions = await this.acl_repository.get_all_principal_permissions(
            principal_id,
            principal_type,
            context.scope || null,
            context.scope_id || null
        );

        // Check if any permission matches the requested resource and action
        for (const { permission, scope, scope_id } of permissions) {
            if (permission.matches(resource, action, context.resource_data || {})) {
                // If permission has scope, verify it matches context
                if (scope && context.scope && scope !== context.scope) {
                    continue;
                }
                if (scope_id && context.scope_id && scope_id !== context.scope_id) {
                    continue;
                }
                return true;
            }
        }

        return false;
    }

    /**
	 * Bulk check multiple permissions at once
	 * Returns object with results for each permission
	 */
    async can_bulk(principal_id, principal_type, checks, context = {}) {
        // Root users bypass all permission checks
        if (context.is_root === true) {
            const results = {};
            for (const check of checks) {
                results[`${check.resource}:${check.action}`] = true;
            }
            return results;
        }

        // Get all permissions once
        const permissions = await this.acl_repository.get_all_principal_permissions(
            principal_id,
            principal_type,
            context.scope || null,
            context.scope_id || null
        );

        // Check each requested permission
        const results = {};
        for (const check of checks) {
            const key = `${check.resource}:${check.action}`;
            results[key] = permissions.some(({ permission, scope, scope_id }) => {
                if (!permission.matches(check.resource, check.action, check.context || {})) {
                    return false;
                }
                if (scope && context.scope && scope !== context.scope) {
                    return false;
                }
                if (scope_id && context.scope_id && scope_id !== context.scope_id) {
                    return false;
                }
                return true;
            });
        }

        return results;
    }

    /**
	 * Assign role to principal
	 */
    async assign_role(principal_id, principal_type, role_id, scope = null, scope_id = null) {
        return this.acl_repository.assign_role(principal_id, principal_type, role_id, scope, scope_id);
    }

    /**
	 * Remove role from principal
	 */
    async remove_role(principal_id, principal_type, role_id, scope = null, scope_id = null) {
        return this.acl_repository.remove_role(principal_id, principal_type, role_id, scope, scope_id);
    }

    /**
	 * Get all roles for principal
	 */
    async get_roles(principal_id, principal_type, scope = null, scope_id = null) {
        return this.acl_repository.get_principal_roles(principal_id, principal_type, scope, scope_id);
    }

    /**
	 * Grant direct permission to principal
	 */
    async grant_permission(principal_id, principal_type, permission_id, scope = null, scope_id = null) {
        return this.acl_repository.grant_permission(principal_id, principal_type, permission_id, scope, scope_id);
    }

    /**
	 * Revoke direct permission from principal
	 */
    async revoke_permission(principal_id, principal_type, permission_id, scope = null, scope_id = null) {
        return this.acl_repository.revoke_permission(principal_id, principal_type, permission_id, scope, scope_id);
    }

    /**
	 * Get all direct permission grants for principal
	 */
    async get_grants(principal_id, principal_type, scope = null, scope_id = null) {
        return this.acl_repository.get_principal_grants(principal_id, principal_type, scope, scope_id);
    }

    /**
	 * Get all permissions (roles + grants) for principal
	 */
    async get_all_permissions(principal_id, principal_type, scope = null, scope_id = null) {
        return this.acl_repository.get_all_principal_permissions(principal_id, principal_type, scope, scope_id);
    }

    /**
	 * Get permission by resource and action (with caching)
	 */
    async get_permission(resource, action) {
        const key = `${resource}:${action}`;
		
        if (this.permission_cache.has(key)) {
            return this.permission_cache.get(key);
        }

        const permission = await this.permission_repository.find_by_resource_action(resource, action);
        this.permission_cache.set(key, permission);
		
        return permission;
    }

    /**
	 * Clear permission cache (call after permission changes)
	 */
    clear_cache() {
        this.permission_cache.clear();
    }
}

module.exports = AclService;
