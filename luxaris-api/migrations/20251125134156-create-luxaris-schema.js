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

exports.up = function(db) {
	
    const schema = process.env.DB_SCHEMA || 'luxaris';

    return db.runSql(`
        CREATE SCHEMA IF NOT EXISTS ${schema};
    `);
};

exports.down = function(db) {
    const schema = process.env.DB_SCHEMA || 'luxaris';
    return db.runSql(`
        DROP SCHEMA IF EXISTS "${schema}" CASCADE;
    `);
};

exports._meta = {
    'version': 1
};
