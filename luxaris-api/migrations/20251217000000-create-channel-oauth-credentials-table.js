'use strict';

/**
 * Migration: Create channel_oauth_credentials table
 * 
 * Stores OAuth client credentials configured by platform admins
 */

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
    
    // Create channel_oauth_credentials table
    await db.runSql(`
        CREATE SEQUENCE ${schema}.channel_oauth_credentials_id_seq;
        CREATE TABLE ${schema}.channel_oauth_credentials (
            id INTEGER PRIMARY KEY DEFAULT nextval('${schema}.channel_oauth_credentials_id_seq'),
            channel_id INTEGER NOT NULL REFERENCES ${schema}.channels(id) ON DELETE CASCADE ON UPDATE CASCADE,
            client_id VARCHAR(500) NOT NULL,
            client_secret VARCHAR(500) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE
        );
        ALTER SEQUENCE ${schema}.channel_oauth_credentials_id_seq OWNED BY ${schema}.channel_oauth_credentials.id;
    `);

    // Create unique constraint for one active credential per channel
    await db.runSql(`
        CREATE UNIQUE INDEX unique_active_channel_creds 
        ON ${schema}.channel_oauth_credentials(channel_id) 
        WHERE is_active = true;
    `);

    // Create indexes for faster lookups
    await db.runSql(`CREATE INDEX idx_channel_oauth_creds_channel ON ${schema}.channel_oauth_credentials(channel_id);`);
    await db.runSql(`CREATE INDEX idx_channel_oauth_creds_active ON ${schema}.channel_oauth_credentials(channel_id, is_active);`);

    // Add comments
    await db.runSql(`
        COMMENT ON TABLE ${schema}.channel_oauth_credentials IS 'OAuth client credentials configured by platform admins for each channel';
        COMMENT ON COLUMN ${schema}.channel_oauth_credentials.client_id IS 'OAuth Client ID from provider developer console';
        COMMENT ON COLUMN ${schema}.channel_oauth_credentials.client_secret IS 'OAuth Client Secret (encrypted in application layer)';
        COMMENT ON COLUMN ${schema}.channel_oauth_credentials.is_active IS 'Whether this credential set is currently active';
    `);
};

exports.down = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';
    
    await db.runSql(`DROP TABLE IF EXISTS ${schema}.channel_oauth_credentials CASCADE;`);
};

exports._meta = {
    'version': 1
};
