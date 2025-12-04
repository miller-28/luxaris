'use strict';

/**
 * Fix remaining timestamp columns to use UTC (TIMESTAMPTZ)
 * 
 * This migration converts timestamp columns that were missed by the previous
 * normalization migration. These tables were either:
 * 1. Created after the normalization migration ran
 * 2. Not included in the original normalization
 * 
 * Tables affected:
 * - channels (created_at, updated_at)
 * - channel_connections (created_at, updated_at, disconnected_at, last_used_at)
 * - feature_flags (created_at, updated_at)
 * - generation_sessions (created_at, updated_at)
 * - generation_suggestions (created_at)
 * - post_templates (created_at, updated_at)
 * - post_variants (created_at, updated_at, published_at)
 * - posts (created_at, updated_at, published_at)
 * - migrations (run_on) - db-migrate metadata table
 */

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
	const schema = process.env.DB_SCHEMA || 'luxaris';

	console.log('Converting remaining timestamp columns to TIMESTAMPTZ...');

	// Channels table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.channels 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
			ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ channels table converted');
	} catch (error) {
		console.error('Error converting channels:', error.message);
	}

	// Channel connections table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.channel_connections 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
			ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
			ALTER COLUMN disconnected_at TYPE timestamp with time zone USING disconnected_at AT TIME ZONE 'UTC',
			ALTER COLUMN last_used_at TYPE timestamp with time zone USING last_used_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ channel_connections table converted');
	} catch (error) {
		console.error('Error converting channel_connections:', error.message);
	}

	// Feature flags table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.feature_flags 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
			ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ feature_flags table converted');
	} catch (error) {
		console.error('Error converting feature_flags:', error.message);
	}

	// Generation sessions table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.generation_sessions 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
			ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ generation_sessions table converted');
	} catch (error) {
		console.error('Error converting generation_sessions:', error.message);
	}

	// Generation suggestions table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.generation_suggestions 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ generation_suggestions table converted');
	} catch (error) {
		console.error('Error converting generation_suggestions:', error.message);
	}

	// Post templates table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.post_templates 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
			ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ post_templates table converted');
	} catch (error) {
		console.error('Error converting post_templates:', error.message);
	}

	// Post variants table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.post_variants 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
			ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
			ALTER COLUMN published_at TYPE timestamp with time zone USING published_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ post_variants table converted');
	} catch (error) {
		console.error('Error converting post_variants:', error.message);
	}

	// Posts table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.posts 
			ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
			ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
			ALTER COLUMN published_at TYPE timestamp with time zone USING published_at AT TIME ZONE 'UTC';
		`);
		console.log('✓ posts table converted');
	} catch (error) {
		console.error('Error converting posts:', error.message);
	}

	// Migrations table (db-migrate metadata - in public schema)
	try {
		await db.runSql(`
			ALTER TABLE public.migrations 
			ALTER COLUMN run_on TYPE timestamp with time zone USING run_on AT TIME ZONE 'UTC';
		`);
		console.log('✓ migrations table converted');
	} catch (error) {
		console.error('Error converting migrations:', error.message);
	}

	console.log('✓ All remaining timestamp columns converted to TIMESTAMPTZ');
	return null;
};

exports.down = async function(db) {
	const schema = process.env.DB_SCHEMA || 'luxaris';

	console.log('Reverting timestamp columns back to timestamp without time zone...');

	// Channels table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.channels 
			ALTER COLUMN created_at TYPE timestamp without time zone,
			ALTER COLUMN updated_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting channels:', error.message);
	}

	// Channel connections table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.channel_connections 
			ALTER COLUMN created_at TYPE timestamp without time zone,
			ALTER COLUMN updated_at TYPE timestamp without time zone,
			ALTER COLUMN disconnected_at TYPE timestamp without time zone,
			ALTER COLUMN last_used_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting channel_connections:', error.message);
	}

	// Feature flags table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.feature_flags 
			ALTER COLUMN created_at TYPE timestamp without time zone,
			ALTER COLUMN updated_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting feature_flags:', error.message);
	}

	// Generation sessions table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.generation_sessions 
			ALTER COLUMN created_at TYPE timestamp without time zone,
			ALTER COLUMN updated_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting generation_sessions:', error.message);
	}

	// Generation suggestions table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.generation_suggestions 
			ALTER COLUMN created_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting generation_suggestions:', error.message);
	}

	// Post templates table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.post_templates 
			ALTER COLUMN created_at TYPE timestamp without time zone,
			ALTER COLUMN updated_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting post_templates:', error.message);
	}

	// Post variants table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.post_variants 
			ALTER COLUMN created_at TYPE timestamp without time zone,
			ALTER COLUMN updated_at TYPE timestamp without time zone,
			ALTER COLUMN published_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting post_variants:', error.message);
	}

	// Posts table
	try {
		await db.runSql(`
			ALTER TABLE ${schema}.posts 
			ALTER COLUMN created_at TYPE timestamp without time zone,
			ALTER COLUMN updated_at TYPE timestamp without time zone,
			ALTER COLUMN published_at TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting posts:', error.message);
	}

	// Migrations table
	try {
		await db.runSql(`
			ALTER TABLE public.migrations 
			ALTER COLUMN run_on TYPE timestamp without time zone;
		`);
	} catch (error) {
		console.error('Error reverting migrations:', error.message);
	}

	console.log('✓ Timestamp columns reverted');
	return null;
};

exports._meta = {
  "version": 1
};
