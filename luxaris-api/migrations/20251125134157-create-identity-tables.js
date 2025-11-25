'use strict';

var dbm;
var type;
var seed;

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

		-- Users table
		CREATE TABLE users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash TEXT,
			name VARCHAR(255) NOT NULL,
			avatar_url TEXT,
			auth_method VARCHAR(50) NOT NULL DEFAULT 'password',
			status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',
			is_root BOOLEAN NOT NULL DEFAULT false,
			approved_by_user_id UUID REFERENCES users(id),
			approved_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			last_login_at TIMESTAMP,
			timezone VARCHAR(100) DEFAULT 'UTC',
			locale VARCHAR(10) DEFAULT 'en',
			CHECK (auth_method IN ('password', 'oauth')),
			CHECK (status IN ('active', 'disabled', 'invited', 'pending_verification', 'pending_approval'))
		);

		CREATE INDEX idx_users_email ON users(email);
		CREATE INDEX idx_users_status ON users(status);
		CREATE INDEX idx_users_auth_method ON users(auth_method);

		-- OAuth Providers table
		CREATE TABLE oauth_providers (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			key VARCHAR(50) UNIQUE NOT NULL,
			name VARCHAR(100) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'active',
			config JSONB NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			CHECK (status IN ('active', 'disabled'))
		);

		CREATE INDEX idx_oauth_providers_key ON oauth_providers(key);
		CREATE INDEX idx_oauth_providers_status ON oauth_providers(status);

		-- OAuth Accounts table
		CREATE TABLE oauth_accounts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			provider_id UUID NOT NULL REFERENCES oauth_providers(id) ON DELETE CASCADE,
			provider_user_id VARCHAR(255) NOT NULL,
			provider_email VARCHAR(255) NOT NULL,
			provider_name VARCHAR(255),
			provider_avatar_url TEXT,
			access_token TEXT,
			refresh_token TEXT,
			token_expires_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			last_used_at TIMESTAMP,
			UNIQUE(provider_id, provider_user_id)
		);

		CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
		CREATE INDEX idx_oauth_accounts_provider_id ON oauth_accounts(provider_id);
		CREATE INDEX idx_oauth_accounts_provider_user_id ON oauth_accounts(provider_user_id);

		-- Service Accounts table
		CREATE TABLE service_accounts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			status VARCHAR(50) NOT NULL DEFAULT 'active',
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			CHECK (status IN ('active', 'disabled'))
		);

		CREATE INDEX idx_service_accounts_owner_user_id ON service_accounts(owner_user_id);
		CREATE INDEX idx_service_accounts_status ON service_accounts(status);

		-- API Keys table
		CREATE TABLE api_keys (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			principal_type VARCHAR(50) NOT NULL,
			principal_id UUID NOT NULL,
			key_prefix VARCHAR(20) NOT NULL,
			key_hash TEXT NOT NULL,
			name VARCHAR(255) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'active',
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			revoked_at TIMESTAMP,
			last_used_at TIMESTAMP,
			last_used_ip INET,
			CHECK (principal_type IN ('user', 'service_account')),
			CHECK (status IN ('active', 'revoked'))
		);

		CREATE INDEX idx_api_keys_principal ON api_keys(principal_type, principal_id);
		CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
		CREATE INDEX idx_api_keys_status ON api_keys(status);

		-- Sessions table (stored in Memcached primarily, this is for persistent sessions if needed)
		CREATE TABLE sessions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			session_token VARCHAR(255) UNIQUE NOT NULL,
			user_id UUID REFERENCES users(id) ON DELETE CASCADE,
			service_account_id UUID REFERENCES service_accounts(id) ON DELETE CASCADE,
			ip_address INET,
			user_agent TEXT,
			metadata JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			expires_at TIMESTAMP NOT NULL,
			CHECK (
				(user_id IS NOT NULL AND service_account_id IS NULL) OR
				(user_id IS NULL AND service_account_id IS NOT NULL)
			)
		);

		CREATE INDEX idx_sessions_session_token ON sessions(session_token);
		CREATE INDEX idx_sessions_user_id ON sessions(user_id);
		CREATE INDEX idx_sessions_service_account_id ON sessions(service_account_id);
		CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
	`);
};

exports.down = function(db) {
	return db.runSql(`
		DROP TABLE IF EXISTS sessions CASCADE;
		DROP TABLE IF EXISTS api_keys CASCADE;
		DROP TABLE IF EXISTS service_accounts CASCADE;
		DROP TABLE IF EXISTS oauth_accounts CASCADE;
		DROP TABLE IF EXISTS oauth_providers CASCADE;
		DROP TABLE IF EXISTS users CASCADE;
	`);
};

exports._meta = {
  "version": 1
};
