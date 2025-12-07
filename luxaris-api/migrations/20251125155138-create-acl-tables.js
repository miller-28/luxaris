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

		-- ACL Permissions table
		-- Catalog of all possible permissions in the system
		CREATE SEQUENCE ${schema}.acl_permissions_id_seq;
		CREATE TABLE ${schema}.acl_permissions (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.acl_permissions_id_seq'),
			resource VARCHAR(100) NOT NULL,
			action VARCHAR(50) NOT NULL,
			condition JSONB DEFAULT NULL,
			description TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(resource, action, condition)
		);
		ALTER SEQUENCE ${schema}.acl_permissions_id_seq OWNED BY ${schema}.acl_permissions.id;

		-- ACL Roles table
		-- Named bundles of permissions
		CREATE SEQUENCE ${schema}.acl_roles_id_seq;
		CREATE TABLE ${schema}.acl_roles (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.acl_roles_id_seq'),
			name VARCHAR(100) NOT NULL,
			slug VARCHAR(100) NOT NULL UNIQUE,
			description TEXT,
			scope VARCHAR(50) DEFAULT 'global',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.acl_roles_id_seq OWNED BY ${schema}.acl_roles.id;

		-- ACL Role-Permission junction table
		-- Links roles to permissions
		CREATE SEQUENCE ${schema}.acl_role_permissions_id_seq;
		CREATE TABLE ${schema}.acl_role_permissions (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.acl_role_permissions_id_seq'),
			role_id INTEGER NOT NULL REFERENCES ${schema}.acl_roles(id) ON DELETE CASCADE,
			permission_id INTEGER NOT NULL REFERENCES ${schema}.acl_permissions(id) ON DELETE CASCADE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(role_id, permission_id)
		);
		ALTER SEQUENCE ${schema}.acl_role_permissions_id_seq OWNED BY ${schema}.acl_role_permissions.id;

		-- ACL Principal-Role assignments
		-- Assigns roles to users or service accounts
		CREATE SEQUENCE ${schema}.acl_principal_role_assignments_id_seq;
		CREATE TABLE ${schema}.acl_principal_role_assignments (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.acl_principal_role_assignments_id_seq'),
			principal_type VARCHAR(50) NOT NULL CHECK (principal_type IN ('user', 'service_account')),
			principal_id INTEGER NOT NULL,
			role_id INTEGER NOT NULL REFERENCES ${schema}.acl_roles(id) ON DELETE CASCADE,
			scope VARCHAR(100),
			scope_id INTEGER,
			assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.acl_principal_role_assignments_id_seq OWNED BY ${schema}.acl_principal_role_assignments.id;

		CREATE UNIQUE INDEX idx_acl_principal_role_unique 
			ON ${schema}.acl_principal_role_assignments(principal_type, principal_id, role_id, COALESCE(scope, ''), COALESCE(scope_id::text, ''));

		-- ACL Direct permission grants (optional exceptional access)
		-- Allows granting specific permissions directly to principals
		CREATE SEQUENCE ${schema}.acl_principal_permission_grants_id_seq;
		CREATE TABLE ${schema}.acl_principal_permission_grants (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.acl_principal_permission_grants_id_seq'),
			principal_type VARCHAR(50) NOT NULL CHECK (principal_type IN ('user', 'service_account')),
			principal_id INTEGER NOT NULL,
			permission_id INTEGER NOT NULL REFERENCES ${schema}.acl_permissions(id) ON DELETE CASCADE,
			scope VARCHAR(100),
			scope_id INTEGER,
			condition_override JSONB DEFAULT NULL,
			granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.acl_principal_permission_grants_id_seq OWNED BY ${schema}.acl_principal_permission_grants.id;

		CREATE UNIQUE INDEX idx_acl_principal_permission_unique 
			ON ${schema}.acl_principal_permission_grants(principal_type, principal_id, permission_id, COALESCE(scope, ''), COALESCE(scope_id::text, ''));

		-- Indexes for performance
		CREATE INDEX idx_acl_role_permissions_role_id ON ${schema}.acl_role_permissions(role_id);
		CREATE INDEX idx_acl_role_permissions_permission_id ON ${schema}.acl_role_permissions(permission_id);
		CREATE INDEX idx_acl_principal_role_assignments_principal ON ${schema}.acl_principal_role_assignments(principal_type, principal_id);
		CREATE INDEX idx_acl_principal_role_assignments_role_id ON ${schema}.acl_principal_role_assignments(role_id);
		CREATE INDEX idx_acl_principal_permission_grants_principal ON ${schema}.acl_principal_permission_grants(principal_type, principal_id);
		CREATE INDEX idx_acl_principal_permission_grants_permission_id ON ${schema}.acl_principal_permission_grants(permission_id);
		CREATE INDEX idx_acl_permissions_resource_action ON ${schema}.acl_permissions(resource, action);
	`);
};

exports.down = async function(db) {
	
	const schema = process.env.DB_SCHEMA || 'luxaris';

    return db.runSql(`
		DROP TABLE IF EXISTS ${schema}.acl_principal_permission_grants CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.acl_principal_permission_grants_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.acl_principal_role_assignments CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.acl_principal_role_assignments_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.acl_role_permissions CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.acl_role_permissions_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.acl_roles CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.acl_roles_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.acl_permissions CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.acl_permissions_id_seq CASCADE;
	`);
};

exports._meta = {
    'version': 1
};
