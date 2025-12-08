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
	
    // Create post_templates table - reusable content patterns
    await db.runSql(`
		CREATE SEQUENCE ${schema}.post_templates_id_seq;
		CREATE TABLE ${schema}.post_templates (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.post_templates_id_seq'),
			owner_principal_id INTEGER NOT NULL,
			name VARCHAR(100) NOT NULL,
			description TEXT,
			template_body TEXT NOT NULL,
			default_channel_id INTEGER REFERENCES ${schema}.channels(id) ON DELETE SET NULL ON UPDATE CASCADE,
			constraints JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.post_templates_id_seq OWNED BY ${schema}.post_templates.id;
	`);

    // Add indexes for post_templates
    await db.runSql(`CREATE INDEX idx_post_templates_owner ON ${schema}.post_templates(owner_principal_id)`);
    await db.runSql(`CREATE INDEX idx_post_templates_created_at ON ${schema}.post_templates(created_at)`);

    // Create generation_sessions table - AI generation attempts
    await db.runSql(`
		CREATE SEQUENCE ${schema}.generation_sessions_id_seq;
		CREATE TABLE ${schema}.generation_sessions (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.generation_sessions_id_seq'),
			owner_principal_id INTEGER NOT NULL,
			post_id INTEGER REFERENCES ${schema}.posts(id) ON DELETE SET NULL ON UPDATE CASCADE,
			template_id INTEGER REFERENCES ${schema}.post_templates(id) ON DELETE SET NULL ON UPDATE CASCADE,
			prompt TEXT NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.generation_sessions_id_seq OWNED BY ${schema}.generation_sessions.id;
	`);

    // Add indexes for generation_sessions
    await db.runSql(`CREATE INDEX idx_generation_sessions_owner ON ${schema}.generation_sessions(owner_principal_id)`);
    await db.runSql(`CREATE INDEX idx_generation_sessions_status ON ${schema}.generation_sessions(status)`);
    await db.runSql(`CREATE INDEX idx_generation_sessions_created_at ON ${schema}.generation_sessions(created_at)`);

    // Create generation_suggestions table - AI-generated candidates
    await db.runSql(`
		CREATE SEQUENCE ${schema}.generation_suggestions_id_seq;
		CREATE TABLE ${schema}.generation_suggestions (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.generation_suggestions_id_seq'),
			generation_session_id INTEGER NOT NULL REFERENCES ${schema}.generation_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
			channel_id INTEGER NOT NULL REFERENCES ${schema}.channels(id) ON DELETE RESTRICT ON UPDATE CASCADE,
			content TEXT NOT NULL,
			score DECIMAL(5, 2),
			accepted BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.generation_suggestions_id_seq OWNED BY ${schema}.generation_suggestions.id;
	`);

    // Add indexes for generation_suggestions
    await db.runSql(`CREATE INDEX idx_generation_suggestions_session ON ${schema}.generation_suggestions(generation_session_id)`);
    await db.runSql(`CREATE INDEX idx_generation_suggestions_accepted ON ${schema}.generation_suggestions(accepted)`);
    await db.runSql(`CREATE INDEX idx_generation_suggestions_created_at ON ${schema}.generation_suggestions(created_at)`);
};

exports.down = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Drop tables in reverse order (respect foreign keys)
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.generation_suggestions CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.generation_suggestions_id_seq CASCADE`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.generation_sessions CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.generation_sessions_id_seq CASCADE`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.post_templates CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.post_templates_id_seq CASCADE`);
};

exports._meta = {
    'version': 1
};
