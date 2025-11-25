const { z } = require('zod');

// User status enum
const UserStatus = {
	ACTIVE: 'active',
	DISABLED: 'disabled',
	INVITED: 'invited',
	PENDING_VERIFICATION: 'pending_verification',
	PENDING_APPROVAL: 'pending_approval'
};

// Auth method enum
const AuthMethod = {
	PASSWORD: 'password',
	OAUTH: 'oauth'
};

// Validation schemas
const UserRegistrationSchema = z.object({
	email: z.string().email('Invalid email format').toLowerCase(),
	password: z.string()
		.min(8, 'Password must be at least 8 characters')
		.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
		.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
		.regex(/[0-9]/, 'Password must contain at least one number')
		.regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
		.optional(),
	name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
	timezone: z.string().default('UTC'),
	locale: z.string().default('en')
});

const UserLoginSchema = z.object({
	email: z.string().email('Invalid email format').toLowerCase(),
	password: z.string().min(1, 'Password is required')
});

const UserUpdateSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	timezone: z.string().optional(),
	locale: z.string().optional(),
	avatar_url: z.string().url().optional().nullable()
});

class User {
	constructor(data) {
		this.id = data.id;
		this.email = data.email;
		this.password_hash = data.password_hash;
		this.name = data.name;
		this.avatar_url = data.avatar_url;
		this.auth_method = data.auth_method || AuthMethod.PASSWORD;
		this.status = data.status || UserStatus.PENDING_APPROVAL;
		this.is_root = data.is_root || false;
		this.approved_by_user_id = data.approved_by_user_id;
		this.approved_at = data.approved_at;
		this.created_at = data.created_at;
		this.updated_at = data.updated_at;
		this.last_login_at = data.last_login_at;
		this.timezone = data.timezone || 'UTC';
		this.locale = data.locale || 'en';
	}

	// Check if user can login
	can_login() {
		return this.status === UserStatus.ACTIVE;
	}

	// Check if user is disabled
	is_disabled() {
		return this.status === UserStatus.DISABLED;
	}

	// Check if user needs approval
	needs_approval() {
		return this.status === UserStatus.PENDING_APPROVAL;
	}

	// Check if user has password authentication
	has_password_auth() {
		return this.auth_method === AuthMethod.PASSWORD && this.password_hash !== null;
	}

	// Check if user has OAuth authentication
	has_oauth_auth() {
		return this.auth_method === AuthMethod.OAUTH;
	}

	// Approve user (called by root user)
	approve(approver_user_id) {
		this.status = UserStatus.ACTIVE;
		this.approved_by_user_id = approver_user_id;
		this.approved_at = new Date();
		this.updated_at = new Date();
	}

	// Disable user
	disable() {
		this.status = UserStatus.DISABLED;
		this.updated_at = new Date();
	}

	// Enable user
	enable() {
		this.status = UserStatus.ACTIVE;
		this.updated_at = new Date();
	}

	// Update last login timestamp
	record_login() {
		this.last_login_at = new Date();
		this.updated_at = new Date();
	}

	// Safe representation for API responses (no password_hash)
	to_json() {
		return {
			id: this.id,
			email: this.email,
			name: this.name,
			avatar_url: this.avatar_url,
			auth_method: this.auth_method,
			status: this.status,
			is_root: this.is_root,
			timezone: this.timezone,
			locale: this.locale,
			created_at: this.created_at,
			last_login_at: this.last_login_at
		};
	}
}

module.exports = {
	User,
	UserStatus,
	AuthMethod,
	UserRegistrationSchema,
	UserLoginSchema,
	UserUpdateSchema
};
