const { z } = require('zod');

// Validation schemas
const RoleSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100),
    description: z.string().optional().nullable(),
    scope: z.string().nullable().default('global'),
    created_at: z.date(),
    updated_at: z.date()
});

const CreateRoleSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/, 'Slug must contain only lowercase letters, numbers, hyphens, and underscores'),
    description: z.string().optional().nullable(),
    scope: z.string().default('global')
});

const UpdateRoleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional().nullable(),
    scope: z.string().optional()
});

class Role {
    constructor(data) {
        const validated = RoleSchema.parse(data);
        Object.assign(this, validated);
    }

    /**
	 * Convert role to JSON representation
	 */
    to_json() {
        return {
            id: this.id,
            name: this.name,
            slug: this.slug,
            description: this.description,
            scope: this.scope,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString()
        };
    }

    /**
	 * Check if role is a system role (owner, editor, viewer)
	 */
    is_system_role() {
        return ['owner', 'editor', 'viewer'].includes(this.slug);
    }

    /**
	 * Check if role can be deleted
	 */
    can_delete() {
        return !this.is_system_role();
    }

    /**
	 * Check if role can be modified
	 */
    can_modify() {
        // System roles can't be deleted but can have permissions modified
        return true;
    }

    /**
	 * Create role from database row
	 */
    static from_db_row(row) {
        return new Role({
            id: row.id,
            name: row.name,
            slug: row.slug,
            description: row.description,
            scope: row.scope,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        });
    }
}

module.exports = {
    Role,
    RoleSchema,
    CreateRoleSchema,
    UpdateRoleSchema
};
