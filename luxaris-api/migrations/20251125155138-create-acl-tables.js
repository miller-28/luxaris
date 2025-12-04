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

exports.up = function(db) {
    return db.runSql(`
		-- Create luxaris schema if not exists
		CREATE SCHEMA IF NOT EXISTS luxaris;

		-- ACL Permissions table
		-- Catalog of all possible permissions in the system
		CREATE TABLE acl_permissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			resource VARCHAR(100) NOT NULL,
			action VARCHAR(50) NOT NULL,
			condition JSONB DEFAULT NULL,
			description TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(resource, action, condition)
		);

		-- ACL Roles table
		-- Named bundles of permissions
		CREATE TABLE acl_roles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(100) NOT NULL,
			slug VARCHAR(100) NOT NULL UNIQUE,
			description TEXT,
			scope VARCHAR(50) DEFAULT 'global',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		-- ACL Role-Permission junction table
		-- Links roles to permissions
		CREATE TABLE acl_role_permissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			role_id UUID NOT NULL REFERENCES acl_roles(id) ON DELETE CASCADE,
			permission_id UUID NOT NULL REFERENCES acl_permissions(id) ON DELETE CASCADE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(role_id, permission_id)
		);

		-- ACL Principal-Role assignments
		-- Assigns roles to users or service accounts
		CREATE TABLE acl_principal_role_assignments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			principal_type VARCHAR(50) NOT NULL CHECK (principal_type IN ('user', 'service_account')),
			principal_id UUID NOT NULL,
			role_id UUID NOT NULL REFERENCES acl_roles(id) ON DELETE CASCADE,
			scope VARCHAR(100),
			scope_id UUID,
			assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		CREATE UNIQUE INDEX idx_acl_principal_role_unique 
			ON acl_principal_role_assignments(principal_type, principal_id, role_id, COALESCE(scope, ''), COALESCE(scope_id::text, ''));

		-- ACL Direct permission grants (optional exceptional access)
		-- Allows granting specific permissions directly to principals
		CREATE TABLE acl_principal_permission_grants (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			principal_type VARCHAR(50) NOT NULL CHECK (principal_type IN ('user', 'service_account')),
			principal_id UUID NOT NULL,
			permission_id UUID NOT NULL REFERENCES acl_permissions(id) ON DELETE CASCADE,
			scope VARCHAR(100),
			scope_id UUID,
			condition_override JSONB DEFAULT NULL,
			granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		CREATE UNIQUE INDEX idx_acl_principal_permission_unique 
			ON acl_principal_permission_grants(principal_type, principal_id, permission_id, COALESCE(scope, ''), COALESCE(scope_id::text, ''));

		-- Indexes for performance
		CREATE INDEX idx_acl_role_permissions_role_id ON acl_role_permissions(role_id);
		CREATE INDEX idx_acl_role_permissions_permission_id ON acl_role_permissions(permission_id);
		CREATE INDEX idx_acl_principal_role_assignments_principal ON acl_principal_role_assignments(principal_type, principal_id);
		CREATE INDEX idx_acl_principal_role_assignments_role_id ON acl_principal_role_assignments(role_id);
		CREATE INDEX idx_acl_principal_permission_grants_principal ON acl_principal_permission_grants(principal_type, principal_id);
		CREATE INDEX idx_acl_principal_permission_grants_permission_id ON acl_principal_permission_grants(permission_id);
		CREATE INDEX idx_acl_permissions_resource_action ON acl_permissions(resource, action);
	`);
};

exports.down = function(db) {
    return db.runSql(`
		DROP TABLE IF EXISTS acl_principal_permission_grants CASCADE;
		DROP TABLE IF EXISTS acl_principal_role_assignments CASCADE;
		DROP TABLE IF EXISTS acl_role_permissions CASCADE;
		DROP TABLE IF EXISTS acl_roles CASCADE;
		DROP TABLE IF EXISTS acl_permissions CASCADE;
	`);
};

exports._meta = {
    'version': 1
};
