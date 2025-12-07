'use strict';

let dbm;
let type;
let seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
    dbm = options.dbmigrate;
    type = dbm.dataType;
    seed = seedLink;
};

exports.up = async function(db) {
	
	const schema = process.env.DB_SCHEMA || 'luxaris';

    return db.runSql(`
		
		-- Insert default permissions for common resources
		-- System permissions
		INSERT INTO ${schema}.acl_permissions (resource, action, description) VALUES
			('user', 'read', 'View user information'),
			('user', 'create', 'Create new users'),
			('user', 'update', 'Update user information'),
			('user', 'delete', 'Delete users'),
			('user', 'approve', 'Approve pending user registrations'),
			('api_key', 'read', 'View API keys'),
			('api_key', 'create', 'Create API keys'),
			('api_key', 'delete', 'Delete API keys'),
			('system_settings', 'read', 'View system settings'),
			('system_settings', 'update', 'Update system settings');

		-- Post permissions
		INSERT INTO ${schema}.acl_permissions (resource, action, description) VALUES
			('post', 'read', 'View posts'),
			('post', 'create', 'Create posts'),
			('post', 'update', 'Update posts'),
			('post', 'delete', 'Delete posts'),
			('post', 'execute', 'Execute/publish posts');

		-- Channel permissions
		INSERT INTO ${schema}.acl_permissions (resource, action, description) VALUES
			('channel', 'read', 'View channels'),
			('channel', 'create', 'Create channels'),
			('channel', 'update', 'Update channels'),
			('channel', 'delete', 'Delete channels');

		-- Schedule permissions
		INSERT INTO ${schema}.acl_permissions (resource, action, description) VALUES
			('schedule', 'read', 'View schedules'),
			('schedule', 'create', 'Create schedules'),
			('schedule', 'update', 'Update schedules'),
			('schedule', 'delete', 'Delete schedules'),
			('schedule', 'execute', 'Execute scheduled tasks');

		-- Insert default roles
		INSERT INTO ${schema}.acl_roles (name, slug, description) VALUES
			('Admin', 'admin', 'Full access to all resources and administrative functions'),
			('Editor', 'editor', 'Can create, update, and delete posts, channels, and schedules'),
			('Viewer', 'viewer', 'Read-only access to posts, channels, and schedules');

		-- Assign permissions to Admin role (full access)
		INSERT INTO ${schema}.acl_role_permissions (role_id, permission_id)
		SELECT r.id, p.id
		FROM ${schema}.acl_roles r
		CROSS JOIN ${schema}.acl_permissions p
		WHERE r.slug = 'admin';

		-- Assign permissions to Editor role
		INSERT INTO ${schema}.acl_role_permissions (role_id, permission_id)
		SELECT r.id, p.id
		FROM ${schema}.acl_roles r
		CROSS JOIN ${schema}.acl_permissions p
		WHERE r.slug = 'editor'
		AND p.resource IN ('post', 'channel', 'schedule')
		AND p.action IN ('read', 'create', 'update', 'delete', 'execute');

		-- Assign permissions to Viewer role (read-only)
		INSERT INTO ${schema}.acl_role_permissions (role_id, permission_id)
		SELECT r.id, p.id
		FROM ${schema}.acl_roles r
		CROSS JOIN ${schema}.acl_permissions p
		WHERE r.slug = 'viewer'
		AND p.resource IN ('post', 'channel', 'schedule', 'user')
		AND p.action = 'read';
	`);
};

exports.down = async function(db) {
	
	const schema = process.env.DB_SCHEMA || 'luxaris';

    return db.runSql(`
		DELETE FROM ${schema}.acl_role_permissions;
		DELETE FROM ${schema}.acl_roles;
		DELETE FROM ${schema}.acl_permissions;
	`);
};

exports._meta = {
    'version': 1
};
