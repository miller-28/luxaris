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

    // Drop the incorrect unique constraint
    await db.runSql(`
        ALTER TABLE ${schema}.user_ui_stateful_presets
        DROP CONSTRAINT IF EXISTS unique_global_preset;
    `);

    // Create a partial unique index that only enforces uniqueness when is_global = true
    // This allows multiple rows with is_global = false (user presets and role presets)
    // but ensures only one row can have is_global = true (the global preset)
    await db.runSql(`
        CREATE UNIQUE INDEX unique_global_preset
        ON ${schema}.user_ui_stateful_presets(is_global)
        WHERE is_global = true;
    `);

    return null;
};

exports.down = async function(db) {

	  const schema = process.env.DB_SCHEMA || 'luxaris';

    // Drop the partial unique index
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.unique_global_preset;
    `);

    // Restore the original (incorrect) constraint
    await db.runSql(`
        ALTER TABLE ${schema}.user_ui_stateful_presets
        ADD CONSTRAINT unique_global_preset UNIQUE (is_global);
    `);

    return null;
};

exports._meta = {
    'version': 1
};
