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

    // Add display columns to channels table
    await db.runSql(`
        ALTER TABLE ${schema}.channels
        ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
        ADD COLUMN IF NOT EXISTS color VARCHAR(20)
    `);

    // Update existing channels with icon and color data
    await db.runSql(`
        UPDATE ${schema}.channels SET 
            icon = 'mdi-twitter',
            color = '#1DA1F2'
        WHERE key = 'x'
    `);

    await db.runSql(`
        UPDATE ${schema}.channels SET 
            icon = 'mdi-linkedin',
            color = '#0A66C2'
        WHERE key = 'linkedin'
    `);

    // Add account details and error tracking to channel_connections table
    await db.runSql(`
        ALTER TABLE ${schema}.channel_connections
        ADD COLUMN IF NOT EXISTS account_username VARCHAR(200),
        ADD COLUMN IF NOT EXISTS account_avatar TEXT,
        ADD COLUMN IF NOT EXISTS error_message TEXT
    `);
};

exports.down = async function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Remove added columns from channels
    await db.runSql(`
        ALTER TABLE ${schema}.channels
        DROP COLUMN IF EXISTS icon,
        DROP COLUMN IF EXISTS color
    `);

    // Remove added columns from channel_connections
    await db.runSql(`
        ALTER TABLE ${schema}.channel_connections
        DROP COLUMN IF EXISTS account_username,
        DROP COLUMN IF EXISTS account_avatar,
        DROP COLUMN IF EXISTS error_message
    `);
};

exports._meta = {
    'version': 1
};
