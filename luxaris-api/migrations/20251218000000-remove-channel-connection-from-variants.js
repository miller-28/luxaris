/**
 * Migration: Remove channel_connection_id from post_variants
 * 
 * The connection is now resolved dynamically at publish time from channel_id.
 * Post variants only reference the channel type, not a specific connection.
 */

exports.up = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Remove channel_connection_id column from post_variants
    await db.runSql(`
        ALTER TABLE ${schema}.post_variants
            DROP COLUMN IF EXISTS channel_connection_id;
    `);
};

exports.down = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Re-add channel_connection_id column (for rollback)
    await db.runSql(`
        ALTER TABLE ${schema}.post_variants
            ADD COLUMN channel_connection_id INTEGER REFERENCES ${schema}.channel_connections(id);
    `);
};

exports._meta = {
    version: 1
};
