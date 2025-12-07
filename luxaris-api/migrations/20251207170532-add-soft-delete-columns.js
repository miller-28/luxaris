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

    // Add is_deleted and deleted_at columns to main entities for soft delete functionality
    
    // Users table
    await db.runSql(`
        ALTER TABLE ${schema}.users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.users ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_users_is_deleted ON ${schema}.users(is_deleted);
    `);

    // Posts table
    await db.runSql(`
        ALTER TABLE ${schema}.posts ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.posts ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_posts_is_deleted ON ${schema}.posts(is_deleted);
    `);

    // Post variants table
    await db.runSql(`
        ALTER TABLE ${schema}.post_variants ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.post_variants ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_post_variants_is_deleted ON ${schema}.post_variants(is_deleted);
    `);

    // Post templates table
    await db.runSql(`
        ALTER TABLE ${schema}.post_templates ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.post_templates ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_post_templates_is_deleted ON ${schema}.post_templates(is_deleted);
    `);

    // Channel connections table
    await db.runSql(`
        ALTER TABLE ${schema}.channel_connections ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.channel_connections ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_channel_connections_is_deleted ON ${schema}.channel_connections(is_deleted);
    `);

    // Schedules table
    await db.runSql(`
        ALTER TABLE ${schema}.schedules ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.schedules ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_schedules_is_deleted ON ${schema}.schedules(is_deleted);
    `);

    // Generation sessions table
    await db.runSql(`
        ALTER TABLE ${schema}.generation_sessions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.generation_sessions ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_generation_sessions_is_deleted ON ${schema}.generation_sessions(is_deleted);
    `);

    // Generation suggestions table
    await db.runSql(`
        ALTER TABLE ${schema}.generation_suggestions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.generation_suggestions ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_generation_suggestions_is_deleted ON ${schema}.generation_suggestions(is_deleted);
    `);

    // ACL Roles table (for soft delete of custom roles)
    await db.runSql(`
        ALTER TABLE ${schema}.acl_roles ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.acl_roles ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_acl_roles_is_deleted ON ${schema}.acl_roles(is_deleted);
    `);

    // UI Presets table
    await db.runSql(`
        ALTER TABLE ${schema}.user_ui_stateful_presets ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ${schema}.user_ui_stateful_presets ADD COLUMN deleted_at TIMESTAMP;
        CREATE INDEX idx_user_ui_stateful_presets_is_deleted ON ${schema}.user_ui_stateful_presets(is_deleted);
    `);
};

exports.down = async function(db) {
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Remove soft delete columns in reverse order

    // UI Presets
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_user_ui_stateful_presets_is_deleted;
        ALTER TABLE ${schema}.user_ui_stateful_presets DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.user_ui_stateful_presets DROP COLUMN IF EXISTS is_deleted;
    `);

    // ACL Roles
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_acl_roles_is_deleted;
        ALTER TABLE ${schema}.acl_roles DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.acl_roles DROP COLUMN IF EXISTS is_deleted;
    `);

    // Generation suggestions
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_generation_suggestions_is_deleted;
        ALTER TABLE ${schema}.generation_suggestions DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.generation_suggestions DROP COLUMN IF EXISTS is_deleted;
    `);

    // Generation sessions
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_generation_sessions_is_deleted;
        ALTER TABLE ${schema}.generation_sessions DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.generation_sessions DROP COLUMN IF EXISTS is_deleted;
    `);

    // Schedules
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_schedules_is_deleted;
        ALTER TABLE ${schema}.schedules DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.schedules DROP COLUMN IF EXISTS is_deleted;
    `);

    // Channel connections
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_channel_connections_is_deleted;
        ALTER TABLE ${schema}.channel_connections DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.channel_connections DROP COLUMN IF EXISTS is_deleted;
    `);

    // Post templates
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_post_templates_is_deleted;
        ALTER TABLE ${schema}.post_templates DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.post_templates DROP COLUMN IF EXISTS is_deleted;
    `);

    // Post variants
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_post_variants_is_deleted;
        ALTER TABLE ${schema}.post_variants DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.post_variants DROP COLUMN IF EXISTS is_deleted;
    `);

    // Posts
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_posts_is_deleted;
        ALTER TABLE ${schema}.posts DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.posts DROP COLUMN IF EXISTS is_deleted;
    `);

    // Users
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_users_is_deleted;
        ALTER TABLE ${schema}.users DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE ${schema}.users DROP COLUMN IF EXISTS is_deleted;
    `);
};

exports._meta = {
    "version": 1
};

