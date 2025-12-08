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

    await db.runSql(`
		CREATE SEQUENCE ${schema}.system_logs_id_seq;
		CREATE TABLE ${schema}.system_logs (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.system_logs_id_seq'),
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
			logger VARCHAR(255) NOT NULL,
			message TEXT NOT NULL,
			request_id INTEGER,
			principal_id INTEGER,
			principal_type VARCHAR(50),
			context JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.system_logs_id_seq OWNED BY ${schema}.system_logs.id;
	`);

    await db.runSql(`CREATE INDEX idx_system_logs_timestamp ON ${schema}.system_logs(timestamp DESC)`);
    await db.runSql(`CREATE INDEX idx_system_logs_level ON ${schema}.system_logs(level)`);
    await db.runSql(`CREATE INDEX idx_system_logs_logger ON ${schema}.system_logs(logger)`);
    await db.runSql(`CREATE INDEX idx_system_logs_request_id ON ${schema}.system_logs(request_id)`);
    await db.runSql(`CREATE INDEX idx_system_logs_principal_id ON ${schema}.system_logs(principal_id)`);
    await db.runSql(`CREATE INDEX idx_system_logs_created_at ON ${schema}.system_logs(created_at DESC)`);

    // Create system_events table
    await db.runSql(`
		CREATE SEQUENCE ${schema}.system_events_id_seq;
		CREATE TABLE ${schema}.system_events (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.system_events_id_seq'),
			event_type VARCHAR(100) NOT NULL,
			event_name VARCHAR(200) NOT NULL,
			principal_id INTEGER,
			principal_type VARCHAR(100),
			resource_type VARCHAR(100),
			resource_id INTEGER,
			status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
			metadata JSONB,
			ip_address INET,
			user_agent TEXT,
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.system_events_id_seq OWNED BY ${schema}.system_events.id;
	`);

    await db.runSql(`CREATE INDEX idx_system_events_event_type ON ${schema}.system_events(event_type)`);
    await db.runSql(`CREATE INDEX idx_system_events_event_name ON ${schema}.system_events(event_name)`);
    await db.runSql(`CREATE INDEX idx_system_events_principal_id ON ${schema}.system_events(principal_id)`);
    await db.runSql(`CREATE INDEX idx_system_events_resource ON ${schema}.system_events(resource_type, resource_id)`);
    await db.runSql(`CREATE INDEX idx_system_events_timestamp ON ${schema}.system_events(timestamp DESC)`);
    await db.runSql(`CREATE INDEX idx_system_events_status ON ${schema}.system_events(status)`);

    // Create request_logs table
    await db.runSql(`
		CREATE SEQUENCE ${schema}.request_logs_id_seq;
		CREATE SEQUENCE ${schema}.request_id_seq START WITH 1;
		CREATE TABLE ${schema}.request_logs (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.request_logs_id_seq'),
			request_id INTEGER NOT NULL DEFAULT nextval('${schema}.request_id_seq'),
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			method VARCHAR(10) NOT NULL,
			path VARCHAR(500) NOT NULL,
			status_code INT NOT NULL,
			duration_ms INT NOT NULL,
			principal_id INTEGER,
			principal_type VARCHAR(50),
			ip_address INET,
			user_agent TEXT,
			request_size_bytes INT,
			response_size_bytes INT,
			error_code VARCHAR(100),
			error_message TEXT,
			context JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.request_logs_id_seq OWNED BY ${schema}.request_logs.id;
	`);

    await db.runSql(`CREATE INDEX idx_request_logs_request_id ON ${schema}.request_logs(request_id)`);
    await db.runSql(`CREATE INDEX idx_request_logs_timestamp ON ${schema}.request_logs(timestamp DESC)`);
    await db.runSql(`CREATE INDEX idx_request_logs_path ON ${schema}.request_logs(path)`);
    await db.runSql(`CREATE INDEX idx_request_logs_status_code ON ${schema}.request_logs(status_code)`);
    await db.runSql(`CREATE INDEX idx_request_logs_principal_id ON ${schema}.request_logs(principal_id)`);
    await db.runSql(`CREATE INDEX idx_request_logs_method ON ${schema}.request_logs(method)`);
    await db.runSql(`CREATE INDEX idx_request_logs_duration ON ${schema}.request_logs(duration_ms)`);
    await db.runSql(`CREATE INDEX idx_request_logs_created_at ON ${schema}.request_logs(created_at DESC)`);

    // Create audit_logs table
    await db.runSql(`
		CREATE SEQUENCE ${schema}.audit_logs_id_seq;
		CREATE TABLE ${schema}.audit_logs (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.audit_logs_id_seq'),
			timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
			actor_type VARCHAR(50),
			actor_id INTEGER,
			action VARCHAR(100) NOT NULL,
			resource_type VARCHAR(50),
			resource_id INTEGER,
			ip_address INET,
			user_agent TEXT,
			data JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.audit_logs_id_seq OWNED BY ${schema}.audit_logs.id;
	`);

    await db.runSql(`CREATE INDEX idx_audit_logs_timestamp ON ${schema}.audit_logs(timestamp DESC)`);
    await db.runSql(`CREATE INDEX idx_audit_logs_actor ON ${schema}.audit_logs(actor_type, actor_id)`);
    await db.runSql(`CREATE INDEX idx_audit_logs_action ON ${schema}.audit_logs(action)`);
    await db.runSql(`CREATE INDEX idx_audit_logs_resource ON ${schema}.audit_logs(resource_type, resource_id)`);
};

exports.down = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    await db.runSql(`DROP TABLE IF EXISTS ${schema}.audit_logs CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.audit_logs_id_seq CASCADE`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.request_logs CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.request_logs_id_seq CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.request_id_seq CASCADE`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.system_events CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.system_events_id_seq CASCADE`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.system_logs CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.system_logs_id_seq CASCADE`);
};

exports._meta = {
    'version': 1
};
