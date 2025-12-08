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

    // Create feature_flags table
    await db.runSql(`
		CREATE SEQUENCE ${schema}.feature_flags_id_seq;
		CREATE TABLE ${schema}.feature_flags (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.feature_flags_id_seq'),
			key VARCHAR(100) NOT NULL UNIQUE,
			value JSONB NOT NULL,
			description TEXT,
			is_enabled BOOLEAN NOT NULL DEFAULT true,
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
		ALTER SEQUENCE ${schema}.feature_flags_id_seq OWNED BY ${schema}.feature_flags.id;
	`);

    await db.runSql(`CREATE INDEX idx_feature_flags_key ON ${schema}.feature_flags(key)`);
    await db.runSql(`CREATE INDEX idx_feature_flags_is_enabled ON ${schema}.feature_flags(is_enabled)`);
    await db.runSql(`CREATE INDEX idx_feature_flags_updated_at ON ${schema}.feature_flags(updated_at DESC)`);

    // Seed default feature flags
    await db.runSql(`
		INSERT INTO ${schema}.feature_flags (key, value, description, is_enabled) VALUES
		('posts.ai_generation', 'true'::jsonb, 'Enable AI content generation for posts', true),
		('schedules.bulk_operations', 'true'::jsonb, 'Enable bulk scheduling operations', true),
		('system.maintenance_mode', 'false'::jsonb, 'Put system in read-only maintenance mode', false)
	`);
};

exports.down = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    await db.runSql(`DROP TABLE IF EXISTS ${schema}.feature_flags CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.feature_flags_id_seq CASCADE`);
};

exports._meta = {
    'version': 1
};
