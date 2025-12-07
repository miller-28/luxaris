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
		-- Users table
		CREATE SEQUENCE ${schema}.users_id_seq;
		CREATE TABLE ${schema}.users (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.users_id_seq'),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash TEXT,
			name VARCHAR(255) NOT NULL,
			avatar_url TEXT,
			auth_method VARCHAR(50) NOT NULL DEFAULT 'password',
			status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',
			is_root BOOLEAN NOT NULL DEFAULT false,
			approved_by_user_id INTEGER REFERENCES ${schema}.users(id),
			approved_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			last_login_at TIMESTAMP,
			timezone VARCHAR(100) DEFAULT 'UTC',
			locale VARCHAR(10) DEFAULT 'en',
			CHECK (auth_method IN ('password', 'oauth')),
			CHECK (status IN ('active', 'disabled', 'invited', 'pending_verification', 'pending_approval'))
		);
		ALTER SEQUENCE ${schema}.users_id_seq OWNED BY ${schema}.users.id;

		CREATE INDEX idx_users_email ON ${schema}.users(email);
		CREATE INDEX idx_users_status ON ${schema}.users(status);
		CREATE INDEX idx_users_auth_method ON ${schema}.users(auth_method);

		-- OAuth Providers table
		CREATE SEQUENCE ${schema}.oauth_providers_id_seq;
		CREATE TABLE ${schema}.oauth_providers (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.oauth_providers_id_seq'),
			key VARCHAR(50) UNIQUE NOT NULL,
			name VARCHAR(100) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'active',
			config JSONB NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			CHECK (status IN ('active', 'disabled'))
		);
		ALTER SEQUENCE ${schema}.oauth_providers_id_seq OWNED BY ${schema}.oauth_providers.id;

		CREATE INDEX idx_oauth_providers_key ON ${schema}.oauth_providers(key);
		CREATE INDEX idx_oauth_providers_status ON ${schema}.oauth_providers(status);

		-- OAuth Accounts table
		CREATE SEQUENCE ${schema}.oauth_accounts_id_seq;
		CREATE TABLE ${schema}.oauth_accounts (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.oauth_accounts_id_seq'),
			user_id INTEGER NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
			provider_id INTEGER NOT NULL REFERENCES ${schema}.oauth_providers(id) ON DELETE CASCADE,
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
		ALTER SEQUENCE ${schema}.oauth_accounts_id_seq OWNED BY ${schema}.oauth_accounts.id;

		CREATE INDEX idx_oauth_accounts_user_id ON ${schema}.oauth_accounts(user_id);
		CREATE INDEX idx_oauth_accounts_provider_id ON ${schema}.oauth_accounts(provider_id);
		CREATE INDEX idx_oauth_accounts_provider_user_id ON ${schema}.oauth_accounts(provider_user_id);

		-- Service Accounts table
		CREATE SEQUENCE ${schema}.service_accounts_id_seq;
		CREATE TABLE ${schema}.service_accounts (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.service_accounts_id_seq'),
			name VARCHAR(255) NOT NULL,
			owner_user_id INTEGER NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
			status VARCHAR(50) NOT NULL DEFAULT 'active',
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			CHECK (status IN ('active', 'disabled'))
		);
		ALTER SEQUENCE ${schema}.service_accounts_id_seq OWNED BY ${schema}.service_accounts.id;

		CREATE INDEX idx_service_accounts_owner_user_id ON ${schema}.service_accounts(owner_user_id);
		CREATE INDEX idx_service_accounts_status ON ${schema}.service_accounts(status);

		-- API Keys table
		CREATE SEQUENCE ${schema}.api_keys_id_seq;
		CREATE TABLE ${schema}.api_keys (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.api_keys_id_seq'),
			principal_type VARCHAR(50) NOT NULL,
			principal_id INTEGER NOT NULL,
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
		ALTER SEQUENCE ${schema}.api_keys_id_seq OWNED BY ${schema}.api_keys.id;

		CREATE INDEX idx_api_keys_principal ON ${schema}.api_keys(principal_type, principal_id);
		CREATE INDEX idx_api_keys_key_prefix ON ${schema}.api_keys(key_prefix);
		CREATE INDEX idx_api_keys_status ON ${schema}.api_keys(status);

		-- Sessions table (stored in Memcached primarily, this is for persistent sessions if needed)
		CREATE SEQUENCE ${schema}.sessions_id_seq;
		CREATE TABLE ${schema}.sessions (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.sessions_id_seq'),
			session_token VARCHAR(255) UNIQUE NOT NULL,
			user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE CASCADE,
			service_account_id INTEGER REFERENCES ${schema}.service_accounts(id) ON DELETE CASCADE,
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
		ALTER SEQUENCE ${schema}.sessions_id_seq OWNED BY ${schema}.sessions.id;

		CREATE INDEX idx_sessions_session_token ON ${schema}.sessions(session_token);
		CREATE INDEX idx_sessions_user_id ON ${schema}.sessions(user_id);
		CREATE INDEX idx_sessions_service_account_id ON ${schema}.sessions(service_account_id);
		CREATE INDEX idx_sessions_expires_at ON ${schema}.sessions(expires_at);
	`);
};

exports.down = async function(db) {
	
	const schema = process.env.DB_SCHEMA || 'luxaris';
	
    return db.runSql(`
		-- Drop tables in reverse order (children first)
		DROP TABLE IF EXISTS ${schema}.sessions CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.sessions_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.api_keys CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.api_keys_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.service_accounts CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.service_accounts_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.oauth_accounts CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.oauth_accounts_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.oauth_providers CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.oauth_providers_id_seq CASCADE;
		DROP TABLE IF EXISTS ${schema}.users CASCADE;
		DROP SEQUENCE IF EXISTS ${schema}.users_id_seq CASCADE;
	`);
};

exports._meta = {
    'version': 1
};
