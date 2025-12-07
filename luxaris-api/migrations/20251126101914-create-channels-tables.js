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

    // Create channels table - platform catalog
    await db.runSql(`
		CREATE SEQUENCE ${schema}.channels_id_seq;
		CREATE TABLE ${schema}.channels (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.channels_id_seq'),
			key VARCHAR(50) NOT NULL UNIQUE,
			name VARCHAR(100) NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'active',
			limits JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.channels_id_seq OWNED BY ${schema}.channels.id;
	`);

    // Create index on key for fast lookups
    await db.runSql(`CREATE UNIQUE INDEX idx_channels_key ON ${schema}.channels(key)`);

    // Create channel_connections table - user-specific OAuth connections
    await db.runSql(`
		CREATE SEQUENCE ${schema}.channel_connections_id_seq;
		CREATE TABLE ${schema}.channel_connections (
			id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.channel_connections_id_seq'),
			owner_principal_id INTEGER NOT NULL,
			channel_id INTEGER NOT NULL REFERENCES ${schema}.channels(id) ON DELETE RESTRICT ON UPDATE CASCADE,
			display_name VARCHAR(200) NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'connected',
			auth_state JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			last_used_at TIMESTAMP,
			disconnected_at TIMESTAMP
		);
		ALTER SEQUENCE ${schema}.channel_connections_id_seq OWNED BY ${schema}.channel_connections.id;
	`);

    // Create indexes for common queries
    await db.runSql(`CREATE INDEX idx_channel_connections_owner ON ${schema}.channel_connections(owner_principal_id)`);
    await db.runSql(`CREATE INDEX idx_channel_connections_channel ON ${schema}.channel_connections(channel_id)`);
    await db.runSql(`CREATE INDEX idx_channel_connections_status ON ${schema}.channel_connections(status)`);
    await db.runSql(`CREATE INDEX idx_channel_connections_owner_status ON ${schema}.channel_connections(owner_principal_id, status)`);

    // Insert initial channel catalog data (using known integer IDs)
    await db.runSql(`
		INSERT INTO ${schema}.channels (id, key, name, status, limits) VALUES
		(1, 'x', 'X (Twitter)', 'active', '{"max_text_length": 280, "supports_images": true, "supports_links": true, "max_images": 4}'),
		(2, 'linkedin', 'LinkedIn', 'active', '{"max_text_length": 3000, "supports_images": true, "supports_links": true, "max_images": 9}')
	`);
};

exports.down = async function(db) {
	
	const schema = process.env.DB_SCHEMA || 'luxaris';

    // Drop tables in reverse order
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.channel_connections CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.channel_connections_id_seq CASCADE`);
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.channels CASCADE`);
    await db.runSql(`DROP SEQUENCE IF EXISTS ${schema}.channels_id_seq CASCADE`);
};

exports._meta = {
    'version': 1
};
