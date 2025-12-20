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

    // Add audit user columns to major editable entities
    
    // Posts table
    await db.runSql(`
        ALTER TABLE ${schema}.posts 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_posts_created_by ON ${schema}.posts(created_by_user_id);
        CREATE INDEX idx_posts_updated_by ON ${schema}.posts(updated_by_user_id);
        CREATE INDEX idx_posts_deleted_by ON ${schema}.posts(deleted_by_user_id);
    `);

    // Post variants table
    await db.runSql(`
        ALTER TABLE ${schema}.post_variants 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_post_variants_created_by ON ${schema}.post_variants(created_by_user_id);
        CREATE INDEX idx_post_variants_updated_by ON ${schema}.post_variants(updated_by_user_id);
        CREATE INDEX idx_post_variants_deleted_by ON ${schema}.post_variants(deleted_by_user_id);
    `);

    // Post templates table
    await db.runSql(`
        ALTER TABLE ${schema}.post_templates 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_post_templates_created_by ON ${schema}.post_templates(created_by_user_id);
        CREATE INDEX idx_post_templates_updated_by ON ${schema}.post_templates(updated_by_user_id);
        CREATE INDEX idx_post_templates_deleted_by ON ${schema}.post_templates(deleted_by_user_id);
    `);

    // Channel connections table
    await db.runSql(`
        ALTER TABLE ${schema}.channel_connections 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_channel_connections_created_by ON ${schema}.channel_connections(created_by_user_id);
        CREATE INDEX idx_channel_connections_updated_by ON ${schema}.channel_connections(updated_by_user_id);
        CREATE INDEX idx_channel_connections_deleted_by ON ${schema}.channel_connections(deleted_by_user_id);
    `);

    // Schedules table
    await db.runSql(`
        ALTER TABLE ${schema}.schedules 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_schedules_created_by ON ${schema}.schedules(created_by_user_id);
        CREATE INDEX idx_schedules_updated_by ON ${schema}.schedules(updated_by_user_id);
        CREATE INDEX idx_schedules_deleted_by ON ${schema}.schedules(deleted_by_user_id);
    `);

    // Generation sessions table
    await db.runSql(`
        ALTER TABLE ${schema}.generation_sessions 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_generation_sessions_created_by ON ${schema}.generation_sessions(created_by_user_id);
        CREATE INDEX idx_generation_sessions_updated_by ON ${schema}.generation_sessions(updated_by_user_id);
        CREATE INDEX idx_generation_sessions_deleted_by ON ${schema}.generation_sessions(deleted_by_user_id);
    `);

    // Generation suggestions table
    await db.runSql(`
        ALTER TABLE ${schema}.generation_suggestions 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_generation_suggestions_created_by ON ${schema}.generation_suggestions(created_by_user_id);
        CREATE INDEX idx_generation_suggestions_updated_by ON ${schema}.generation_suggestions(updated_by_user_id);
        CREATE INDEX idx_generation_suggestions_deleted_by ON ${schema}.generation_suggestions(deleted_by_user_id);
    `);

    // ACL Roles table
    await db.runSql(`
        ALTER TABLE ${schema}.acl_roles 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_acl_roles_created_by ON ${schema}.acl_roles(created_by_user_id);
        CREATE INDEX idx_acl_roles_updated_by ON ${schema}.acl_roles(updated_by_user_id);
        CREATE INDEX idx_acl_roles_deleted_by ON ${schema}.acl_roles(deleted_by_user_id);
    `);

    // UI Presets table
    await db.runSql(`
        ALTER TABLE ${schema}.user_ui_stateful_presets 
            ADD COLUMN created_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN updated_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            ADD COLUMN deleted_by_user_id INTEGER REFERENCES ${schema}.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX idx_user_ui_stateful_presets_created_by ON ${schema}.user_ui_stateful_presets(created_by_user_id);
        CREATE INDEX idx_user_ui_stateful_presets_updated_by ON ${schema}.user_ui_stateful_presets(updated_by_user_id);
        CREATE INDEX idx_user_ui_stateful_presets_deleted_by ON ${schema}.user_ui_stateful_presets(deleted_by_user_id);
    `);

    return null;
};

exports.down = async function(db) {
    
    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Remove audit user columns in reverse order

    // UI Presets
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_user_ui_stateful_presets_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_user_ui_stateful_presets_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_user_ui_stateful_presets_created_by;
        ALTER TABLE ${schema}.user_ui_stateful_presets 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // ACL Roles
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_acl_roles_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_acl_roles_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_acl_roles_created_by;
        ALTER TABLE ${schema}.acl_roles 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // Generation suggestions
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_generation_suggestions_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_generation_suggestions_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_generation_suggestions_created_by;
        ALTER TABLE ${schema}.generation_suggestions 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // Generation sessions
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_generation_sessions_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_generation_sessions_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_generation_sessions_created_by;
        ALTER TABLE ${schema}.generation_sessions 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // Schedules
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_schedules_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_schedules_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_schedules_created_by;
        ALTER TABLE ${schema}.schedules 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // Channel connections
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_channel_connections_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_channel_connections_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_channel_connections_created_by;
        ALTER TABLE ${schema}.channel_connections 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // Post templates
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_post_templates_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_post_templates_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_post_templates_created_by;
        ALTER TABLE ${schema}.post_templates 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // Post variants
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_post_variants_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_post_variants_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_post_variants_created_by;
        ALTER TABLE ${schema}.post_variants 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    // Posts
    await db.runSql(`
        DROP INDEX IF EXISTS ${schema}.idx_posts_deleted_by;
        DROP INDEX IF EXISTS ${schema}.idx_posts_updated_by;
        DROP INDEX IF EXISTS ${schema}.idx_posts_created_by;
        ALTER TABLE ${schema}.posts 
            DROP COLUMN IF EXISTS deleted_by_user_id,
            DROP COLUMN IF EXISTS updated_by_user_id,
            DROP COLUMN IF EXISTS created_by_user_id;
    `);

    return null;
};

exports._meta = {
    "version": 1
};
