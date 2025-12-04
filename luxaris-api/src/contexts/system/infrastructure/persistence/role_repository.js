const { Role } = require('../../domain/models/role');
const { Permission } = require('../../domain/models/permission');

class RoleRepository {
    constructor(db_pool) {
        this.db_pool = db_pool;
    }

    /**
	 * Find role by ID
	 */
    async find_by_id(role_id) {
        const result = await this.db_pool.query(
            'SELECT * FROM acl_roles WHERE id = $1',
            [role_id]
        );
        return result.rows[0] ? Role.from_db_row(result.rows[0]) : null;
    }

    /**
	 * Find role by slug
	 */
    async find_by_slug(slug) {
        const result = await this.db_pool.query(
            'SELECT * FROM acl_roles WHERE slug = $1',
            [slug]
        );
        return result.rows[0] ? Role.from_db_row(result.rows[0]) : null;
    }

    /**
	 * Find all roles
	 */
    async find_all() {
        const result = await this.db_pool.query(
            'SELECT * FROM acl_roles ORDER BY name'
        );
        return result.rows.map(row => Role.from_db_row(row));
    }

    /**
	 * Find roles by scope
	 */
    async find_by_scope(scope) {
        const result = await this.db_pool.query(
            'SELECT * FROM acl_roles WHERE scope = $1 ORDER BY name',
            [scope]
        );
        return result.rows.map(row => Role.from_db_row(row));
    }

    /**
	 * Create new role
	 */
    async create(role_data) {
        const result = await this.db_pool.query(
            `INSERT INTO acl_roles (name, slug, description, scope)
			 VALUES ($1, $2, $3, $4)
			 RETURNING *`,
            [
                role_data.name,
                role_data.slug,
                role_data.description || null,
                role_data.scope || 'global'
            ]
        );
        return Role.from_db_row(result.rows[0]);
    }

    /**
	 * Update role
	 */
    async update(role_id, update_data) {
        const updates = [];
        const values = [];
        let param_index = 1;

        if (update_data.name !== undefined) {
            updates.push(`name = $${param_index++}`);
            values.push(update_data.name);
        }

        if (update_data.description !== undefined) {
            updates.push(`description = $${param_index++}`);
            values.push(update_data.description);
        }

        if (update_data.scope !== undefined) {
            updates.push(`scope = $${param_index++}`);
            values.push(update_data.scope);
        }

        if (updates.length === 0) {
            return this.find_by_id(role_id);
        }

        updates.push('updated_at = NOW()');
        values.push(role_id);

        const result = await this.db_pool.query(
            `UPDATE acl_roles 
			 SET ${updates.join(', ')}
			 WHERE id = $${param_index}
			 RETURNING *`,
            values
        );

        return result.rows[0] ? Role.from_db_row(result.rows[0]) : null;
    }

    /**
	 * Delete role
	 */
    async delete(role_id) {
        const result = await this.db_pool.query(
            'DELETE FROM acl_roles WHERE id = $1 RETURNING *',
            [role_id]
        );
        return result.rowCount > 0;
    }

    /**
	 * Check if role exists by slug
	 */
    async exists(slug) {
        const result = await this.db_pool.query(
            'SELECT EXISTS(SELECT 1 FROM acl_roles WHERE slug = $1)',
            [slug]
        );
        return result.rows[0].exists;
    }

    /**
	 * Assign permission to role
	 */
    async assign_permission(role_id, permission_id) {
        await this.db_pool.query(
            `INSERT INTO acl_role_permissions (role_id, permission_id)
			 VALUES ($1, $2)
			 ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [role_id, permission_id]
        );
    }

    /**
	 * Remove permission from role
	 */
    async remove_permission(role_id, permission_id) {
        const result = await this.db_pool.query(
            'DELETE FROM acl_role_permissions WHERE role_id = $1 AND permission_id = $2',
            [role_id, permission_id]
        );
        return result.rowCount > 0;
    }

    /**
	 * Get all permissions for a role
	 */
    async get_permissions(role_id) {
        const result = await this.db_pool.query(
            `SELECT p.* FROM acl_permissions p
			 JOIN acl_role_permissions rp ON rp.permission_id = p.id
			 WHERE rp.role_id = $1
			 ORDER BY p.resource, p.action`,
            [role_id]
        );
        return result.rows.map(row => Permission.from_db_row(row));
    }

    /**
	 * Check if role has specific permission
	 */
    async has_permission(role_id, permission_id) {
        const result = await this.db_pool.query(
            'SELECT EXISTS(SELECT 1 FROM acl_role_permissions WHERE role_id = $1 AND permission_id = $2)',
            [role_id, permission_id]
        );
        return result.rows[0].exists;
    }

    /**
	 * Replace all permissions for a role
	 */
    async set_permissions(role_id, permission_ids) {
        const client = await this.db_pool.connect();
        try {
            await client.query('BEGIN');

            // Remove all existing permissions
            await client.query(
                'DELETE FROM acl_role_permissions WHERE role_id = $1',
                [role_id]
            );

            // Add new permissions
            if (permission_ids.length > 0) {
                const values = permission_ids.map((pid, idx) => `($1, $${idx + 2})`).join(', ');
                await client.query(
                    `INSERT INTO acl_role_permissions (role_id, permission_id) VALUES ${values}`,
                    [role_id, ...permission_ids]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = RoleRepository;
