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

exports.up = async function(db) {
	// Create feature_flags table
	await db.runSql(`
		CREATE TABLE feature_flags (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			key VARCHAR(100) NOT NULL UNIQUE,
			value JSONB NOT NULL,
			description TEXT,
			is_enabled BOOLEAN NOT NULL DEFAULT true,
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.runSql('CREATE INDEX idx_feature_flags_key ON feature_flags(key)');
	await db.runSql('CREATE INDEX idx_feature_flags_is_enabled ON feature_flags(is_enabled)');
	await db.runSql('CREATE INDEX idx_feature_flags_updated_at ON feature_flags(updated_at DESC)');

	// Seed default feature flags
	await db.runSql(`
		INSERT INTO feature_flags (key, value, description, is_enabled) VALUES
		('posts.ai_generation', 'true'::jsonb, 'Enable AI content generation for posts', true),
		('schedules.bulk_operations', 'true'::jsonb, 'Enable bulk scheduling operations', true),
		('system.maintenance_mode', 'false'::jsonb, 'Put system in read-only maintenance mode', false)
	`);
};

exports.down = async function(db) {
	await db.runSql('DROP TABLE IF EXISTS feature_flags CASCADE');
};

exports._meta = {
  "version": 1
};
