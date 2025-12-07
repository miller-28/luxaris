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
	
    // Create schedules table - instructions to publish variants at specific times
    await db.runSql(`
		CREATE SEQUENCE ${schema}.schedules_id_seq;
		CREATE TABLE ${schema}.schedules (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.schedules_id_seq'),
			post_variant_id INTEGER REFERENCES ${schema}.post_variants(id) ON DELETE SET NULL ON UPDATE CASCADE,
			channel_connection_id INTEGER REFERENCES ${schema}.channel_connections(id) ON DELETE SET NULL ON UPDATE CASCADE,
			run_at TIMESTAMP WITH TIME ZONE NOT NULL,
			timezone VARCHAR(50) NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			attempt_count INT NOT NULL DEFAULT 0,
			last_attempt_at TIMESTAMP WITH TIME ZONE,
			error_code VARCHAR(50),
			error_message TEXT,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.schedules_id_seq OWNED BY ${schema}.schedules.id;
	`);

    // Add indexes for common queries
    await db.runSql(`CREATE INDEX idx_schedules_status ON ${schema}.schedules(status)`);
    await db.runSql(`CREATE INDEX idx_schedules_run_at ON ${schema}.schedules(run_at)`);
    await db.runSql(`CREATE INDEX idx_schedules_post_variant_id ON ${schema}.schedules(post_variant_id)`);
    await db.runSql(`CREATE INDEX idx_schedules_channel_connection_id ON ${schema}.schedules(channel_connection_id)`);
    await db.runSql(`CREATE INDEX idx_schedules_status_run_at ON ${schema}.schedules(status, run_at)`);

    // Create publish_events table - detailed audit trail of publish attempts
    await db.runSql(`
		CREATE SEQUENCE ${schema}.publish_events_id_seq;
		CREATE TABLE ${schema}.publish_events (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.publish_events_id_seq'),
			schedule_id INTEGER NOT NULL REFERENCES ${schema}.schedules(id) ON DELETE CASCADE ON UPDATE CASCADE,
			attempt_index INT NOT NULL,
			timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			status VARCHAR(20) NOT NULL,
			external_post_id VARCHAR(100),
			external_url VARCHAR(500),
			error_code VARCHAR(50),
			error_message TEXT,
			raw_response TEXT
		);
		ALTER SEQUENCE ${schema}.publish_events_id_seq OWNED BY ${schema}.publish_events.id;
	`);

    // Add indexes
    await db.runSql(`CREATE INDEX idx_publish_events_schedule_id ON ${schema}.publish_events(schedule_id)`);
    await db.runSql(`CREATE INDEX idx_publish_events_timestamp ON ${schema}.publish_events(timestamp)`);
    await db.runSql(`CREATE INDEX idx_publish_events_status ON ${schema}.publish_events(status)`);
};

exports.down = async function(db) {
	
	const schema = process.env.DB_SCHEMA || 'luxaris';
	
    // Drop tables in reverse order (children first)
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.publish_events CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.publish_events_id_seq CASCADE`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.schedules CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.schedules_id_seq CASCADE`);
};

exports._meta = {
    'version': 1
};
