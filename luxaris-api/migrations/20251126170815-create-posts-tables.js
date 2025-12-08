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
	
    // Create posts table - platform-agnostic content
    await db.runSql(`
		CREATE SEQUENCE ${schema}.posts_id_seq;
		CREATE TABLE ${schema}.posts (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.posts_id_seq'),
			owner_principal_id INTEGER NOT NULL,
			title VARCHAR(200),
			base_content TEXT NOT NULL,
			tags JSONB NOT NULL DEFAULT '[]',
			status VARCHAR(20) NOT NULL DEFAULT 'draft',
			metadata JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			published_at TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.posts_id_seq OWNED BY ${schema}.posts.id;
	`);

    // Create indexes for posts
    await db.runSql(`CREATE INDEX idx_posts_owner ON ${schema}.posts(owner_principal_id)`);
    await db.runSql(`CREATE INDEX idx_posts_status ON ${schema}.posts(status)`);
    await db.runSql(`CREATE INDEX idx_posts_created_at ON ${schema}.posts(created_at)`);

    // Create post_variants table - channel-specific content
    await db.runSql(`
		CREATE SEQUENCE ${schema}.post_variants_id_seq;
		CREATE TABLE ${schema}.post_variants (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.post_variants_id_seq'),
			post_id INTEGER NOT NULL REFERENCES ${schema}.posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
			channel_id INTEGER NOT NULL REFERENCES ${schema}.channels(id) ON DELETE RESTRICT ON UPDATE CASCADE,
			channel_connection_id INTEGER REFERENCES ${schema}.channel_connections(id) ON DELETE SET NULL ON UPDATE CASCADE,
			content TEXT NOT NULL,
			media JSONB NOT NULL DEFAULT '{}',
			tone VARCHAR(50),
			source VARCHAR(20) NOT NULL DEFAULT 'manual',
			status VARCHAR(20) NOT NULL DEFAULT 'draft',
			metadata JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			published_at TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.post_variants_id_seq OWNED BY ${schema}.post_variants.id;
	`);

    // Create indexes for post_variants
    await db.runSql(`CREATE INDEX idx_post_variants_post_id ON ${schema}.post_variants(post_id)`);
    await db.runSql(`CREATE INDEX idx_post_variants_channel_id ON ${schema}.post_variants(channel_id)`);
    await db.runSql(`CREATE INDEX idx_post_variants_connection_id ON ${schema}.post_variants(channel_connection_id)`);
    await db.runSql(`CREATE INDEX idx_post_variants_status ON ${schema}.post_variants(status)`);

    return null;
};

exports.down = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Drop post_variants first (due to foreign key dependency)
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.post_variants CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.post_variants_id_seq CASCADE`);
  
    // Drop posts table
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.posts CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.posts_id_seq CASCADE`);

    return null;
};

exports._meta = {
    'version': 1
};
