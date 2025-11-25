const { Permission } = require('../../domain/models/permission');
const { Role } = require('../../domain/models/role');

class AclRepository {
	constructor(db_pool) {
		this.db_pool = db_pool;
	}

	/**
	 * Assign role to principal (user or service account)
	 */
	async assign_role(principal_id, principal_type, role_id, scope = null, scope_id = null) {
		const result = await this.db_pool.query(
			`INSERT INTO acl_principal_role_assignments (principal_id, principal_type, role_id, scope, scope_id)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (principal_id, principal_type, role_id, COALESCE(scope, ''), COALESCE(scope_id::text, '')) DO NOTHING
			 RETURNING *`,
			[principal_id, principal_type, role_id, scope, scope_id]
		);
		return result.rowCount > 0;
	}

	/**
	 * Remove role from principal
	 */
	async remove_role(principal_id, principal_type, role_id, scope = null, scope_id = null) {
		const result = await this.db_pool.query(
			`DELETE FROM acl_principal_role_assignments 
			 WHERE principal_id = $1 AND principal_type = $2 AND role_id = $3
			 AND (scope = $4 OR (scope IS NULL AND $4 IS NULL))
			 AND (scope_id = $5 OR (scope_id IS NULL AND $5 IS NULL))`,
			[principal_id, principal_type, role_id, scope, scope_id]
		);
		return result.rowCount > 0;
	}

	/**
	 * Get all roles assigned to a principal
	 */
	async get_principal_roles(principal_id, principal_type, scope = null, scope_id = null) {
		let query = `
			SELECT r.*, pra.scope, pra.scope_id, pra.assigned_at
			FROM acl_roles r
			JOIN acl_principal_role_assignments pra ON pra.role_id = r.id
			WHERE pra.principal_id = $1 AND pra.principal_type = $2
		`;
		const params = [principal_id, principal_type];
		let param_index = 3;

		if (scope !== null) {
			query += ` AND pra.scope = $${param_index++}`;
			params.push(scope);
		}

		if (scope_id !== null) {
			query += ` AND pra.scope_id = $${param_index++}`;
			params.push(scope_id);
		}

		query += ' ORDER BY r.name';

		const result = await this.db_pool.query(query, params);
		return result.rows.map(row => ({
			role: Role.from_db_row(row),
			scope: row.scope,
			scope_id: row.scope_id,
			assigned_at: row.assigned_at
		}));
	}

	/**
	 * Grant direct permission to principal
	 */
	async grant_permission(principal_id, principal_type, permission_id, scope = null, scope_id = null) {
		const result = await this.db_pool.query(
			`INSERT INTO acl_principal_permission_grants (principal_id, principal_type, permission_id, scope, scope_id)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (principal_id, principal_type, permission_id, COALESCE(scope, ''), COALESCE(scope_id::text, '')) DO NOTHING
			 RETURNING *`,
			[principal_id, principal_type, permission_id, scope, scope_id]
		);
		return result.rowCount > 0;
	}

	/**
	 * Revoke direct permission from principal
	 */
	async revoke_permission(principal_id, principal_type, permission_id, scope = null, scope_id = null) {
		const result = await this.db_pool.query(
			`DELETE FROM acl_principal_permission_grants 
			 WHERE principal_id = $1 AND principal_type = $2 AND permission_id = $3
			 AND (scope = $4 OR (scope IS NULL AND $4 IS NULL))
			 AND (scope_id = $5 OR (scope_id IS NULL AND $5 IS NULL))`,
			[principal_id, principal_type, permission_id, scope, scope_id]
		);
		return result.rowCount > 0;
	}

	/**
	 * Get all direct permission grants for a principal
	 */
	async get_principal_grants(principal_id, principal_type, scope = null, scope_id = null) {
		let query = `
			SELECT p.*, ppg.scope, ppg.scope_id, ppg.granted_at
			FROM acl_permissions p
			JOIN acl_principal_permission_grants ppg ON ppg.permission_id = p.id
			WHERE ppg.principal_id = $1 AND ppg.principal_type = $2
		`;
		const params = [principal_id, principal_type];
		let param_index = 3;

		if (scope !== null) {
			query += ` AND ppg.scope = $${param_index++}`;
			params.push(scope);
		}

		if (scope_id !== null) {
			query += ` AND ppg.scope_id = $${param_index++}`;
			params.push(scope_id);
		}

		query += ' ORDER BY p.resource, p.action';

		const result = await this.db_pool.query(query, params);
		return result.rows.map(row => ({
			permission: Permission.from_db_row(row),
			scope: row.scope,
			scope_id: row.scope_id,
			granted_at: row.granted_at
		}));
	}

	/**
	 * Get all permissions for a principal (from roles + direct grants)
	 * This is the core query for permission checking
	 */
	async get_all_principal_permissions(principal_id, principal_type, scope = null, scope_id = null) {
		let query = `
			SELECT DISTINCT p.*, 
			       COALESCE(ppg.scope, pra.scope) as permission_scope,
			       COALESCE(ppg.scope_id, pra.scope_id) as permission_scope_id
			FROM acl_permissions p
			LEFT JOIN acl_principal_permission_grants ppg 
			  ON ppg.permission_id = p.id 
			  AND ppg.principal_id = $1 
			  AND ppg.principal_type = $2
			LEFT JOIN acl_principal_role_assignments pra 
			  ON pra.principal_id = $1 
			  AND pra.principal_type = $2
			LEFT JOIN acl_role_permissions rp 
			  ON rp.role_id = pra.role_id 
			  AND rp.permission_id = p.id
			WHERE (ppg.id IS NOT NULL OR rp.id IS NOT NULL)
		`;
		const params = [principal_id, principal_type];
		let param_index = 3;

		if (scope !== null) {
			query += ` AND (
				(ppg.scope = $${param_index} OR ppg.scope IS NULL) OR
				(pra.scope = $${param_index} OR pra.scope IS NULL)
			)`;
			params.push(scope);
			param_index++;
		}

		if (scope_id !== null) {
			query += ` AND (
				(ppg.scope_id = $${param_index} OR ppg.scope_id IS NULL) OR
				(pra.scope_id = $${param_index} OR pra.scope_id IS NULL)
			)`;
			params.push(scope_id);
		}

		query += ' ORDER BY p.resource, p.action';

		const result = await this.db_pool.query(query, params);
		return result.rows.map(row => ({
			permission: Permission.from_db_row(row),
			scope: row.permission_scope,
			scope_id: row.permission_scope_id
		}));
	}

	/**
	 * Check if principal has specific permission
	 */
	async has_permission(principal_id, principal_type, resource, action, scope = null, scope_id = null) {
		let query = `
			SELECT EXISTS(
				SELECT 1 FROM acl_permissions p
				LEFT JOIN acl_principal_permission_grants ppg 
				  ON ppg.permission_id = p.id 
				  AND ppg.principal_id = $1 
				  AND ppg.principal_type = $2
				LEFT JOIN acl_principal_role_assignments pra 
				  ON pra.principal_id = $1 
				  AND pra.principal_type = $2
				LEFT JOIN acl_role_permissions rp 
				  ON rp.role_id = pra.role_id 
				  AND rp.permission_id = p.id
				WHERE p.resource = $3 AND p.action = $4
				AND (ppg.id IS NOT NULL OR rp.id IS NOT NULL)
		`;
		const params = [principal_id, principal_type, resource, action];
		let param_index = 5;

		if (scope !== null) {
			query += ` AND (
				(ppg.scope = $${param_index} OR ppg.scope IS NULL) OR
				(pra.scope = $${param_index} OR pra.scope IS NULL)
			)`;
			params.push(scope);
			param_index++;
		}

		if (scope_id !== null) {
			query += ` AND (
				(ppg.scope_id = $${param_index} OR ppg.scope_id IS NULL) OR
				(pra.scope_id = $${param_index} OR pra.scope_id IS NULL)
			)`;
			params.push(scope_id);
		}

		query += ')';

		const result = await this.db_pool.query(query, params);
		return result.rows[0].exists;
	}

	/**
	 * Remove all role assignments for a principal
	 */
	async remove_all_roles(principal_id, principal_type) {
		const result = await this.db_pool.query(
			'DELETE FROM acl_principal_role_assignments WHERE principal_id = $1 AND principal_type = $2',
			[principal_id, principal_type]
		);
		return result.rowCount;
	}

	/**
	 * Remove all permission grants for a principal
	 */
	async remove_all_grants(principal_id, principal_type) {
		const result = await this.db_pool.query(
			'DELETE FROM acl_principal_permission_grants WHERE principal_id = $1 AND principal_type = $2',
			[principal_id, principal_type]
		);
		return result.rowCount;
	}
}

module.exports = AclRepository;
