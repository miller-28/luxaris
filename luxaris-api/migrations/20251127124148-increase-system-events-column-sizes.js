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

    // Increase event_type from VARCHAR(50) to VARCHAR(100)
    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN event_type TYPE VARCHAR(100)
    `);

    // Increase event_name from VARCHAR(100) to VARCHAR(200)
    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN event_name TYPE VARCHAR(200)
    `);

    // Also increase principal_type and resource_type for future-proofing
    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN principal_type TYPE VARCHAR(100)
    `);

    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN resource_type TYPE VARCHAR(100)
    `);
};

exports.down = async function(db) {
  
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Revert column size changes back to original sizes
    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN event_type TYPE VARCHAR(50)
    `);

    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN event_name TYPE VARCHAR(100)
    `);

    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN principal_type TYPE VARCHAR(30)
    `);

    await db.runSql(`
      ALTER TABLE ${schema}.system_events 
      ALTER COLUMN resource_type TYPE VARCHAR(30)
    `);
};

exports._meta = {
    'version': 1
};
