const { z } = require('zod');

// Validation schemas
const PermissionSchema = z.object({
	id: z.string().uuid(),
	resource: z.string().min(1).max(100),
	action: z.string().min(1).max(50),
	condition: z.record(z.any()).optional().nullable(),
	description: z.string().optional().nullable(),
	created_at: z.date(),
	updated_at: z.date()
});

const CreatePermissionSchema = z.object({
	resource: z.string().min(1).max(100),
	action: z.string().min(1).max(50),
	condition: z.record(z.any()).optional().nullable(),
	description: z.string().optional().nullable()
});

class Permission {
	constructor(data) {
		const validated = PermissionSchema.parse(data);
		Object.assign(this, validated);
	}

	/**
	 * Convert permission to JSON representation
	 */
	to_json() {
		return {
			id: this.id,
			resource: this.resource,
			action: this.action,
			condition: this.condition,
			description: this.description,
			created_at: this.created_at.toISOString(),
			updated_at: this.updated_at.toISOString()
		};
	}

	/**
	 * Get permission key for caching/comparison
	 */
	get_key() {
		const condition_str = this.condition ? JSON.stringify(this.condition) : '';
		return `${this.resource}:${this.action}:${condition_str}`;
	}

	/**
	 * Check if permission matches a given resource and action
	 */
	matches(resource, action, condition = null) {
		if (this.resource !== resource || this.action !== action) {
			return false;
		}

		// If no condition required, permission matches
		if (!condition && !this.condition) {
			return true;
		}

		// If permission has no condition but one is required, it's a wildcard match
		if (!this.condition) {
			return true;
		}

		// Check if conditions match
		if (condition && this.condition) {
			return JSON.stringify(this.condition) === JSON.stringify(condition);
		}

		return false;
	}

	/**
	 * Create permission from database row
	 */
	static from_db_row(row) {
		return new Permission({
			id: row.id,
			resource: row.resource,
			action: row.action,
			condition: row.condition,
			description: row.description,
			created_at: new Date(row.created_at),
			updated_at: new Date(row.updated_at)
		});
	}
}

module.exports = {
	Permission,
	PermissionSchema,
	CreatePermissionSchema
};
