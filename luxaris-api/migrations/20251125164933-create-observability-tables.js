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
	// Set schema
	await db.runSql('SET search_path TO luxaris, public');

	// Create system_logs table
	await db.runSql(`
		CREATE TABLE system_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
			logger VARCHAR(255) NOT NULL,
			message TEXT NOT NULL,
			request_id UUID,
			principal_id UUID,
			principal_type VARCHAR(50),
			context JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.runSql('CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC)');
	await db.runSql('CREATE INDEX idx_system_logs_level ON system_logs(level)');
	await db.runSql('CREATE INDEX idx_system_logs_logger ON system_logs(logger)');
	await db.runSql('CREATE INDEX idx_system_logs_request_id ON system_logs(request_id)');
	await db.runSql('CREATE INDEX idx_system_logs_principal_id ON system_logs(principal_id)');
	await db.runSql('CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC)');

	// Create system_events table
	await db.runSql(`
		CREATE TABLE system_events (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_type VARCHAR(50) NOT NULL,
			event_name VARCHAR(100) NOT NULL,
			principal_id UUID,
			principal_type VARCHAR(50),
			resource_type VARCHAR(50),
			resource_id UUID,
			status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
			metadata JSONB,
			ip_address INET,
			user_agent TEXT,
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.runSql('CREATE INDEX idx_system_events_event_type ON system_events(event_type)');
	await db.runSql('CREATE INDEX idx_system_events_event_name ON system_events(event_name)');
	await db.runSql('CREATE INDEX idx_system_events_principal_id ON system_events(principal_id)');
	await db.runSql('CREATE INDEX idx_system_events_resource ON system_events(resource_type, resource_id)');
	await db.runSql('CREATE INDEX idx_system_events_timestamp ON system_events(timestamp DESC)');
	await db.runSql('CREATE INDEX idx_system_events_status ON system_events(status)');

	// Create request_logs table
	await db.runSql(`
		CREATE TABLE request_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			request_id UUID NOT NULL,
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			method VARCHAR(10) NOT NULL,
			path VARCHAR(500) NOT NULL,
			status_code INT NOT NULL,
			duration_ms INT NOT NULL,
			principal_id UUID,
			principal_type VARCHAR(50),
			ip_address INET,
			user_agent TEXT,
			request_size_bytes INT,
			response_size_bytes INT,
			error_code VARCHAR(100),
			error_message TEXT,
			context JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.runSql('CREATE INDEX idx_request_logs_request_id ON request_logs(request_id)');
	await db.runSql('CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp DESC)');
	await db.runSql('CREATE INDEX idx_request_logs_path ON request_logs(path)');
	await db.runSql('CREATE INDEX idx_request_logs_status_code ON request_logs(status_code)');
	await db.runSql('CREATE INDEX idx_request_logs_principal_id ON request_logs(principal_id)');
	await db.runSql('CREATE INDEX idx_request_logs_method ON request_logs(method)');
	await db.runSql('CREATE INDEX idx_request_logs_duration ON request_logs(duration_ms)');
	await db.runSql('CREATE INDEX idx_request_logs_created_at ON request_logs(created_at DESC)');

	// Create audit_logs table
	await db.runSql(`
		CREATE TABLE audit_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			actor_type VARCHAR(50),
			actor_id UUID,
			action VARCHAR(100) NOT NULL,
			resource_type VARCHAR(50),
			resource_id UUID,
			ip_address INET,
			user_agent TEXT,
			data JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.runSql('CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC)');
	await db.runSql('CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id)');
	await db.runSql('CREATE INDEX idx_audit_logs_action ON audit_logs(action)');
	await db.runSql('CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id)');
};

exports.down = async function(db) {
	await db.runSql('SET search_path TO luxaris, public');
	await db.runSql('DROP TABLE IF EXISTS audit_logs CASCADE');
	await db.runSql('DROP TABLE IF EXISTS request_logs CASCADE');
	await db.runSql('DROP TABLE IF EXISTS system_events CASCADE');
	await db.runSql('DROP TABLE IF EXISTS system_logs CASCADE');
};

exports._meta = {
	'version': 1
};
