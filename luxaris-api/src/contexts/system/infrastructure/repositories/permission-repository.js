const { Permission } = require('../../domain/models/permission');
const connection_manager = require('../../../../core/infrastructure/connection-manager');

class PermissionRepository {
    
    /**
	 * Find permission by ID
	 */
    async find_by_id(permission_id) {
        const result = await connection_manager.get_db_pool().query(
            'SELECT * FROM acl_permissions WHERE id = $1',
            [permission_id]
        );
        return result.rows[0] ? Permission.from_db_row(result.rows[0]) : null;
    }

    /**
	 * Find permission by resource and action
	 */
    async find_by_resource_action(resource, action) {
        const result = await connection_manager.get_db_pool().query(
            'SELECT * FROM acl_permissions WHERE resource = $1 AND action = $2',
            [resource, action]
        );
        return result.rows[0] ? Permission.from_db_row(result.rows[0]) : null;
    }

    /**
	 * Find all permissions
	 */
    async find_all() {
        const result = await connection_manager.get_db_pool().query(
            'SELECT * FROM acl_permissions ORDER BY resource, action'
        );
        return result.rows.map(row => Permission.from_db_row(row));
    }

    /**
	 * Find permissions by resource
	 */
    async find_by_resource(resource) {
        const result = await connection_manager.get_db_pool().query(
            'SELECT * FROM acl_permissions WHERE resource = $1 ORDER BY action',
            [resource]
        );
        return result.rows.map(row => Permission.from_db_row(row));
    }

    /**
	 * Create new permission
	 */
    async create(permission_data) {
        const result = await connection_manager.get_db_pool().query(
            `INSERT INTO acl_permissions (resource, action, description, conditions)
			 VALUES ($1, $2, $3, $4)
			 RETURNING *`,
            [
                permission_data.resource,
                permission_data.action,
                permission_data.description || null,
                JSON.stringify(permission_data.conditions || {})
            ]
        );
        return Permission.from_db_row(result.rows[0]);
    }

    /**
	 * Update permission
	 */
    async update(permission_id, update_data) {
        const updates = [];
        const values = [];
        let param_index = 1;

        if (update_data.description !== undefined) {
            updates.push(`description = $${param_index++}`);
            values.push(update_data.description);
        }

        if (update_data.conditions !== undefined) {
            updates.push(`conditions = $${param_index++}`);
            values.push(JSON.stringify(update_data.conditions));
        }

        if (updates.length === 0) {
            return this.find_by_id(permission_id);
        }

        updates.push('updated_at = NOW()');
        values.push(permission_id);

        const result = await connection_manager.get_db_pool().query(
            `UPDATE acl_permissions 
			 SET ${updates.join(', ')}
			 WHERE id = $${param_index}
			 RETURNING *`,
            values
        );

        return result.rows[0] ? Permission.from_db_row(result.rows[0]) : null;
    }

    /**
	 * Delete permission
	 */
    async delete(permission_id) {
        const result = await connection_manager.get_db_pool().query(
            'DELETE FROM acl_permissions WHERE id = $1 RETURNING *',
            [permission_id]
        );
        return result.rowCount > 0;
    }

    /**
	 * Check if permission exists
	 */
    async exists(resource, action) {
        const result = await connection_manager.get_db_pool().query(
            'SELECT EXISTS(SELECT 1 FROM acl_permissions WHERE resource = $1 AND action = $2)',
            [resource, action]
        );
        return result.rows[0].exists;
    }
}

module.exports = PermissionRepository;
